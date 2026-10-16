/**
 * Offline structural check of an API-format graph against a snapshot of
 * ComfyUI's /object_info (workflows/node-schemas.json). Catches typos in
 * node classes and input names, dangling links, type mismatches and
 * out-of-range numbers before anything is sent to a GPU.
 */
import { readFileSync } from "node:fs";
import type { Graph } from "./workflow.ts";

type InputSpec = [unknown, Record<string, unknown>?];
interface NodeSchema {
  input: { required?: Record<string, InputSpec>; optional?: Record<string, InputSpec> };
  output: string[];
}

export function loadSchemas(path: string): Record<string, NodeSchema> {
  return (JSON.parse(readFileSync(path, "utf8")) as { nodes: Record<string, NodeSchema> }).nodes;
}

const isLink = (v: unknown): v is [string, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "number";

function typeOf(spec: InputSpec): string {
  return Array.isArray(spec[0]) ? "COMBO" : String(spec[0]);
}

function compatible(output: string, input: string): boolean {
  if (input === "*" || output === "*" || input.startsWith("COMFY_MATCHTYPE") || output.startsWith("COMFY_MATCHTYPE")) return true;
  const ins = input.split(",");
  const outs = output.split(",");
  return outs.some((o) => ins.includes(o));
}

export function validateGraph(graph: Graph, schemas: Record<string, NodeSchema>): string[] {
  const errors: string[] = [];
  for (const [id, node] of Object.entries(graph)) {
    const schema = schemas[node.class_type];
    if (!schema) {
      errors.push(`${id}: unknown node class ${node.class_type}`);
      continue;
    }
    const all = { ...schema.input.required, ...schema.input.optional };
    const required = schema.input.required ?? {};

    for (const [name, spec] of Object.entries(required)) {
      const t = typeOf(spec);
      if (t === "COMFY_AUTOGROW_V3") continue;
      if (!(name in node.inputs)) {
        errors.push(`${id} (${node.class_type}): missing required input "${name}"`);
        continue;
      }
      if (t === "COMFY_DYNAMICCOMBO_V3") {
        const options = ((spec[1] as { options?: { key: string; inputs: { required?: Record<string, unknown> } }[] })?.options ?? []);
        const chosen = options.find((o) => o.key === node.inputs[name]);
        if (!chosen) errors.push(`${id}: "${name}" = ${JSON.stringify(node.inputs[name])} is not one of ${options.map((o) => o.key).join(", ")}`);
        else for (const sub of Object.keys(chosen.inputs.required ?? {}))
          if (!(`${name}.${sub}` in node.inputs)) errors.push(`${id}: missing "${name}.${sub}" for option "${chosen.key}"`);
      }
    }

    for (const [name, value] of Object.entries(node.inputs)) {
      const base = name.split(".")[0];
      const spec = all[base];
      if (!spec) {
        errors.push(`${id} (${node.class_type}): unknown input "${name}"`);
        continue;
      }
      if (isLink(value)) {
        const [src, slot] = value;
        const srcNode = graph[src];
        if (!srcNode) {
          errors.push(`${id}.${name}: links to missing node "${src}"`);
          continue;
        }
        const srcSchema = schemas[srcNode.class_type];
        if (!srcSchema) continue;
        const outType = srcSchema.output[slot];
        if (outType === undefined) errors.push(`${id}.${name}: ${src} has no output #${slot}`);
        else if (name === base && !compatible(outType, typeOf(spec)))
          errors.push(`${id}.${name}: expects ${typeOf(spec)} but ${src}#${slot} gives ${outType}`);
        continue;
      }
      if (name !== base) continue; // dynamic sub-inputs: checked above
      const t = typeOf(spec);
      const opts = (spec[1] ?? {}) as { min?: number; max?: number };
      if (t === "INT" || t === "FLOAT") {
        if (typeof value !== "number") errors.push(`${id}.${name}: expected a number, got ${JSON.stringify(value)}`);
        else if ((opts.min !== undefined && value < opts.min) || (opts.max !== undefined && value > opts.max))
          errors.push(`${id}.${name}: ${value} is outside ${opts.min}..${opts.max}`);
        else if (t === "INT" && !Number.isInteger(value)) errors.push(`${id}.${name}: ${value} is not an integer`);
      } else if (t === "STRING" && typeof value !== "string") {
        errors.push(`${id}.${name}: expected a string`);
      } else if (t === "BOOLEAN" && typeof value !== "boolean") {
        errors.push(`${id}.${name}: expected true/false`);
      }
    }
  }

  // Cycle check
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      errors.push(`cycle: ${[...path, id].join(" → ")}`);
      return;
    }
    state.set(id, 1);
    for (const v of Object.values(graph[id]?.inputs ?? {})) if (isLink(v) && graph[v[0]]) visit(v[0], [...path, id]);
    state.set(id, 2);
  };
  for (const id of Object.keys(graph)) visit(id, []);
  return errors;
}
