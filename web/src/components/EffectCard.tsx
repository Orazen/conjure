import { useRef } from "react";
import type { Effect } from "../api.ts";

export function EffectArt({ effect, playing }: { effect: Effect; playing?: boolean }) {
  const [a, b] = effect.colors;
  if (effect.example?.video) {
    return (
      <video
        src={effect.example.preview ?? effect.example.video}
        poster={effect.example.input}
        muted
        loop
        playsInline
        preload="metadata"
        autoPlay={playing}
      />
    );
  }
  return (
    <div className="glyph" style={{ background: `linear-gradient(150deg, ${a}, ${b})` }} aria-hidden="true">
      <span>{effect.icon}</span>
    </div>
  );
}

export function pipelineLabel(e: Pick<Effect, "pipeline">) {
  return e.pipeline === "transform" ? "FLUX 3 → LTX-2.5" : "LTX-2.5";
}

export function EffectCard({ effect, onOpen }: { effect: Effect; onOpen: () => void }) {
  const media = useRef<HTMLDivElement>(null);
  const play = (on: boolean) => {
    const v = media.current?.querySelector("video");
    if (!v) return;
    if (on) void v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  };
  return (
    <button
      className="card"
      onClick={onOpen}
      onMouseEnter={() => play(true)}
      onMouseLeave={() => play(false)}
      onFocus={() => play(true)}
      onBlur={() => play(false)}
      aria-label={`${effect.name}: ${effect.tagline}`}
    >
      <div className="media" ref={media}>
        <EffectArt effect={effect} />
        <div className="badge">
          <span>{effect.pipeline === "transform" ? "Transform" : "Motion"}</span>
          {effect.source === "custom" && <span>Mine</span>}
        </div>
        <span className="go">Conjure ✦</span>
      </div>
      <div className="body">
        <h3>
          {effect.example?.video ? `${effect.icon} ` : ""}
          {effect.name}
        </h3>
        <p>{effect.tagline}</p>
      </div>
    </button>
  );
}
