/**
 * Turn an effect recipe + render options into a ready-to-submit ComfyUI
 * API-format graph.
 *
 * The graphs live in `workflows/` as plain API-format JSON with readable node
 * ids ("prompt", "edit_prompt", "save_video", ...), so they also open in
 * ComfyUI as-is. This module only sets values on those named nodes, plus
 * (optionally) splices LoRA loaders after the model loaders.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Effect } from "./effects.ts";
import { renderTemplate } from "./effects.ts";

export type Graph = Record<string, { class_type: string; inputs: Record<string, unknown>; _meta?: { title?: string } }>;

export const ASPECTS = ["9:16", "4:5", "1:1", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];
export const QUALITIES = ["draft", "standard"] as const;
export type Quality = (typeof QUALITIES)[number];

/** Output sizes. Every side is a multiple of 64 so the half-res stage-1 latent stays a multiple of 32. */
export const SIZES: Record<Quality, Record<Aspect, [number, number]>> = {
  standard: { "9:16": [704, 1280], "4:5": [832, 1024], "1:1": [960, 960], "16:9": [1280, 704] },
  draft: { "9:16": [576, 1024], "4:5": [640, 768], "1:1": [768, 768], "16:9": [1024, 576] },
};

export const FPS = 24;

export const WORKFLOW_FILES = {
  motion: "conjure_motion_ltx25.json",
  transform: "conjure_transform_flux3_ltx25.json",
  portrait: "conjure_sample_portrait_flux3.json",
} as const;

export const OUTPUT_NODES = { video: "save_video", endFrame: "save_end_frame", image: "save_image" } as const;
export const INPUT_NODE = "load_image";

const BASE_NEGATIVE_EXTRA = "static image, frozen frame, no motion";

const MOTION_PREFIX = "Use the provided start image as the first frame.";
const TRANSFORM_PREFIX =
  "Use the provided start image as the first frame and the provided end image as the final frame anchor.";

const cache = new Map<string, Graph>();
export function loadGraph(workflowsDir: string, file: string): Graph {
  const path = join(workflowsDir, file);
  if (!cache.has(path)) cache.set(path, JSON.parse(readFileSync(path, "utf8")) as Graph);
  return structuredClone(cache.get(path)!);
}

export interface RenderOptions {
  aspect: Aspect;
  quality: Quality;
  /** Overrides the recipe's default subject ("my dog", "the woman in red"). */
  subject?: string;
  seed?: number;
  duration?: number;
}

export interface BuiltWorkflow {
  graph: Graph;
  width: number;
  height: number;
  frames: number;
  duration: number;
  seed: number;
  prompts: { motion: string; endFrame?: string; negative: string };
}

function setInput(g: Graph, node: string, field: string, value: unknown) {
  const n = g[node];
  if (!n) throw new Error(`workflow is missing node "${node}"`);
  n.inputs[field] = value;
}

export function frameCount(seconds: number, fps = FPS): number {
  // LTX wants 8n+1 frames; 24 fps * whole seconds + 1 always satisfies that.
  const raw = Math.round(seconds * fps);
  return Math.floor(raw / 8) * 8 + 1;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 48);
}

export function composeMotionPrompt(effect: Effect, subject: string): string {
  const prefix = effect.pipeline === "transform" ? TRANSFORM_PREFIX : MOTION_PREFIX;
  const parts = [prefix, renderTemplate(effect.motion, subject)];
  if (effect.sound) parts.push(`Audio: ${renderTemplate(effect.sound, subject)}.`.replace(/\.\.$/, "."));
  return parts.join(" ");
}

/** Insert LoraLoaderModelOnly nodes after `modelNode` and re-point every consumer. */
export function spliceLoras(g: Graph, modelNode: string, loras: { name: string; strength: number }[], tag: string) {
  if (!loras.length || !g[modelNode]) return;
  let prev = modelNode;
  loras.forEach((lora, i) => {
    const id = `${tag}_lora_${i + 1}`;
    g[id] = {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: [prev, 0], lora_name: lora.name, strength_model: lora.strength },
      _meta: { title: `LoRA: ${lora.name}` },
    };
    prev = id;
  });
  const loraIds = new Set(loras.map((_, i) => `${tag}_lora_${i + 1}`));
  for (const [id, node] of Object.entries(g)) {
    if (loraIds.has(id)) continue;
    for (const [field, value] of Object.entries(node.inputs)) {
      if (Array.isArray(value) && value[0] === modelNode && value[1] === 0) node.inputs[field] = [prev, 0];
    }
  }
}

export function buildWorkflow(workflowsDir: string, effect: Effect, opts: RenderOptions): BuiltWorkflow {
  const g = loadGraph(workflowsDir, WORKFLOW_FILES[effect.pipeline]);
  const [width, height] = SIZES[opts.quality][opts.aspect];
  const duration = Math.min(10, Math.max(2, Math.round(opts.duration ?? effect.duration)));
  const frames = frameCount(duration);
  const seed = opts.seed ?? randomSeed();
  const subject = opts.subject?.trim() || effect.subject;

  const motion = composeMotionPrompt(effect, subject);
  const negBase = String(g["negative"]?.inputs.text ?? "");
  const negative = [negBase, BASE_NEGATIVE_EXTRA, effect.negative].filter(Boolean).join(", ");
  setInput(g, "prompt", "text", motion);
  setInput(g, "negative", "text", negative);

  setInput(g, "resize_image", "resize_type.width", width);
  setInput(g, "resize_image", "resize_type.height", height);
  setInput(g, "empty_audio", "frames_number", frames);
  setInput(g, "empty_video", "length", frames);
  setInput(g, "noise_1", "noise_seed", seed);

  let endFrame: string | undefined;
  if (effect.pipeline === "motion") {
    setInput(g, "empty_video", "width", width / 2);
    setInput(g, "empty_video", "height", height / 2);
    if (effect.strength?.start !== undefined) setInput(g, "first_frame_1", "strength", effect.strength.start);
  } else {
    endFrame = renderTemplate(effect.endFrame ?? "", subject);
    setInput(g, "edit_prompt", "text", endFrame);
    setInput(g, "edit_seed", "seed", seed % 2 ** 32);
    setInput(g, "empty_video", "width", width);
    setInput(g, "empty_video", "height", height);
    setInput(g, "resize_end_frame", "resize_type.width", width);
    setInput(g, "resize_end_frame", "resize_type.height", height);
    if (effect.strength?.start !== undefined) setInput(g, "guide_start", "strength", effect.strength.start);
    if (effect.strength?.end !== undefined) setInput(g, "guide_end", "strength", effect.strength.end);
    setInput(g, OUTPUT_NODES.endFrame, "filename_prefix", `conjure/${effect.id}_end`);
  }
  setInput(g, OUTPUT_NODES.video, "filename_prefix", `conjure/${effect.id}`);

  const loras = effect.loras ?? [];
  spliceLoras(g, "ltx_model", loras.filter((l) => l.target === "video"), "ltx");
  spliceLoras(g, "flux_model", loras.filter((l) => l.target === "image"), "flux");

  return { graph: g, width, height, frames, duration, seed, prompts: { motion, endFrame, negative } };
}

export function buildPortraitWorkflow(workflowsDir: string, prompt: string, seed = randomSeed()): Graph {
  const g = loadGraph(workflowsDir, WORKFLOW_FILES.portrait);
  setInput(g, "prompt", "text", prompt);
  setInput(g, "sample", "seed", seed % 2 ** 32);
  return g;
}

/** Closest supported aspect for an image of the given size. */
export function nearestAspect(w: number, h: number): Aspect {
  const r = w / h;
  const ratios: Record<Aspect, number> = { "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 };
  let best: Aspect = "9:16";
  for (const a of ASPECTS) if (Math.abs(Math.log(ratios[a] / r)) < Math.abs(Math.log(ratios[best] / r))) best = a;
  return best;
}
