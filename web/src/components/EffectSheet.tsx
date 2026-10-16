import { useEffect } from "react";
import { encodeRecipe, stripMeta } from "../api.ts";
import { useApp, go } from "../state.tsx";
import { EffectArt, pipelineLabel } from "./EffectCard.tsx";
import { RenderPanel } from "./RenderPanel.tsx";

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

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={effect.name}>
        <div className="drawer-head">
          <span style={{ fontSize: 26 }}>{effect.icon}</span>
          <div>
            <h2>{effect.name}</h2>
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>{effect.tagline}</div>
          </div>
          <button className="x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <div className="drawer-body">
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "start" }}>
            <div className="card" style={{ cursor: "default" }}>
              <div className="media">
                <EffectArt effect={effect} playing />
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="chips">
                <span className="tag">{pipelineLabel(effect)}</span>
                <span className="tag">{effect.duration}s</span>
                {effect.sound && <span className="tag">audio</span>}
                {effect.tags.map((t) => (
                  <span key={t} className="tag">#{t}</span>
                ))}
              </div>
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
              <span style={{ fontSize: 12, color: "var(--faint)" }}>by {effect.author}</span>
            </div>
          </div>
          <RenderPanel key={effect.id} effect={effect} />
        </div>
      </aside>
    </>
  );
}
