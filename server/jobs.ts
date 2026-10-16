/**
 * Job store + runners.
 *
 * A job is one effect applied to one photo. The Comfy runner submits the built
 * workflow with the Comfy SDK (Comfy Cloud, a Comfy API deployment, or a
 * self-hosted ComfyUI behind comfy-api-proxy) and streams progress and outputs
 * back. The mock runner fakes it locally with ffmpeg so the app works with no
 * GPU and no account.
 */
import { EventEmitter } from "node:events";
import { mkdir, readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { InsufficientCredits, InvalidWorkflow, JobFailed, Unauthorized } from "@comfyorg/sdk";
import type { Output } from "@comfyorg/sdk";
import { config, dataPaths } from "./config.ts";
import type { Effect } from "./effects.ts";
import type { BuiltWorkflow, Aspect, Quality } from "./workflow.ts";
import { OUTPUT_NODES } from "./workflow.ts";
import { runWorkflow } from "./render.ts";
import { hasFfmpeg, mockVideo } from "./media.ts";
import { mockEndFrame } from "./image.ts";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface JobRecord {
  id: string;
  effect: { id: string; name: string; icon: string; colors: [string, string]; pipeline: Effect["pipeline"] };
  status: JobStatus;
  stage: string;
  progress: number;
  backend: string;
  createdAt: string;
  finishedAt?: string;
  aspect: Aspect;
  quality: Quality;
  width: number;
  height: number;
  duration: number;
  seed: number;
  subject: string;
  prompts: BuiltWorkflow["prompts"];
  input: string;
  outputs: { video?: string; endFrame?: string; reel?: string };
  error?: string;
  comfyJobId?: string;
  /** Snapshot of the recipe used, so a result can be remixed later. */
  recipe: Effect;
}

const fileUrl = (abs: string) => "/files/" + abs.slice(config.dataDir.length + 1).split("\\").join("/");

class JobStore {
  private jobs = new Map<string, JobRecord>();
  private bus = new EventEmitter();
  private loaded = false;

  constructor() {
    this.bus.setMaxListeners(200);
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(dataPaths.jobs)) return;
    for (const f of await readdir(dataPaths.jobs)) {
      if (!f.endsWith(".json")) continue;
      try {
        const job = JSON.parse(await readFile(join(dataPaths.jobs, f), "utf8")) as JobRecord;
        if (job.status === "queued" || job.status === "running") {
          job.status = "failed";
          job.error = "Server restarted before this job finished.";
        }
        this.jobs.set(job.id, job);
      } catch {
        /* ignore corrupt record */
      }
    }
  }

  list(): JobRecord[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string) {
    return this.jobs.get(id);
  }

  async put(job: JobRecord) {
    this.jobs.set(job.id, job);
    this.bus.emit(job.id, job);
    if (job.status === "succeeded" || job.status === "failed") await this.persist(job);
  }

  async persist(job: JobRecord) {
    await mkdir(dataPaths.jobs, { recursive: true });
    await writeFile(join(dataPaths.jobs, `${job.id}.json`), JSON.stringify(job, null, 2));
  }

  update(job: JobRecord, patch: Partial<JobRecord>) {
    Object.assign(job, patch);
    void this.put(job);
  }

  subscribe(id: string, fn: (job: JobRecord) => void): () => void {
    this.bus.on(id, fn);
    return () => this.bus.off(id, fn);
  }
}

export const store = new JobStore();

/** Map the node currently executing to a human stage label. */
export function stageFor(nodeId: string | null, pipeline: Effect["pipeline"]): string | undefined {
  if (!nodeId) return undefined;
  const id = nodeId.split(":").pop() ?? nodeId;
  if (id.startsWith("flux_") || id.startsWith("edit_") || id === "save_end_frame")
    return "Painting the final frame · FLUX 3";
  if (id === "sample_1" || id === "sample") return pipeline === "transform" ? "Morphing · LTX-2.5" : "Animating · LTX-2.5";
  if (id === "sample_2" || id === "upsample") return "Upscaling + refining · LTX-2.5";
  if (id.startsWith("decode") || id === "create_video" || id === "save_video") return "Encoding video + audio";
  if (id.startsWith("ltx_") || id === "prompt" || id === "negative") return "Loading LTX-2.5";
  return undefined;
}

export interface NewJob {
  effect: Effect;
  built: BuiltWorkflow;
  inputPng: Buffer;
  aspect: Aspect;
  quality: Quality;
  subject: string;
}

export async function createJob(req: NewJob): Promise<JobRecord> {
  const id = randomUUID().slice(0, 12);
  const dir = join(dataPaths.outputs, id);
  await mkdir(dir, { recursive: true });
  const inputPath = join(dir, "input.png");
  await writeFile(inputPath, req.inputPng);
  const e = req.effect;
  const job: JobRecord = {
    id,
    effect: { id: e.id, name: e.name, icon: e.icon, colors: e.colors, pipeline: e.pipeline },
    status: "queued",
    stage: "Queued",
    progress: 0,
    backend: config.backend,
    createdAt: new Date().toISOString(),
    aspect: req.aspect,
    quality: req.quality,
    width: req.built.width,
    height: req.built.height,
    duration: req.built.duration,
    seed: req.built.seed,
    subject: req.subject,
    prompts: req.built.prompts,
    input: fileUrl(inputPath),
    outputs: {},
    recipe: e,
  };
  await store.put(job);
  const runner = config.backend === "mock" ? runMock : runComfy;
  runner(job, req, dir).catch(async (err) => {
    store.update(job, {
      status: "failed",
      stage: "Failed",
      error: friendlyError(err),
      finishedAt: new Date().toISOString(),
    });
  });
  return job;
}

export function friendlyError(err: unknown): string {
  if (err instanceof InsufficientCredits) return "Your Comfy workspace is out of credits. Top up at platform.comfy.org.";
  if (err instanceof Unauthorized) return "Comfy rejected the API key. Check COMFY_API_KEY in your .env.";
  if (err instanceof InvalidWorkflow) {
    const detail = err.message ?? "";
    if (/value not in list|not found|missing/i.test(detail))
      return `The backend is missing a model this workflow needs (see README → Models). ${detail}`.slice(0, 700);
    return `The backend rejected the workflow: ${detail}`.slice(0, 700);
  }
  if (err instanceof JobFailed) {
    const e = err.error;
    const where = e?.class_type ? ` in ${e.class_type}${e.node_id ? ` (node "${e.node_id}")` : ""}` : "";
    const detail = (e?.message || err.message || "").trim();
    if (/header too small|no such file|not found|value not in list/i.test(detail))
      return `A model file failed to load${where}: ${detail}. See README → Models.`.slice(0, 700);
    return `The workflow failed on the backend${where}: ${detail}`.slice(0, 700);
  }
  return err instanceof Error ? err.message.slice(0, 600) : String(err);
}

async function save(output: Output, dir: string, base: string): Promise<string> {
  const ext = extname(output.name) || (output.type === "video" ? ".mp4" : ".png");
  const path = join(dir, base + ext);
  await output.toFile(path);
  return fileUrl(path);
}

async function runComfy(job: JobRecord, req: NewJob, dir: string) {
  store.update(job, { status: "running", stage: "Uploading photo", progress: 0.02 });
  await runWorkflow(req.built.graph, req.inputPng, {
    onSubmitted: (remoteId) => store.update(job, { comfyJobId: remoteId, stage: "Waiting for a GPU", progress: 0.04 }),
    onQueued: (pos) => store.update(job, { stage: pos ? `In queue · #${pos}` : "Waiting for a GPU" }),
    onProgress: (value, node) =>
      store.update(job, {
        progress: Math.max(job.progress, Math.min(0.98, 0.05 + value * 0.93)),
        stage: stageFor(node, req.effect.pipeline) ?? job.stage,
      }),
    onOutput: async (output) => {
      if (output.nodeId === OUTPUT_NODES.endFrame) {
        store.update(job, { outputs: { ...job.outputs, endFrame: await save(output, dir, "end_frame") } });
      } else if (output.nodeId === OUTPUT_NODES.video || output.type === "video") {
        store.update(job, { outputs: { ...job.outputs, video: await save(output, dir, "effect") } });
      }
    },
  });
  if (!job.outputs.video) throw new Error("The workflow finished but returned no video.");
  store.update(job, { status: "succeeded", stage: "Done", progress: 1, finishedAt: new Date().toISOString() });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runMock(job: JobRecord, req: NewJob, dir: string) {
  const input = join(dir, "input.png");
  const steps =
    req.effect.pipeline === "transform"
      ? ["Uploading photo", "Painting the final frame · FLUX 3", "Morphing · LTX-2.5", "Encoding video + audio"]
      : ["Uploading photo", "Loading LTX-2.5", "Animating · LTX-2.5", "Upscaling + refining · LTX-2.5", "Encoding video + audio"];
  store.update(job, { status: "running" });
  for (let i = 0; i < steps.length; i++) {
    store.update(job, { stage: steps[i] + " (mock)", progress: 0.05 + (0.85 * i) / steps.length });
    await sleep(700);
    if (steps[i].startsWith("Painting")) {
      const end = join(dir, "end_frame.png");
      await writeFile(end, await mockEndFrame(req.inputPng, req.effect.colors[0]));
      store.update(job, { outputs: { ...job.outputs, endFrame: fileUrl(end) } });
    }
  }
  const out = join(dir, "effect.mp4");
  if (hasFfmpeg()) {
    await mockVideo({
      input,
      endFrame: job.outputs.endFrame ? join(dir, "end_frame.png") : undefined,
      out,
      width: job.width,
      height: job.height,
      seconds: Math.min(job.duration, 4),
    });
    store.update(job, { outputs: { ...job.outputs, video: fileUrl(out) } });
  } else {
    await copyFile(input, join(dir, "effect.png"));
    store.update(job, { outputs: { ...job.outputs, video: fileUrl(join(dir, "effect.png")) } });
  }
  store.update(job, { status: "succeeded", stage: "Done (mock render)", progress: 1, finishedAt: new Date().toISOString() });
}

export { fileUrl };
