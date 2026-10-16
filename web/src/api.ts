export type Pipeline = "motion" | "transform";

export interface Effect {
  id: string;
  name: string;
  tagline: string;
  icon?: string;
  colors: [string, string];
  pipeline: Pipeline;
  tags: string[];
  subject: string;
  endFrame?: string;
  motion: string;
  sound?: string;
  negative?: string;
  duration: number;
  strength?: { start?: number; end?: number };
  loras?: { name: string; strength: number; target: "video" | "image" }[];
  author: string;
  version: 1;
  source?: "builtin" | "custom";
  example?: { video: string; preview?: string; input?: string; endFrame?: string };
}

export interface Status {
  backend: "cloud" | "deployment" | "local" | "mock" | "showcase";
  label: string;
  baseUrl: string | null;
  ffmpeg: boolean;
  githubRepo: string | null;
  aspects: string[];
  qualities: string[];
}

export interface Job {
  id: string;
  effect: Pick<Effect, "id" | "name" | "icon" | "colors" | "pipeline">;
  status: "queued" | "running" | "succeeded" | "failed";
  stage: string;
  progress: number;
  backend: string;
  createdAt: string;
  finishedAt?: string;
  aspect: string;
  quality: string;
  width: number;
  height: number;
  duration: number;
  seed: number;
  subject: string;
  prompts: { motion: string; endFrame?: string; negative: string };
  input: string;
  outputs: { video?: string; endFrame?: string; reel?: string };
  error?: string;
  recipe: Effect;
}

/** Static build for GitHub Pages: real example renders + the builder, no backend. */
export const SHOWCASE = import.meta.env.VITE_SHOWCASE === "1";
export const SHOWCASE_MSG =
  "This is the live showcase, so it can't render here. Clone the repo and run Conjure with your own Comfy key or GPU (3 commands).";

interface ShowcaseData {
  repo: string | null;
  effects: Effect[];
  samples: string[];
  gallery: Job[];
}
let showcase: Promise<ShowcaseData> | undefined;
const sc = () => (showcase ??= fetch("data/showcase.json").then((r) => r.json() as Promise<ShowcaseData>));
const notHere = <T,>(): Promise<T> => Promise.reject(new Error(SHOWCASE_MSG));

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

const live = {
  status: () => fetch("/api/status").then((r) => json<Status>(r)),
  effects: () => fetch("/api/effects").then((r) => json<Effect[]>(r)),
  samples: () => fetch("/api/samples").then((r) => json<string[]>(r)),
  jobs: () => fetch("/api/jobs").then((r) => json<Job[]>(r)),
  job: (id: string) => fetch(`/api/jobs/${id}`).then((r) => json<Job>(r)),
  validate: (effect: unknown) =>
    fetch("/api/effects/validate", { method: "POST", body: JSON.stringify(effect), headers: { "content-type": "application/json" } }).then(
      (r) => r.json() as Promise<{ ok: boolean; error?: string; effect?: Effect }>,
    ),
  saveEffect: (effect: unknown) =>
    fetch("/api/effects", { method: "POST", body: JSON.stringify(effect), headers: { "content-type": "application/json" } }).then((r) =>
      json<Effect>(r),
    ),
  deleteEffect: (id: string) => fetch(`/api/effects/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  wizardRecipe: (idea: string, photo?: Blob) => {
    const fd = new FormData();
    fd.set("idea", idea);
    if (photo) fd.set("image", photo, "photo" + extFor(photo.type));
    return fetch("/api/wizard/recipe", { method: "POST", body: fd }).then((r) => json<{ effect: Effect; raw: string }>(r));
  },
  wizardSubject: (photo: Blob) => {
    const fd = new FormData();
    fd.set("image", photo, "photo" + extFor(photo.type));
    return fetch("/api/wizard/subject", { method: "POST", body: fd }).then((r) => json<{ subject: string }>(r));
  },
  reel: (id: string) => fetch(`/api/jobs/${id}/reel`, { method: "POST" }).then((r) => json<{ reel: string }>(r)),
  createJob: (opts: {
    photo: Blob;
    effect: Effect;
    unsaved?: boolean;
    aspect: string;
    quality: string;
    subject?: string;
    seed?: number;
    duration?: number;
  }) => {
    const fd = new FormData();
    fd.set("image", opts.photo, "photo" + extFor(opts.photo.type));
    if (opts.unsaved) fd.set("effect", JSON.stringify(stripMeta(opts.effect)));
    else fd.set("effectId", opts.effect.id);
    fd.set("aspect", opts.aspect);
    fd.set("quality", opts.quality);
    if (opts.subject) fd.set("subject", opts.subject);
    if (opts.seed) fd.set("seed", String(opts.seed));
    if (opts.duration) fd.set("duration", String(opts.duration));
    return fetch("/api/jobs", { method: "POST", body: fd }).then((r) => json<Job>(r));
  },
};

const showcaseApi: typeof live = {
  status: () =>
    sc().then((d) => ({
      backend: "showcase" as const,
      label: "Live showcase",
      baseUrl: null,
      ffmpeg: false,
      githubRepo: d.repo,
      aspects: ["9:16", "4:5", "1:1", "16:9"],
      qualities: ["draft", "standard"],
    })),
  effects: () => sc().then((d) => d.effects),
  samples: () => sc().then((d) => d.samples),
  jobs: () => sc().then((d) => d.gallery),
  job: (id: string) => sc().then((d) => d.gallery.find((j) => j.id === id) ?? Promise.reject(new Error("not found"))),
  validate: async (effect: unknown) => {
    const { EffectSchema, describeError } = await import("../../shared/recipe.ts");
    try {
      return { ok: true, effect: EffectSchema.parse(effect) as Effect };
    } catch (err) {
      return { ok: false, error: describeError(err) };
    }
  },
  saveEffect: () => notHere(),
  deleteEffect: () => notHere(),
  wizardRecipe: () => notHere(),
  wizardSubject: () => notHere(),
  reel: () => notHere(),
  createJob: () => notHere(),
};

export const api: typeof live = SHOWCASE ? showcaseApi : live;

function extFor(type: string) {
  return type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
}

export function stripMeta(e: Effect): Omit<Effect, "source" | "example"> {
  const { source: _s, example: _e, ...rest } = e;
  return rest;
}

/** Live job updates over SSE, with polling fallback. Returns an unsubscribe fn. */
export function watchJob(id: string, onUpdate: (job: Job) => void): () => void {
  let stopped = false;
  let es: EventSource | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  const done = (j: Job) => j.status === "succeeded" || j.status === "failed";
  const startPolling = () => {
    if (poll || stopped) return;
    poll = setInterval(async () => {
      try {
        const j = await api.job(id);
        onUpdate(j);
        if (done(j)) stop();
      } catch {
        /* keep trying */
      }
    }, 1500);
  };
  const stop = () => {
    stopped = true;
    es?.close();
    if (poll) clearInterval(poll);
  };
  try {
    es = new EventSource(`/api/jobs/${id}/events`);
    es.addEventListener("job", (ev) => {
      const j = JSON.parse((ev as MessageEvent).data) as Job;
      onUpdate(j);
      if (done(j)) stop();
    });
    es.onerror = () => {
      es?.close();
      startPolling();
    };
  } catch {
    startPolling();
  }
  return stop;
}

/** URL-safe base64 of a recipe, for share links. */
export function encodeRecipe(effect: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(effect));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecipe(s: string): unknown {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

export const isVideo = (url?: string) => !!url && /\.(mp4|webm|mov)$/i.test(url);
