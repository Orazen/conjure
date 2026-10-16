import { useRef, useState } from "react";
import { isVideo } from "../api.ts";

/**
 * The result with a draggable before/after handle: the original photo is
 * revealed on the left of the handle, the effect plays on the right.
 */
export function Compare({ before, after, aspect }: { before: string; after: string; aspect: string }) {
  const [pos, setPos] = useState(0);
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [w, h] = aspect.split(":").map(Number);

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      className="compare"
      ref={box}
      style={{ aspectRatio: `${w} / ${h}`, maxHeight: "72vh", marginInline: "auto", width: "100%" }}
      onPointerDown={(e) => {
        if (!on) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => on && e.buttons && move(e.clientX)}
    >
      {isVideo(after) ? <video src={after} autoPlay loop playsInline controls={!on} /> : <img src={after} alt="Effect result" />}
      {on && (
        <>
          <div className="before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <img src={before} alt="Original photo" />
          </div>
          <div className="handle" style={{ left: `${pos}%` }}>
            <div className="knob">⇆</div>
          </div>
          <div className="labels">
            <span>BEFORE</span>
            <span>AFTER</span>
          </div>
        </>
      )}
      <button
        className="btn small compare-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setOn((v) => !v);
          setPos(50);
        }}
      >
        {on ? "Hide compare" : "Before / after"}
      </button>
    </div>
  );
}
