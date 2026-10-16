import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { EffectLibrary, parseEffect, renderTemplate } from "../server/effects.ts";
import { ASPECTS, QUALITIES, SIZES, buildWorkflow, frameCount, nearestAspect, spliceLoras, type Graph } from "../server/workflow.ts";
import { loadSchemas, validateGraph } from "../server/validate.ts";

const lib = new EffectLibrary(config.effectsDir, "/nonexistent");
const schemas = loadSchemas(join(config.workflowsDir, "node-schemas.json"));

describe("recipes", () => {
  it("every built-in effect parses and has a unique id", async () => {
    const effects = await lib.list();
    expect(effects.length).toBeGreaterThanOrEqual(20);
    expect(new Set(effects.map((e) => e.id)).size).toBe(effects.length);
    for (const e of effects) {
      expect(e.motion).toContain("{subject}");
      if (e.pipeline === "transform") expect(e.endFrame).toBeTruthy();
    }
  });

  it("follows _order.json for display order", async () => {
    const effects = await lib.list();
    expect(effects[0].id).toBe("midas-touch");
  });

  it("rejects a transform effect without an end frame", () => {
    expect(() =>
      parseEffect({ id: "x-1", name: "Broken", tagline: "nope nope", pipeline: "transform", motion: "{subject} does a thing for a while" }),
    ).toThrow(/endFrame/);
  });

  it("rejects ids that are not file-safe", () => {
    expect(() => parseEffect({ id: "../evil", name: "Evil", tagline: "nope nope", pipeline: "motion", motion: "x".repeat(30) })).toThrow();
  });

  it("substitutes the subject and fixes sentence capitalisation", () => {
    expect(renderTemplate("{subject} waves. Then {subject} smiles.", "my dog")).toBe("My dog waves. Then my dog smiles.");
  });
});

describe("workflow builder", () => {
  it("frame counts are always 8n+1", () => {
    for (let s = 2; s <= 10; s++) expect((frameCount(s) - 1) % 8).toBe(0);
    expect(frameCount(5)).toBe(121);
  });

  it("picks the nearest aspect", () => {
    expect(nearestAspect(1080, 1920)).toBe("9:16");
    expect(nearestAspect(1200, 1500)).toBe("4:5");
    expect(nearestAspect(1000, 1000)).toBe("1:1");
    expect(nearestAspect(1920, 1080)).toBe("16:9");
  });

  it("all sizes keep the stage-1 latent on the 32px grid", () => {
    for (const q of QUALITIES) for (const a of ASPECTS) for (const side of SIZES[q][a]) expect(side % 64).toBe(0);
  });

  it("builds a transform workflow with FLUX 3 end frame + LTX-2.5 morph", async () => {
    const e = (await lib.get("midas-touch"))!;
    const b = buildWorkflow(config.workflowsDir, e, { aspect: "9:16", quality: "standard", subject: "my cat", seed: 7, duration: 4 });
    expect(b.graph.edit_prompt.inputs.text).toMatch(/^Convert my cat into a solid statue/);
    expect(b.graph.prompt.inputs.text).toMatch(/final frame anchor\. My cat stands still/);
    expect(b.graph.prompt.inputs.text).toMatch(/Audio: A rising shimmering/);
    expect(b.graph.empty_video.inputs).toMatchObject({ width: 704, height: 1280, length: 97 });
    expect(b.graph.empty_audio.inputs.frames_number).toBe(97);
    expect(b.graph.noise_1.inputs.noise_seed).toBe(7);
    expect(b.graph.save_video.inputs.filename_prefix).toBe("conjure/midas-touch");
  });

  it("builds a motion workflow at half resolution for stage 1", async () => {
    const e = (await lib.get("dust-to-dust"))!;
    const b = buildWorkflow(config.workflowsDir, e, { aspect: "16:9", quality: "draft", seed: 1 });
    expect(b.graph.empty_video.inputs).toMatchObject({ width: 448, height: 256 });
    expect(b.graph["resize_image"].inputs["resize_type.width"]).toBe(896);
    expect(b.graph.edit_prompt).toBeUndefined();
  });

  it("every effect × aspect × quality passes the node-schema check", async () => {
    for (const e of await lib.list())
      for (const aspect of ASPECTS)
        for (const quality of QUALITIES) {
          const errors = validateGraph(buildWorkflow(config.workflowsDir, e, { aspect, quality, seed: 3 }).graph, schemas);
          expect(errors, `${e.id} ${aspect} ${quality}`).toEqual([]);
        }
  });

  it("splices LoRAs between the model loader and every consumer", () => {
    const g: Graph = {
      m: { class_type: "UNETLoader", inputs: { unet_name: "x", weight_dtype: "default" } },
      a: { class_type: "X", inputs: { model: ["m", 0] } },
      b: { class_type: "Y", inputs: { model: ["m", 0] } },
    };
    spliceLoras(g, "m", [{ name: "l1", strength: 1 }, { name: "l2", strength: 0.5 }], "ltx");
    expect(g.ltx_lora_1.inputs.model).toEqual(["m", 0]);
    expect(g.ltx_lora_2.inputs.model).toEqual(["ltx_lora_1", 0]);
    expect(g.a.inputs.model).toEqual(["ltx_lora_2", 0]);
    expect(g.b.inputs.model).toEqual(["ltx_lora_2", 0]);
  });
});

describe("validator", () => {
  const good = async () => buildWorkflow(config.workflowsDir, (await lib.get("inflate"))!, { aspect: "1:1", quality: "draft", seed: 5 }).graph;

  it("flags dangling links, unknown classes, bad types and out-of-range values", async () => {
    const g = await good();
    g.guider.inputs.model = ["does_not_exist", 0];
    g.sampler.class_type = "NoSuchNode";
    g.prompt.inputs.clip = ["ltx_vae", 0];
    g.empty_video.inputs.batch_size = 0;
    const errors = validateGraph(g, schemas).join("\n");
    expect(errors).toMatch(/missing node "does_not_exist"/);
    expect(errors).toMatch(/unknown node class NoSuchNode/);
    expect(errors).toMatch(/prompt.clip: expects CLIP but ltx_vae#0 gives VAE/);
    expect(errors).toMatch(/batch_size: 0 is outside/);
  });

  it("flags cycles", async () => {
    const g = await good();
    g.prompt.inputs.text = ["create_video", 0];
    g.create_video.inputs.images = ["prompt", 0];
    expect(validateGraph(g, schemas).join("\n")).toMatch(/cycle/);
  });
});
