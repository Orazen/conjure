/**
 * `npm run build:showcase` — static build of the app for GitHub Pages (the
 * "live link"): every effect with its example render, the before/after
 * slider, the Effect Builder and share links. No backend, no API key.
 * Output: showcase-dist/
 */
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { EffectLibrary } from "../server/effects.ts";
import { frameCount } from "../server/workflow.ts";

const out = join(config.root, "showcase-dist");
const repo = process.env.CONJURE_GITHUB_REPO || process.env.GITHUB_REPOSITORY || null;

await rm(out, { recursive: true, force: true });
await build({
  root: join(config.root, "web"),
  base: "./",
  plugins: [react()],
  logLevel: "warn",
  define: { "import.meta.env.VITE_SHOWCASE": JSON.stringify("1") },
  build: { outDir: out, emptyOutDir: true },
});

const effects = await new EffectLibrary(config.effectsDir, "/nonexistent").list();
const gallery: unknown[] = [];
const showcaseEffects: unknown[] = [];
await mkdir(join(out, "examples"), { recursive: true });

for (const e of effects) {
  const src = join(config.examplesDir, e.id);
  let example: { video: string; preview?: string; input?: string; endFrame?: string } | undefined;
  if (existsSync(join(src, "effect.mp4"))) {
    const dst = join(out, "examples", e.id);
    await mkdir(dst, { recursive: true });
    const files = (await readdir(src)).filter((f) => /^(effect\.mp4|preview\.mp4|input\.png|end_frame\.png|meta\.json)$/.test(f));
    for (const f of files) await cp(join(src, f), join(dst, f));
    example = {
      video: `examples/${e.id}/effect.mp4`,
      preview: files.includes("preview.mp4") ? `examples/${e.id}/preview.mp4` : undefined,
      input: files.includes("input.png") ? `examples/${e.id}/input.png` : undefined,
      endFrame: files.includes("end_frame.png") ? `examples/${e.id}/end_frame.png` : undefined,
    };
    const meta = files.includes("meta.json") ? JSON.parse(await readFile(join(src, "meta.json"), "utf8")) : {};
    gallery.push({
      id: `example-${e.id}`,
      effect: { id: e.id, name: e.name, icon: e.icon, colors: e.colors, pipeline: e.pipeline },
      status: "succeeded",
      stage: "Done",
      progress: 1,
      backend: "example",
      createdAt: meta.renderedAt ?? new Date().toISOString(),
      aspect: "9:16",
      quality: meta.quality ?? "standard",
      width: meta.size?.[0] ?? 704,
      height: meta.size?.[1] ?? 1280,
      duration: e.duration,
      seed: meta.seed ?? 42,
      subject: e.subject,
      prompts: meta.prompts ?? { motion: e.motion, endFrame: e.endFrame, negative: "" },
      input: example.input ?? example.video,
      outputs: { video: example.video, endFrame: example.endFrame },
      recipe: e,
      frames: meta.frames ?? frameCount(e.duration),
    });
  }
  const { source: _s, ...rest } = e;
  showcaseEffects.push({ ...rest, source: "builtin", example });
}

const samples: string[] = [];
if (existsSync(config.samplesDir)) {
  await mkdir(join(out, "samples"), { recursive: true });
  for (const f of (await readdir(config.samplesDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
    await cp(join(config.samplesDir, f), join(out, "samples", f));
    samples.push(`samples/${f}`);
  }
}

await mkdir(join(out, "data"), { recursive: true });
await writeFile(join(out, "data", "showcase.json"), JSON.stringify({ repo, effects: showcaseEffects, samples, gallery }));
await writeFile(join(out, ".nojekyll"), "");
console.log(`showcase-dist/ ready: ${effects.length} effects, ${gallery.length} example renders${repo ? `, repo ${repo}` : ""}`);
