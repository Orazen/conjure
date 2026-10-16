/**
 * The Effect Wizard: an open-weights LLM (Gemma 4 E4B) running inside ComfyUI
 * writes effect recipes from a one-line idea, and names the subject of a photo.
 * Runs through the same Comfy SDK path as the video effects. No closed APIs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Output } from "@comfyorg/sdk";
import { config } from "./config.ts";
import { EffectSchema, describeError, type Effect } from "./effects.ts";
import { loadGraph, type Graph } from "./workflow.ts";
import { runWorkflow } from "./render.ts";

export const WIZARD_WORKFLOW = "conjure_wizard_gemma4.json";

const examples = ["midas-touch", "dust-to-dust"].map((id) =>
  JSON.parse(readFileSync(join(config.effectsDir, `${id}.json`), "utf8")) as Effect,
);

export const RECIPE_SYSTEM = `You design one-tap video effects for an app called Conjure. The user gives you a short idea, and sometimes a photo.
Reply with ONE JSON object and nothing else: no markdown, no code fences, no commentary.

How the app renders:
- "transform" effects end in a NEW STATE (a material, a creature, an art style). An image model paints the final frame from the photo using "endFrame", then a video model animates from the photo to that frame using "motion".
- "motion" effects keep the photo as the first frame and animate what happens next (particles, powers, camera moves). They have no "endFrame".
- The video model also generates sound from "sound".

Fields:
- id: lowercase-dashes, 2-40 chars. name: 2-4 words, catchy. tagline: one fun sentence (max 120 chars).
- icon: one emoji. colors: two hex colours that match the effect (light, dark).
- pipeline: "transform" or "motion". tags: 2-4 lowercase words.
- subject: what {subject} means by default, usually "the person".
- endFrame (transform only): an imperative image-edit instruction, 40-90 words. Describe the end state concretely (materials, colours, textures, lighting), then finish with: "Keep the exact same pose, framing, camera angle, background and lighting."
- motion: 50-110 words, present tense, chronological. Start with {subject}. Describe what happens step by step, then the camera move and lighting. One continuous shot, no cuts.
- sound: 8-25 words of sound design.
- duration: whole seconds, 4-6.
Always write {subject} (with braces) instead of a specific person. Keep it safe for work: no gore, nudity, weapons pointed at people, real people's names, brands, or copyrighted characters.

Example 1:
${JSON.stringify(examples[0])}

Example 2:
${JSON.stringify(examples[1])}`;

export const SUBJECT_SYSTEM = `Look at the photo and name its main subject in 2 to 8 words, the way you would refer to it in a sentence, starting with "the" (for example: "the woman in the yellow raincoat", "the golden retriever", "the vintage green car"). Reply with only that phrase.`;

/** Pull the first balanced {...} block out of an LLM reply. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("the model did not return JSON");
  let depth = 0;
  let inStr = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("the model's JSON was cut off");
}

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** Make an LLM draft schema-valid where that's unambiguous, then validate. */
export function repairRecipe(raw: unknown, idea: string): Effect {
  const r = { ...(raw as Record<string, unknown>) };
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 40) : idea.slice(0, 40);
  r.name = name.length >= 2 ? name : "My Effect";
  r.id = slug(typeof r.id === "string" && r.id ? r.id : String(r.name)) || "my-effect";
  if ((r.id as string).length < 2) r.id = "my-effect";
  if (typeof r.tagline !== "string" || r.tagline.length < 4) r.tagline = idea.slice(0, 120);
  r.tagline = String(r.tagline).slice(0, 140);
  if (typeof r.icon !== "string" || !r.icon) r.icon = "✨";
  r.icon = [...String(r.icon)].slice(0, 2).join("");
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (!Array.isArray(r.colors) || r.colors.length !== 2 || !r.colors.every((c) => typeof c === "string" && hex.test(c)))
    r.colors = ["#a78bfa", "#1e1b4b"];
  if (r.pipeline !== "transform" && r.pipeline !== "motion") r.pipeline = r.endFrame ? "transform" : "motion";
  if (r.pipeline === "transform" && (typeof r.endFrame !== "string" || r.endFrame.length < 10)) r.pipeline = "motion";
  if (r.pipeline === "motion") delete r.endFrame;
  if (!Array.isArray(r.tags)) r.tags = [];
  r.tags = (r.tags as unknown[]).filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 24).toLowerCase()).slice(0, 6);
  if (typeof r.motion === "string" && !r.motion.includes("{subject}")) r.motion = `{subject} ${r.motion}`;
  const d = Math.round(Number(r.duration));
  r.duration = Number.isFinite(d) ? Math.min(8, Math.max(3, d)) : 5;
  r.author = "Conjure wizard (Gemma 4)";
  r.version = 1;
  for (const k of ["strength", "loras", "negative"]) delete r[k];
  return EffectSchema.parse(r);
}

async function generate(system: string, prompt: string, photo: Buffer | undefined, maxLength: number, seed: number): Promise<string> {
  const g: Graph = loadGraph(config.workflowsDir, WIZARD_WORKFLOW);
  g.system.inputs.value = system;
  g.generate.inputs.prompt = prompt;
  g.generate.inputs.max_length = maxLength;
  g.generate.inputs["sampling_mode.seed"] = seed;
  if (!photo) {
    delete g.load_image;
    delete g.generate.inputs.image;
  }
  let text = "";
  await runWorkflow(g, photo, {
    onOutput: async (o: Output) => {
      if (o.nodeId === "save_text") text = new TextDecoder().decode(await o.toBytes());
    },
  });
  if (!text.trim()) throw new Error("the language model returned nothing");
  return text.trim();
}

export async function wizardRecipe(idea: string, photo?: Buffer): Promise<{ effect: Effect; raw: string }> {
  if (config.backend === "mock") return { effect: mockRecipe(idea), raw: "(mock mode: template recipe, no LLM)" };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await generate(RECIPE_SYSTEM, `Effect idea: ${idea}`, photo, 1400, 42 + attempt);
    try {
      return { effect: repairRecipe(extractJson(raw), idea), raw };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`The wizard's draft wasn't a valid recipe: ${describeError(lastErr)}`);
}

export async function wizardSubject(photo: Buffer): Promise<string> {
  if (config.backend === "mock") return "the person";
  const raw = await generate(SUBJECT_SYSTEM, "Name the main subject of this photo.", photo, 40, 7);
  const phrase = raw.split("\n")[0].replace(/["'.*]/g, "").trim().toLowerCase();
  return (phrase.startsWith("the ") ? phrase : `the ${phrase}`).slice(0, 60);
}

/** Mock mode has no LLM: build a reasonable transform recipe from the idea text. */
export function mockRecipe(idea: string): Effect {
  const clean = idea.trim().replace(/^(turn|make|transform)\s+(me|them|it|him|her)\s+(in)?to\s+/i, "");
  const what = clean || "something magical";
  return repairRecipe(
    {
      name: what.split(/\s+/).slice(0, 3).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" "),
      tagline: `Become ${what}.`,
      icon: "✨",
      pipeline: "transform",
      tags: ["wizard"],
      subject: "the person",
      endFrame: `Turn {subject} into ${what}, rendered with rich realistic materials, textures and lighting. Keep the exact same pose, framing, camera angle, background and lighting.`,
      motion: `{subject} holds still as the change begins at the edges and spreads smoothly across the whole body, the new materials catching the light, until {subject} has completely become ${what}. The camera makes a slow, steady push-in.`,
      sound: "a rising magical shimmer and a soft final chime",
      duration: 5,
    },
    idea,
  );
}
