import { useState } from "react";
import { api, encodeRecipe, stripMeta } from "../api.ts";
import { useApp, go } from "../state.tsx";

const IDEAS = [
  "turn me into a chocolate statue",
  "my dog becomes a fluffy cloud",
  "neon light lines trace my outline",
  "I shatter into glass shards",
  "vines and flowers grow over me",
];

/** One line in, a full effect recipe out, written by Gemma 4 running in ComfyUI. */
export function ImagineBar({ compact }: { compact?: boolean }) {
  const { photo, toast, status } = useApp();
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const placeholder = IDEAS[Math.floor(Date.now() / 60000) % IDEAS.length];
  const showcase = status?.backend === "showcase";

  const run = async () => {
    const t = idea.trim();
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
      className="imagine"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <input
        aria-label="Describe a new effect"
        placeholder={`Describe a new effect, for example "${placeholder}"`}
        value={idea}
        maxLength={300}
        onChange={(e) => setIdea(e.target.value)}
        disabled={busy || showcase}
      />
      <button className="btn primary" disabled={busy || showcase}>
        {busy ? "Writing the recipe" : "Write effect"}
      </button>
      {!compact && (
        <div className="imagine-hint">
          Gemma 4, an open-weights language model running in ComfyUI, writes the recipe{photo ? " and looks at your photo" : ""}. You review it in
          the builder, then render.
          {status?.backend === "mock" ? " Mock mode uses a simple template instead of the model." : ""}
          {showcase ? " The writer needs a Comfy backend, so run Conjure locally to try it." : ""}
        </div>
      )}
    </form>
  );
}
