/**
 * `npm run examples` — render every effect on a sample photo and save the
 * results to examples/<effect-id>/ (input.png, end_frame.png, effect.mp4,
 * meta.json). These power the effect cards' preview videos and the README.
 *
 * Flags:
 *   --only=midas-touch,inflate   render just these
 *   --quality=draft              cheaper, faster test pass (default: standard)
 *   --force                      re-render effects that already have an example
 *   --seed=42                    fixed seed (default: 42)
 */
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { EffectLibrary } from "../server/effects.ts";
import { buildWorkflow, type Quality } from "../server/workflow.ts";
import { prepareInput } from "../server/image.ts";
import { SIZES } from "../server/workflow.ts";
import { runWorkflow } from "../server/render.ts";
import { friendlyError } from "../server/jobs.ts";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const only = arg("only")?.split(",");
const quality = (arg("quality") ?? "standard") as Quality;
const seed = Number(arg("seed") ?? 42);
const force = process.argv.includes("--force");

/** Which sample photo each effect is shown on (falls back to the first sample). */
const CAST: Record<string, string> = {
  inflate: "03-golden-retriever",
  "confetti-pop": "03-golden-retriever",
  "zero-gravity": "03-golden-retriever",
  "earth-zoom-out": "05-rooftop",
  "thunder-call": "05-rooftop",
  ignite: "05-rooftop",
  "boxed-figure": "02-denim",
  "chrome-reveal": "02-denim",
  "full-moon": "02-denim",
  "bullet-time": "02-denim",
  "turn-to-stone": "04-silver-hair",
  "angel-wings": "04-silver-hair",
  origami: "04-silver-hair",
  "eight-bit": "06-vintage-car",
  meltdown: "06-vintage-car",
};
const SUBJECT: Record<string, string> = {
  "03-golden-retriever": "the golden retriever",
  "06-vintage-car": "the vintage car",
};

if (config.backend === "mock") {
  console.error("No backend configured. Put COMFY_API_KEY (or COMFY_BASE_URL) in .env, then run `npm run doctor`.");
  process.exit(1);
}
const samples = existsSync(config.samplesDir) ? readdirSync(config.samplesDir).filter((f) => f.endsWith(".png")).sort() : [];
if (!samples.length) {
  console.error("No sample photos yet. Run `npm run samples` first (or drop your own PNGs into samples/).");
  process.exit(1);
}

const effects = (await new EffectLibrary(config.effectsDir, "/nonexistent").list()).filter((e) => !only || only.includes(e.id));
let totalSeconds = 0;
for (const effect of effects) {
  const dir = join(config.examplesDir, effect.id);
  if (!force && existsSync(join(dir, "effect.mp4"))) {
    console.log(`· ${effect.id}: already rendered (use --force to redo)`);
    continue;
  }
  const sampleName = CAST[effect.id] && samples.includes(`${CAST[effect.id]}.png`) ? `${CAST[effect.id]}.png` : samples[0];
  const subject = SUBJECT[sampleName.replace(/\.png$/, "")];
  const t0 = Date.now();
  try {
    await mkdir(dir, { recursive: true });
    const prepared = await prepareInput(await readFile(join(config.samplesDir, sampleName)), "9:16", (a) => SIZES[quality][a]);
    await writeFile(join(dir, "input.png"), prepared.png);
    const built = buildWorkflow(config.workflowsDir, effect, { aspect: prepared.aspect, quality, seed, subject });
    process.stdout.write(`▶ ${effect.id} on ${sampleName} … `);
    await runWorkflow(built.graph, prepared.png, {
      onOutput: async (o) => {
        if (o.nodeId === "save_end_frame") await o.toFile(join(dir, "end_frame.png"));
        else if (o.nodeId === "save_video") await o.toFile(join(dir, "effect.mp4"));
      },
    });
    const secs = (Date.now() - t0) / 1000;
    totalSeconds += secs;
    await writeFile(
      join(dir, "meta.json"),
      JSON.stringify({ effect: effect.id, sample: sampleName, quality, seed, size: [built.width, built.height], frames: built.frames, renderSeconds: Math.round(secs), prompts: built.prompts, renderedAt: new Date().toISOString() }, null, 2) + "\n",
    );
    console.log(`done in ${secs.toFixed(0)}s`);
  } catch (err) {
    console.log("failed");
    console.error(`  ✘ ${friendlyError(err)}`);
  }
}
console.log(`\nWall time: ${(totalSeconds / 60).toFixed(1)} min. Restart the app to see the new previews.`);
