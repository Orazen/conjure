/**
 * `npm run validate` — build every effect's workflow (every aspect, both
 * qualities) and check it against the ComfyUI node schemas, offline.
 */
import { join } from "node:path";
import { config } from "../server/config.ts";
import { EffectLibrary } from "../server/effects.ts";
import { ASPECTS, QUALITIES, buildWorkflow, buildPortraitWorkflow } from "../server/workflow.ts";
import { loadSchemas, validateGraph } from "../server/validate.ts";

const schemas = loadSchemas(join(config.workflowsDir, "node-schemas.json"));
const effects = await new EffectLibrary(config.effectsDir, join(config.dataDir, "effects")).list();
let failures = 0;
let checked = 0;

for (const effect of effects) {
  for (const aspect of ASPECTS) {
    for (const quality of QUALITIES) {
      const { graph } = buildWorkflow(config.workflowsDir, effect, { aspect, quality, seed: 1234 });
      const errors = validateGraph(graph, schemas);
      checked++;
      if (errors.length) {
        failures++;
        console.error(`✘ ${effect.id} ${aspect} ${quality}\n  ${errors.join("\n  ")}`);
      }
    }
  }
}
const portraitErrors = validateGraph(buildPortraitWorkflow(config.workflowsDir, "a portrait", 1), schemas);
checked++;
if (portraitErrors.length) {
  failures++;
  console.error(`✘ sample portrait\n  ${portraitErrors.join("\n  ")}`);
}

console.log(`${failures ? "✘" : "✔"} ${checked - failures}/${checked} workflow builds valid across ${effects.length} effects`);
process.exit(failures ? 1 : 0);
