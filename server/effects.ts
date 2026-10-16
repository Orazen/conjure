/**
 * Effect recipes: the small JSON files in `effects/` that describe one effect.
 *
 * A recipe is everything that makes an effect *that* effect: the end state
 * (for transform effects, painted by FLUX 3), the motion and camera (animated
 * by LTX-2.5), the sound design (LTX-2.5 generates audio jointly), and a few
 * knobs. It never contains node ids or model names, so the same recipe keeps
 * working when the underlying workflow is upgraded.
 */
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const PIPELINES = ["motion", "transform"] as const;
export type Pipeline = (typeof PIPELINES)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");

export const EffectSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "lowercase letters, digits and dashes (2-40 chars)"),
  name: z.string().min(2).max(40),
  tagline: z.string().min(4).max(140),
  icon: z.string().min(1).max(8).default("✨"),
  colors: z.tuple([hex, hex]).default(["#a78bfa", "#1e1b4b"]),
  pipeline: z.enum(PIPELINES),
  tags: z.array(z.string().max(24)).max(8).default([]),
  /** What `{subject}` means when the user leaves it blank ("the person", "the dog"). */
  subject: z.string().min(1).max(60).default("the person"),
  /** Transform only: the image-edit instruction that paints the final frame. */
  endFrame: z.string().max(1200).optional(),
  /** What happens on screen, in order. `{subject}` is substituted. */
  motion: z.string().min(20).max(1600),
  /** Sound design. LTX-2.5 generates the soundtrack from this. */
  sound: z.string().max(400).optional(),
  /** Extra things to avoid, appended to the default negative prompt. */
  negative: z.string().max(400).optional(),
  duration: z.number().int().min(2).max(10).default(5),
  /** How strongly the photo pins the first frame (motion) / the first and last frame (transform). */
  strength: z
    .object({
      start: z.number().min(0).max(1).optional(),
      end: z.number().min(0).max(1).optional(),
    })
    .optional(),
  /** Optional LoRAs, by filename as installed on the backend. */
  loras: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        strength: z.number().min(-4).max(4).default(1),
        target: z.enum(["video", "image"]).default("video"),
      }),
    )
    .max(4)
    .optional(),
  author: z.string().max(60).default("anonymous"),
  version: z.literal(1).default(1),
}).superRefine((e, ctx) => {
  if (e.pipeline === "transform" && !e.endFrame) {
    ctx.addIssue({ code: "custom", path: ["endFrame"], message: "transform effects need an endFrame instruction" });
  }
});

export type Effect = z.output<typeof EffectSchema>;
export type EffectInput = z.input<typeof EffectSchema>;
export type EffectSource = "builtin" | "custom";
export interface LoadedEffect extends Effect {
  source: EffectSource;
}

export function parseEffect(raw: unknown): Effect {
  return EffectSchema.parse(raw);
}

/** Human-readable zod error, one line per problem. */
export function describeError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => `${i.path.join(".") || "effect"}: ${i.message}`).join("\n");
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Substitute `{subject}` and tidy capitalisation, so "{subject} stands still"
 * with subject "the person" reads "The person stands still".
 */
export function renderTemplate(text: string, subject: string): string {
  const filled = text.replaceAll("{subject}", subject.trim());
  return filled.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

export class EffectLibrary {
  constructor(
    private readonly builtinDir: string,
    private readonly customDir: string,
  ) {}

  private async readDir(dir: string, source: EffectSource): Promise<LoadedEffect[]> {
    if (!existsSync(dir)) return [];
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    const out: LoadedEffect[] = [];
    for (const f of files.sort()) {
      try {
        const effect = parseEffect(JSON.parse(await readFile(join(dir, f), "utf8")));
        out.push({ ...effect, source });
      } catch (err) {
        console.warn(`[effects] skipping ${f}: ${describeError(err)}`);
      }
    }
    return out;
  }

  /** `effects/_order.json` lists built-in ids in display order; anything unlisted goes last. */
  private async order(): Promise<string[]> {
    try {
      return JSON.parse(await readFile(join(this.builtinDir, "_order.json"), "utf8")) as string[];
    } catch {
      return [];
    }
  }

  async list(): Promise<LoadedEffect[]> {
    const order = await this.order();
    const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
    const builtin = (await this.readDir(this.builtinDir, "builtin")).sort((a, b) => rank(a.id) - rank(b.id));
    const ids = new Set(builtin.map((e) => e.id));
    const custom = (await this.readDir(this.customDir, "custom")).filter((e) => !ids.has(e.id));
    return [...builtin, ...custom];
  }

  async get(id: string): Promise<LoadedEffect | undefined> {
    return (await this.list()).find((e) => e.id === id);
  }

  async saveCustom(raw: unknown): Promise<LoadedEffect> {
    const effect = parseEffect(raw);
    const existing = await this.get(effect.id);
    if (existing?.source === "builtin") {
      throw new Error(`"${effect.id}" is a built-in effect; pick another id`);
    }
    await mkdir(this.customDir, { recursive: true });
    await writeFile(join(this.customDir, `${effect.id}.json`), JSON.stringify(effect, null, 2) + "\n");
    return { ...effect, source: "custom" };
  }

  async deleteCustom(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing || existing.source !== "custom") return false;
    await rm(join(this.customDir, `${id}.json`));
    return true;
  }
}
