/**
 * `npm run samples` — generate the sample photos in samples/ with FLUX 3 Image
 * Klein (text-to-image). They are synthetic people and pets, so the demo never
 * uses a real person's likeness. Costs a few seconds of GPU per image.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { buildPortraitWorkflow } from "../server/workflow.ts";
import { runWorkflow } from "../server/render.ts";
import { friendlyError } from "../server/jobs.ts";

const SAMPLES: [string, string][] = [
  ["01-raincoat", "Candid smartphone photo of a young woman with curly dark hair wearing a bright yellow raincoat, standing on a quiet city sidewalk after rain, waist-up, looking at the camera with a slight smile, soft overcast daylight, shallow depth of field, photorealistic."],
  ["02-denim", "Photo of a man in his thirties with a short beard wearing a denim jacket over a white t-shirt, standing in a sunny park, waist-up, relaxed expression, looking at the camera, natural light, photorealistic."],
  ["03-golden-retriever", "Photo of a happy golden retriever sitting on a wooden porch, facing the camera, tongue out, warm late-afternoon light, photorealistic, sharp focus."],
  ["04-silver-hair", "Photo of a woman in her sixties with short silver hair wearing a green knit sweater, standing in a bright cozy kitchen, waist-up, warm smile, looking at the camera, photorealistic."],
  ["05-rooftop", "Photo of a young man in a red hoodie standing on a city rooftop at golden hour, waist-up, confident expression, looking at the camera, skyline softly blurred behind, photorealistic."],
  ["06-vintage-car", "Photo of a mint green vintage convertible car parked on an empty desert road, three-quarter front view, clear blue sky, photorealistic."],
];

if (config.backend === "mock") {
  console.error("No backend configured. Put COMFY_API_KEY (or COMFY_BASE_URL) in .env, then run `npm run doctor`.");
  process.exit(1);
}

await mkdir(config.samplesDir, { recursive: true });
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
for (const [name, prompt] of SAMPLES) {
  if (only && !only.includes(name)) continue;
  const t0 = Date.now();
  try {
    const graph = buildPortraitWorkflow(config.workflowsDir, prompt, 1000 + SAMPLES.findIndex((s) => s[0] === name));
    let saved = "";
    await runWorkflow(graph, undefined, {
      onOutput: async (o) => {
        if (o.nodeId !== "save_image") return;
        saved = join(config.samplesDir, `${name}.png`);
        await writeFile(saved, await o.toBytes());
      },
    });
    console.log(`✔ ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s) → ${saved}`);
  } catch (err) {
    console.error(`✘ ${name}: ${friendlyError(err)}`);
  }
}
