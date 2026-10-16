/**
 * `npm run export-workflows` — write one ready-to-run ComfyUI workflow per
 * effect to workflows/effects/<id>.json (API format, 9:16, 5 s, seed 42).
 * Drag one into ComfyUI, pick your photo in "Conjure: input photo", queue.
 */
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { EffectLibrary } from "../server/effects.ts";
import { buildWorkflow } from "../server/workflow.ts";

const out = join(config.workflowsDir, "effects");
await mkdir(out, { recursive: true });
for (const f of await readdir(out)) if (f.endsWith(".json")) await rm(join(out, f));

const effects = await new EffectLibrary(config.effectsDir, "/nonexistent").list();
for (const effect of effects) {
  const { graph } = buildWorkflow(config.workflowsDir, effect, { aspect: "9:16", quality: "standard", seed: 42 });
  await writeFile(join(out, `${effect.id}.json`), JSON.stringify(graph, null, 2) + "\n");
}
console.log(`wrote ${effects.length} workflows to workflows/effects/`);
