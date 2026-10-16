import { serve } from "@hono/node-server";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { app } from "./index.ts";
import { config, dataPaths } from "./config.ts";
import { store } from "./jobs.ts";

const backendLabel = { cloud: "Comfy Cloud", deployment: "Comfy API deployment", local: "Local ComfyUI", mock: "Mock mode (no GPU)" } as const;

async function main() {
  for (const dir of Object.values(dataPaths)) await mkdir(dir, { recursive: true });
  await store.load();
  serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    const url = `http://${info.address === "::1" ? "localhost" : info.address}:${info.port}`;
    console.log(`\n  Conjure is running → ${url}`);
    console.log(`  Backend: ${backendLabel[config.backend]}${config.backend === "mock" ? " — set COMFY_API_KEY in .env for real renders" : ` (${config.baseUrl})`}`);
    if (!existsSync(config.webDist)) console.log("  (API only — run `npm run dev` for the UI on http://localhost:5173)");
    console.log("");
  });
}

void main();
