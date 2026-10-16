/**
 * Submit one built workflow through the Comfy SDK and collect its outputs.
 * Shared by the web server's jobs and the CLI scripts.
 */
import { Comfy } from "@comfyorg/sdk";
import type { Output } from "@comfyorg/sdk";
import type { Graph } from "./workflow.ts";
import { INPUT_NODE } from "./workflow.ts";

let client: Comfy | undefined;
export function comfyClient(): Comfy {
  client ??= new Comfy({ clientInfo: "conjure/0.1", timeoutMs: 120_000 });
  return client;
}

export interface RunHooks {
  onSubmitted?: (remoteId: string) => void;
  onProgress?: (value: number, currentNode: string | null) => void;
  onQueued?: (position: number | null) => void;
  onOutput?: (output: Output) => Promise<void> | void;
}

/** Runs the graph with `inputPng` bound to the "load_image" node (if given). Resolves with every output. */
export async function runWorkflow(graph: Graph, inputPng: Buffer | undefined, hooks: RunHooks = {}): Promise<Output[]> {
  const c = comfyClient();
  const wf = c.workflows.fromJson(graph);
  if (inputPng) {
    wf.setInput(
      INPUT_NODE,
      "image",
      c.assets.fromBytes(new Uint8Array(inputPng), { filename: "conjure_input.png", contentType: "image/png" }),
    );
  }
  const remote = await c.submit(wf);
  hooks.onSubmitted?.(remote.id);

  const seen = new Set<string>();
  const emit = async (o: Output) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    await hooks.onOutput?.(o);
  };

  try {
    for await (const ev of remote.events()) {
      if (ev.kind === "progress") hooks.onProgress?.(ev.value, ev.currentNode);
      else if (ev.kind === "statusChange" && (ev.status === "queued" || ev.status === "pending")) hooks.onQueued?.(ev.queuePosition);
      else if (ev.kind === "outputReady") await emit(ev.output);
    }
  } catch (err) {
    // The live stream is best-effort; the job result below is authoritative.
    console.warn(`[conjure] event stream ended early: ${(err as Error).message}`);
  }
  const done = await remote.result(); // throws JobFailed
  for (const o of done.outputs) await emit(o);
  return done.outputs;
}
