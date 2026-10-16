/** `npm run sync-nodes` — copy effects/ into the ComfyUI-Conjure node pack. */
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../server/config.ts";

const dest = join(config.root, "comfy-nodes", "ComfyUI-Conjure", "effects");
await mkdir(dest, { recursive: true });
for (const f of await readdir(dest)) if (f.endsWith(".json")) await rm(join(dest, f));
const files = (await readdir(config.effectsDir)).filter((f) => f.endsWith(".json"));
for (const f of files) await cp(join(config.effectsDir, f), join(dest, f));
console.log(`copied ${files.length} recipes into comfy-nodes/ComfyUI-Conjure/effects`);
