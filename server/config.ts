import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Backend = "cloud" | "deployment" | "local" | "mock";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function detectBackend(): Backend {
  if (process.argv.includes("--mock") || process.env.CONJURE_MOCK === "1" || process.env.CONJURE_MOCK === "true") return "mock";
  const base = process.env.COMFY_BASE_URL?.trim();
  if (base) {
    const host = new URL(base).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0" ? "local" : "deployment";
  }
  if (process.env.COMFY_API_KEY?.trim()) return "cloud";
  return "mock";
}

export const config = {
  root,
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "127.0.0.1",
  backend: detectBackend(),
  baseUrl: process.env.COMFY_BASE_URL?.trim() || "https://cloud.comfy.org",
  effectsDir: join(root, "effects"),
  workflowsDir: join(root, "workflows"),
  examplesDir: join(root, "examples"),
  samplesDir: join(root, "samples"),
  webDist: join(root, "web", "dist"),
  dataDir: resolve(process.env.CONJURE_DATA_DIR ?? join(root, "data")),
  githubRepo: process.env.CONJURE_GITHUB_REPO ?? "",
  maxUploadBytes: 20 * 1024 * 1024,
};

export const dataPaths = {
  uploads: join(config.dataDir, "uploads"),
  outputs: join(config.dataDir, "outputs"),
  jobs: join(config.dataDir, "jobs"),
  customEffects: join(config.dataDir, "effects"),
};

for (const dir of Object.values(dataPaths)) mkdirSync(dir, { recursive: true });
