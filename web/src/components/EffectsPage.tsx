import { useMemo, useState } from "react";
import { useApp, go } from "../state.tsx";
import { PhotoDock } from "./PhotoDock.tsx";
import { EffectCard } from "./EffectCard.tsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "transform", label: "Transform" },
  { id: "motion", label: "Motion + camera" },
  { id: "custom", label: "My effects" },
] as const;

export function EffectsPage() {
  const { effects, status } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return effects.filter((e) => {
      if (filter === "custom" && e.source !== "custom") return false;
      if ((filter === "transform" || filter === "motion") && e.pipeline !== filter) return false;
      if (!needle) return true;
      return [e.name, e.tagline, ...e.tags].join(" ").toLowerCase().includes(needle);
    });
  }, [effects, filter, q]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            One photo. One tap.
            <br />
            <em>A whole VFX shot.</em>
          </h1>
          <p>
            Conjure is an open-source take on one-tap video effects. Each effect is a small recipe file. FLUX 3 paints
            where the shot ends up, and LTX-2.5 animates the move, with sound. Every model has open weights, and it all
            runs on the Comfy Developer Platform.
          </p>
          <div className="chips">
            <span className="tag">{effects.length} effects</span>
            <span className="tag">open weights only</span>
            <span className="tag">video + generated audio</span>
            <span className="tag">remix + share recipes</span>
          </div>
          {status?.backend === "mock" && (
            <p className="note" style={{ marginTop: 16 }}>
              Mock mode: renders are simulated with ffmpeg so you can explore the app. Add <code>COMFY_API_KEY</code>{" "}
              to <code>.env</code> to render for real on Comfy Cloud.
            </p>
          )}
        </div>
        <PhotoDock />
      </section>

      <div className="toolbar">
        <h2>Effects</h2>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <input className="search" placeholder="Search effects…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search effects" />
        <a className="btn small" href="#/builder">+ New effect</a>
      </div>

      {shown.length ? (
        <div className="grid">
          {shown.map((e) => (
            <EffectCard key={e.id} effect={e} onOpen={() => go(`/effect/${encodeURIComponent(e.id)}`)} />
          ))}
        </div>
      ) : (
        <div className="empty">
          {filter === "custom" ? (
            <>
              You haven't made an effect yet. <a href="#/builder">Open the Effect Builder</a>.
            </>
          ) : (
            "No effects match."
          )}
        </div>
      )}
    </>
  );
}
