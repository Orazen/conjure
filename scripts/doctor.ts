/**
 * `npm run doctor` — check that your backend works before spending GPU time on
 * a full effect. Uploads a tiny image, runs a 3-node workflow (load → invert →
 * save) through the Comfy SDK and downloads the result.
 */
import { Comfy } from "@comfyorg/sdk";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { friendlyError } from "../server/jobs.ts";

if (config.backend === "mock") {
  console.log("Mock mode: no backend configured. Put COMFY_API_KEY (or COMFY_BASE_URL) in .env first.");
  process.exit(1);
}

console.log(`Backend: ${config.backend} (${config.baseUrl})`);
const client = new Comfy({ clientInfo: "conjure-doctor/0.1" });
const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#7c3aed" } }).png().toBuffer();
const wf = client.workflows.fromJson({
  load_image: { class_type: "LoadImage", inputs: { image: "" } },
  invert: { class_type: "ImageInvert", inputs: { image: ["load_image", 0] } },
  save_image: { class_type: "SaveImage", inputs: { images: ["invert", 0], filename_prefix: "conjure/doctor" } },
});
wf.setInput("load_image", "image", client.assets.fromBytes(new Uint8Array(png), { filename: "doctor.png", contentType: "image/png" }));

const t0 = Date.now();
try {
  const job = await client.run(wf);
  const out = job.getOutputs("save_image")[0];
  if (!out) throw new Error("job succeeded but returned no image");
  const dir = join(config.dataDir, "doctor");
  await mkdir(dir, { recursive: true });
  const path = await out.toFile(join(dir, out.name));
  console.log(`✔ Upload, run and download all work (${((Date.now() - t0) / 1000).toFixed(1)}s). Output: ${path}`);
  console.log("  Next: npm run dev, open the app, and conjure your first effect.");
} catch (err) {
  console.error(`✘ ${friendlyError(err)}`);
  process.exit(1);
}
