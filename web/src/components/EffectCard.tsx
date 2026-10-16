import { useRef } from "react";
import type { Effect } from "../api.ts";

/** Readable text colour on a flat field of `hex`. */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#16130a" : "#f2f1ee";
}

/** The effect's render if there is one, otherwise a flat field of its own colour with the name set in type. */
export function EffectArt({ effect, playing }: { effect: Effect; playing?: boolean }) {
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
  const bg = effect.colors[1];
  return (
    <div className="field-art" style={{ background: bg, color: inkOn(bg) }} aria-hidden="true">
      <span>{effect.name}</span>
    </div>
  );
}

export function pipelineLabel(e: Pick<Effect, "pipeline">) {
  return e.pipeline === "transform" ? "FLUX 3 → LTX-2.5" : "LTX-2.5";
}

export function metaLine(e: Effect): string {
  return [e.pipeline === "transform" ? "Transform" : "Motion", `${e.duration} s`, e.sound ? "sound" : null, e.source === "custom" ? "yours" : null]
    .filter(Boolean)
    .join(" · ");
}

export function EffectCard({ effect, onOpen, tall }: { effect: Effect; onOpen: () => void; tall?: boolean }) {
  const media = useRef<HTMLButtonElement>(null);
  const play = (on: boolean) => {
    const v = media.current?.querySelector("video");
    if (!v) return;
    if (on) void v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  };
  const hasVideo = !!effect.example?.video;
  return (
    <button
      ref={media}
      className={`tile ${tall ? "tall" : ""}`}
      onClick={onOpen}
      onMouseEnter={() => play(true)}
      onMouseLeave={() => play(false)}
      onFocus={() => play(true)}
      onBlur={() => play(false)}
      aria-label={`${effect.name}: ${effect.tagline}`}
      title={effect.tagline}
    >
      <EffectArt effect={effect} />
      <div className="caption" style={hasVideo ? undefined : { background: "none", color: inkOn(effect.colors[1]) }}>
        {hasVideo && <div className="name">{effect.name}</div>}
        <div className="sub" style={hasVideo ? undefined : { color: "inherit", opacity: 0.75 }}>
          {metaLine(effect)}
        </div>
      </div>
    </button>
  );
}
