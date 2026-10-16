/**
 * Conjure server: keeps the Comfy API key on the server, builds workflows from
 * effect recipes, runs them through the Comfy SDK and serves the web app.
 */
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { streamSSE } from "hono/streaming";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config, dataPaths } from "./config.ts";
import { EffectLibrary, describeError, parseEffect, type Effect } from "./effects.ts";
import { ASPECTS, QUALITIES, SIZES, buildWorkflow, type Aspect, type Quality } from "./workflow.ts";
import { ACCEPTED_TYPES, prepareInput } from "./image.ts";
import { createJob, store } from "./jobs.ts";
import { hasFfmpeg, makeReel } from "./media.ts";

export const library = new EffectLibrary(config.effectsDir, dataPaths.customEffects);

/** Example renders shipped in `examples/<effect-id>/` (input.png, end_frame.png, effect.mp4). */
function exampleFor(id: string) {
  const dir = join(config.examplesDir, id);
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir);
  const pick = (re: RegExp) => {
    const f = files.find((x) => re.test(x));
    return f ? `/examples/${id}/${f}` : undefined;
  };
  const video = pick(/^effect\.(mp4|webm)$/);
  if (!video) return undefined;
  return { video, input: pick(/^input\.(png|jpe?g|webp)$/), endFrame: pick(/^end_frame\.(png|jpe?g|webp)$/) };
}

const backendLabel: Record<typeof config.backend, string> = {
  cloud: "Comfy Cloud",
  deployment: "Comfy API deployment",
  local: "Local ComfyUI",
  mock: "Mock mode (no GPU)",
};

export const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: describeError(err) }, 500);
});

app.get("/api/status", (c) =>
  c.json({
    backend: config.backend,
    label: backendLabel[config.backend],
    baseUrl: config.backend === "mock" ? null : config.baseUrl,
    ffmpeg: hasFfmpeg(),
    githubRepo: config.githubRepo || null,
    aspects: ASPECTS,
    qualities: QUALITIES,
    sizes: SIZES,
  }),
);

app.get("/api/effects", async (c) => {
  const effects = await library.list();
  return c.json(effects.map((e) => ({ ...e, example: exampleFor(e.id) })));
});

app.get("/api/effects/:id", async (c) => {
  const e = await library.get(c.req.param("id"));
  return e ? c.json({ ...e, example: exampleFor(e.id) }) : c.json({ error: "not found" }, 404);
});

app.post("/api/effects/validate", async (c) => {
  try {
    return c.json({ ok: true, effect: parseEffect(await c.req.json()) });
  } catch (err) {
    return c.json({ ok: false, error: describeError(err) }, 400);
  }
});

app.post("/api/effects", async (c) => {
  try {
    return c.json(await library.saveCustom(await c.req.json()), 201);
  } catch (err) {
    return c.json({ error: describeError(err) }, 400);
  }
});

app.delete("/api/effects/:id", async (c) =>
  (await library.deleteCustom(c.req.param("id"))) ? c.json({ ok: true }) : c.json({ error: "not a custom effect" }, 404),
);

app.post("/api/jobs", async (c) => {
  const form = await c.req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return c.json({ error: "attach a photo as `image`" }, 400);
  if (file.size > config.maxUploadBytes) return c.json({ error: "photo is larger than 20 MB" }, 413);
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) return c.json({ error: `unsupported image type ${file.type}` }, 415);

  let effect: Effect | undefined;
  const effectJson = form.get("effect");
  try {
    if (typeof effectJson === "string" && effectJson.trim()) effect = parseEffect(JSON.parse(effectJson));
    else effect = await library.get(String(form.get("effectId") ?? ""));
  } catch (err) {
    return c.json({ error: describeError(err) }, 400);
  }
  if (!effect) return c.json({ error: "unknown effect" }, 404);

  const aspectRaw = String(form.get("aspect") ?? "auto");
  const aspectIn = (ASPECTS as readonly string[]).includes(aspectRaw) ? (aspectRaw as Aspect) : "auto";
  const qualityRaw = String(form.get("quality") ?? "standard");
  const quality: Quality = (QUALITIES as readonly string[]).includes(qualityRaw) ? (qualityRaw as Quality) : "standard";
  const subject = String(form.get("subject") ?? "").slice(0, 60);
  const seedRaw = Number(form.get("seed"));
  const durationRaw = Number(form.get("duration"));

  let prepared;
  try {
    prepared = await prepareInput(new Uint8Array(await file.arrayBuffer()), aspectIn, (a) => SIZES[quality][a]);
  } catch (err) {
    return c.json({ error: `could not read that photo: ${describeError(err)}` }, 400);
  }
  const built = buildWorkflow(config.workflowsDir, effect, {
    aspect: prepared.aspect,
    quality,
    subject,
    seed: Number.isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : undefined,
    duration: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined,
  });
  const job = await createJob({
    effect,
    built,
    inputPng: prepared.png,
    aspect: prepared.aspect,
    quality,
    subject: subject || effect.subject,
  });
  return c.json(job, 202);
});

app.get("/api/jobs", (c) => c.json(store.list().slice(0, 200)));

app.get("/api/jobs/:id", (c) => {
  const job = store.get(c.req.param("id"));
  return job ? c.json(job) : c.json({ error: "not found" }, 404);
});

app.get("/api/jobs/:id/events", (c) => {
  const job = store.get(c.req.param("id"));
  if (!job) return c.json({ error: "not found" }, 404);
  return streamSSE(c, async (stream) => {
    let closed = false;
    const queue: string[] = [];
    let wake: (() => void) | undefined;
    const push = (j: typeof job) => {
      queue.push(JSON.stringify(j));
      wake?.();
    };
    const unsubscribe = store.subscribe(job.id, push);
    stream.onAbort(() => {
      closed = true;
      unsubscribe();
      wake?.();
    });
    push(job);
    while (!closed) {
      if (!queue.length) await new Promise<void>((r) => ((wake = r), setTimeout(r, 15_000)));
      wake = undefined;
      if (!queue.length) {
        await stream.writeSSE({ event: "ping", data: "" });
        continue;
      }
      const data = queue.splice(0).pop()!; // only the latest snapshot matters
      await stream.writeSSE({ event: "job", data });
      const parsed = JSON.parse(data) as { status: string };
      if (parsed.status === "succeeded" || parsed.status === "failed") break;
    }
    unsubscribe();
  });
});

app.post("/api/jobs/:id/reel", async (c) => {
  const job = store.get(c.req.param("id"));
  if (!job || job.status !== "succeeded" || !job.outputs.video) return c.json({ error: "job not finished" }, 400);
  if (job.outputs.reel) return c.json({ reel: job.outputs.reel });
  if (!hasFfmpeg()) return c.json({ error: "ffmpeg is not installed on the server" }, 501);
  const dir = join(dataPaths.outputs, job.id);
  const videoName = job.outputs.video.split("/").pop()!;
  const out = join(dir, "reel.mp4");
  await makeReel({ photo: join(dir, "input.png"), video: join(dir, videoName), out, width: job.width, height: job.height });
  store.update(job, { outputs: { ...job.outputs, reel: `/files/outputs/${job.id}/reel.mp4` } });
  await store.persist(job);
  return c.json({ reel: job.outputs.reel });
});

const strip = (prefix: string) => (p: string) => p.slice(prefix.length);
app.use("/files/*", serveStatic({ root: config.dataDir, rewriteRequestPath: strip("/files") }));
app.use("/examples/*", serveStatic({ root: config.examplesDir, rewriteRequestPath: strip("/examples") }));
app.use("/samples/*", serveStatic({ root: config.samplesDir, rewriteRequestPath: strip("/samples") }));
app.get("/api/samples", (c) =>
  c.json(
    existsSync(config.samplesDir)
      ? readdirSync(config.samplesDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort().map((f) => `/samples/${f}`)
      : [],
  ),
);
if (existsSync(config.webDist)) {
  app.use("/*", serveStatic({ root: config.webDist }));
  app.get("*", serveStatic({ root: config.webDist, path: "index.html" }));
}
