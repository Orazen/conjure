import { useMemo, useState } from "react";
import { useApp, go } from "../state.tsx";
import { PhotoDock } from "./PhotoDock.tsx";
import { EffectCard } from "./EffectCard.tsx";
import { ImagineBar } from "./ImagineBar.tsx";
import { HeroReel } from "./Showcase.tsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "transform", label: "Transform" },
  { id: "motion", label: "Motion and camera" },
  { id: "custom", label: "Yours" },
] as const;

/** How many of the first effects get a tall tile (REFERENCE.md: no grid of identical rectangles). */
const FEATURED = 3;

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

  const showcase = status?.backend === "showcase";

  return (
    <>
      <section className="hero">
        <div>
          <h1 className="t-display">One photo, one tap, a finished VFX shot.</h1>
          <p className="lead">
            Pick an effect and Conjure turns your photo into a short video with sound. FLUX 3 paints where the shot ends up, LTX-2.5
            animates the move, and every model is open weights running on the Comfy Developer Platform.
          </p>
          <div className="meta">
            {effects.length} effects · open weights only · video with generated sound · recipes you can remix and share
          </div>
          {showcase && (
            <p className="notice">
              <strong>Live showcase.</strong> Every clip here was rendered by Conjure. Open an effect to scrub the before and
              after, remix it in the builder, or share it. Run Conjure locally to use your own photos.
            </p>
          )}
          {status?.backend === "mock" && (
            <p className="notice">
              <strong>Mock mode.</strong> Renders are simulated with ffmpeg so you can try the app. Add <code>COMFY_API_KEY</code> to{" "}
              <code>.env</code> to render for real on Comfy Cloud.
            </p>
          )}
        </div>
        {showcase ? <HeroReel /> : <PhotoDock />}
      </section>

      <ImagineBar />

      <div className="toolbar">
        <h2 className="t-section">Effects</h2>
        <div className="tabs" role="tablist" aria-label="Filter effects">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <input className="search" placeholder="Search effects" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search effects" />
        <a className="btn" href="#/builder">New effect</a>
      </div>

      {shown.length ? (
        <div className="grid">
          {shown.map((e, i) => (
            <EffectCard key={e.id} effect={e} tall={filter === "all" && !q && i < FEATURED} onOpen={() => go(`/effect/${encodeURIComponent(e.id)}`)} />
          ))}
        </div>
      ) : (
        <div className="empty">
          {filter === "custom" ? (
            <>
              You haven't made an effect yet. <a href="#/builder">Open the Effect Builder</a>.
            </>
          ) : (
            "No effects match that search."
          )}
        </div>
      )}
    </>
  );
}
