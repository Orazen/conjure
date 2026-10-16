import { useEffect } from "react";
import { encodeRecipe, stripMeta } from "../api.ts";
import { useApp, go } from "../state.tsx";
import { EffectArt, pipelineLabel } from "./EffectCard.tsx";
import { RenderPanel } from "./RenderPanel.tsx";
import { IconClose } from "./Icons.tsx";

export function EffectSheet({ effectId }: { effectId: string }) {
  const { effects, toast } = useApp();
  const effect = effects.find((e) => e.id === effectId);
  const close = () => go("/");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  if (!effect) return effects.length ? <div className="scrim" onClick={close} /> : null;

  const shareLink = `${window.location.origin}${window.location.pathname}#/builder?recipe=${encodeRecipe(stripMeta(effect))}`;
  const meta = [pipelineLabel(effect), `${effect.duration} s`, effect.sound ? "with sound" : null, effect.tags.join(", ") || null, `by ${effect.author}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={effect.name}>
        <div className="drawer-head">
          <div>
            <h2 className="t-section">{effect.name}</h2>
            <p>{effect.tagline}</p>
          </div>
          <button className="x" onClick={close} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="drawer-body">
          <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", gap: 16, alignItems: "start" }}>
            <div className="tile" style={{ height: 176, cursor: "default" }}>
              <EffectArt effect={effect} playing />
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="t-caption">{meta}</div>
              <details>
                <summary>Recipe</summary>
                <pre className="recipe">
                  {effect.endFrame ? `END FRAME (FLUX 3)\n${effect.endFrame}\n\n` : ""}
                  {`MOTION (LTX-2.5)\n${effect.motion}`}
                  {effect.sound ? `\n\nSOUND\n${effect.sound}` : ""}
                </pre>
              </details>
              <div className="actions">
                <a className="btn small" href={`#/builder?recipe=${encodeRecipe(stripMeta(effect))}`}>Remix in builder</a>
                <button
                  className="btn small ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareLink).catch(() => undefined);
                    toast("Effect link copied");
                  }}
                >
                  Copy effect link
                </button>
              </div>
            </div>
          </div>
          <RenderPanel key={effect.id} effect={effect} />
        </div>
      </aside>
    </>
  );
}
