import { beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

// Isolated data dir + mock backend, set before the server modules load.
process.env.CONJURE_DATA_DIR = mkdtempSync(join(tmpdir(), "conjure-test-"));
process.env.CONJURE_MOCK = "1";

const { app } = await import("../server/index.ts");
type JobLike = { id: string; status: string; outputs: Record<string, string>; aspect: string; width: number; height: number; error?: string };

let photo: Blob;
beforeAll(async () => {
  const png = await sharp({ create: { width: 900, height: 1600, channels: 3, background: "#336699" } }).png().toBuffer();
  photo = new Blob([new Uint8Array(png)], { type: "image/png" });
});

async function waitFor(id: string): Promise<JobLike> {
  for (let i = 0; i < 100; i++) {
    const job = (await (await app.request(`/api/jobs/${id}`)).json()) as JobLike;
    if (job.status === "succeeded" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("job did not finish");
}

describe("api (mock backend)", () => {
  it("reports status", async () => {
    const s = await (await app.request("/api/status")).json();
    expect(s.backend).toBe("mock");
  });

  it("lists effects", async () => {
    const list = (await (await app.request("/api/effects")).json()) as { id: string }[];
    expect(list.length).toBeGreaterThanOrEqual(20);
  });

  it("validates recipes with readable errors", async () => {
    const res = await app.request("/api/effects/validate", {
      method: "POST",
      body: JSON.stringify({ id: "a", name: "x", pipeline: "motion" }),
      headers: { "content-type": "application/json" },
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/id:/);
  });

  it("saves a custom effect but refuses to overwrite a built-in", async () => {
    const recipe = { id: "test-glow", name: "Test Glow", tagline: "a test effect", pipeline: "motion", motion: "{subject} starts to glow softly from within." };
    const ok = await app.request("/api/effects", { method: "POST", body: JSON.stringify(recipe), headers: { "content-type": "application/json" } });
    expect(ok.status).toBe(201);
    const clash = await app.request("/api/effects", {
      method: "POST",
      body: JSON.stringify({ ...recipe, id: "midas-touch" }),
      headers: { "content-type": "application/json" },
    });
    expect(clash.status).toBe(400);
  });

  it("runs a transform job end to end and crops to the photo's aspect", async () => {
    const fd = new FormData();
    fd.set("image", photo, "p.png");
    fd.set("effectId", "midas-touch");
    fd.set("quality", "draft");
    const res = await app.request("/api/jobs", { method: "POST", body: fd });
    expect(res.status).toBe(202);
    const job = await waitFor(((await res.json()) as JobLike).id);
    expect(job.error).toBeUndefined();
    expect(job.status).toBe("succeeded");
    expect(job.aspect).toBe("9:16");
    expect([job.width, job.height]).toEqual([576, 1024]);
    expect(job.outputs.endFrame).toMatch(/end_frame\.png$/);
    expect(job.outputs.video).toBeTruthy();
    const file = await app.request(job.outputs.video);
    expect(file.status).toBe(200);
  }, 30_000);

  it("accepts an unsaved recipe from the builder", async () => {
    const fd = new FormData();
    fd.set("image", photo, "p.png");
    fd.set("effect", JSON.stringify({ id: "draft-fx", name: "Draft FX", tagline: "builder test", pipeline: "motion", motion: "{subject} waves at the camera and smiles." }));
    fd.set("aspect", "1:1");
    fd.set("quality", "draft");
    const job = await waitFor(((await (await app.request("/api/jobs", { method: "POST", body: fd })).json()) as JobLike).id);
    expect(job.status).toBe("succeeded");
    expect(job.aspect).toBe("1:1");
  }, 30_000);

  it("rejects non-images", async () => {
    const fd = new FormData();
    fd.set("image", new Blob(["hello"], { type: "text/plain" }), "x.txt");
    fd.set("effectId", "midas-touch");
    expect((await app.request("/api/jobs", { method: "POST", body: fd })).status).toBe(415);
  });
});

describe("wizard api (mock backend)", () => {
  it("drafts a recipe from an idea", async () => {
    const fd = new FormData();
    fd.set("idea", "turn me into a chocolate statue");
    const res = await app.request("/api/wizard/recipe", { method: "POST", body: fd });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { effect: { pipeline: string; id: string } };
    expect(body.effect.pipeline).toBe("transform");
  });
});
