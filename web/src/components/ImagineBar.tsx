import { useState } from "react";
import { api, encodeRecipe, stripMeta } from "../api.ts";
import { useApp, go } from "../state.tsx";

const IDEAS = [
  "turn me into a chocolate statue",
  "my dog becomes a fluffy cloud",
  "neon tron lines trace my outline",
  "I shatter into glass shards",
  "vines and flowers grow over me",
];

/** One line in, a full effect recipe out — written by Gemma 4 running in ComfyUI. */
export function ImagineBar({ compact }: { compact?: boolean }) {
  const { photo, toast, status } = useApp();
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const placeholder = IDEAS[Math.floor(Date.now() / 60000) % IDEAS.length];
  const showcase = status?.backend === "showcase";

  const run = async (text = idea) => {
    const t = text.trim();
    if (t.length < 3) return toast("Describe the effect in a few words");
    setBusy(true);
    try {
      const { effect } = await api.wizardRecipe(t, photo?.blob);
      go(`/builder?wizard=1&recipe=${encodeRecipe(stripMeta(effect))}`);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={`imagine ${compact ? "compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <span className="imagine-spark" aria-hidden="true">✦</span>
      <input
        aria-label="Describe a new effect"
        placeholder={`Imagine any effect… "${placeholder}"`}
        value={idea}
        maxLength={300}
        onChange={(e) => setIdea(e.target.value)}
        disabled={busy || showcase}
      />
      <button className="btn primary" disabled={busy || showcase}>
        {busy ? "Gemma 4 is writing…" : "Create effect"}
      </button>
      {!compact && (
        <div className="imagine-hint">
          An open-weights LLM (Gemma 4, running in ComfyUI) writes the recipe{photo ? " and looks at your photo" : ""}. You can tweak it in the
          builder, then render.{status?.backend === "mock" ? " (Mock mode uses a simple template instead of the LLM.)" : ""}
          {showcase ? " The wizard needs a Comfy backend, so run Conjure locally to try it." : ""}
        </div>
      )}
    </form>
  );
}
