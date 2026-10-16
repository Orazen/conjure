import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { config } from "../server/config.ts";
import { extractJson, mockRecipe, repairRecipe, RECIPE_SYSTEM, WIZARD_WORKFLOW } from "../server/wizard.ts";
import { loadGraph } from "../server/workflow.ts";
import { loadSchemas, validateGraph } from "../server/validate.ts";

describe("effect wizard", () => {
  it("pulls JSON out of a chatty, fenced reply", () => {
    const reply = 'Sure! Here it is:\n```json\n{"name": "Glass {Shatter}", "nested": {"a": "}"}}\n```\nEnjoy!';
    expect(extractJson(reply)).toEqual({ name: "Glass {Shatter}", nested: { a: "}" } });
  });

  it("repairs a sloppy draft into a valid recipe", () => {
    const e = repairRecipe(
      {
        name: "Chocolate Statue!!",
        icon: "🍫🍫🍫",
        colors: ["brown", "#000"],
        pipeline: "transform",
        endFrame: "Turn {subject} into glossy milk chocolate. Keep the exact same pose.",
        motion: "the person melts slowly into chocolate as the camera pushes in gently and warm light glows",
        duration: 12,
        tags: ["Sweet", 4],
      },
      "turn me into chocolate",
    );
    expect(e.id).toBe("chocolate-statue");
    expect(e.colors).toEqual(["#a78bfa", "#1e1b4b"]);
    expect(e.duration).toBe(8);
    expect(e.motion.startsWith("{subject}")).toBe(true);
    expect(e.tags).toEqual(["sweet"]);
    expect(e.author).toMatch(/Gemma 4/);
  });

  it("falls back to a motion effect when a transform has no end frame", () => {
    const e = repairRecipe({ name: "Sparkle", pipeline: "transform", motion: "{subject} sparkles with tiny lights that swirl around." }, "sparkle");
    expect(e.pipeline).toBe("motion");
  });

  it("mock recipes are valid", () => {
    const e = mockRecipe("turn me into a chocolate statue");
    expect(e.pipeline).toBe("transform");
    expect(e.endFrame).toMatch(/a chocolate statue/);
  });

  it("the system prompt embeds real example recipes", () => {
    expect(RECIPE_SYSTEM).toContain('"id":"midas-touch"');
  });

  it("the wizard workflow passes the node-schema check with and without a photo", () => {
    const schemas = loadSchemas(join(config.workflowsDir, "node-schemas.json"));
    const g = loadGraph(config.workflowsDir, WIZARD_WORKFLOW);
    expect(validateGraph(g, schemas)).toEqual([]);
    delete g.load_image;
    delete g.generate.inputs.image;
    expect(validateGraph(g, schemas)).toEqual([]);
  });
});
