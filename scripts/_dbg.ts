import { readFile, writeFile } from "node:fs/promises";
import { comfyClient } from "../server/render.ts";
const [graphPath, imgPath, out] = process.argv.slice(2);
const c = comfyClient();
const g = JSON.parse(await readFile(graphPath, "utf8"));
const wf = c.workflows.fromJson(g);
const imgNode = Object.entries(g).find(([, n]: any) => n.class_type === "LoadImage")?.[0];
if (imgNode) wf.setInput(imgNode, "image", c.assets.fromBytes(new Uint8Array(await readFile(imgPath)), { filename: "in.png", contentType: "image/png" }));
const t = Date.now();
const job = await c.submit(wf);
console.log("job", job.id);
try { await job.result(); } catch (e) { console.log("FAILED", (e as any).error ?? e); }
console.log("status", job.status, ((Date.now() - t) / 1000).toFixed(0) + "s");
for (const o of job.outputs) { console.log("out", o.nodeId, o.name, o.sizeBytes); if (/mp4$/.test(o.name)) await o.toFile(out); }
const logs = await job.getLogs().catch((e) => String(e));
const text = JSON.stringify(logs);
console.log("logs:", text.length, text.slice(0, 3000));
