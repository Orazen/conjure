import { useState } from "react";
import { api, type Effect, type Job } from "../api.ts";
import { useApp } from "../state.tsx";
import { PhotoDock } from "./PhotoDock.tsx";
import { JobView } from "./JobView.tsx";
import { ExampleResult, RunYourself } from "./Showcase.tsx";

const ASPECTS = [
  { id: "auto", label: "Auto" },
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
];

/** Render options, the render button, and this session's takes for one effect. */
export function RenderPanel({ effect, unsaved }: { effect: Effect; unsaved?: boolean }) {
  const { photo, toast, status } = useApp();
  const [aspect, setAspect] = useState("auto");
  const [quality, setQuality] = useState("standard");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(effect.duration);
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [detecting, setDetecting] = useState(false);

  if (status?.backend === "showcase")
    return (
      <>
        {!unsaved && <ExampleResult effect={effect} />}
        <RunYourself />
      </>
    );

  const detect = async () => {
    if (!photo) return toast("Add a photo first");
    setDetecting(true);
    try {
      setSubject((await api.wizardSubject(photo.blob)).subject);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setDetecting(false);
    }
  };

  const render = async (overrides: { seed?: number } = {}) => {
    if (!photo) return toast("Add a photo first");
    setBusy(true);
    try {
      const job = await api.createJob({
        photo: photo.blob,
        effect,
        unsaved,
        aspect,
        quality,
        subject: subject.trim() || undefined,
        duration,
        seed: overrides.seed ?? (seed ? Number(seed) : undefined),
      });
      setJobs((j) => [job, ...j]);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const steps =
    effect.pipeline === "transform"
      ? "Your photo → FLUX 3 paints the final frame → LTX-2.5 animates from the photo to that frame, with sound."
      : "Your photo → LTX-2.5 animates what happens next, with sound.";

  return (
    <>
      {!photo && <PhotoDock />}
      <div className="section">
        <h4>Render</h4>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 13, lineHeight: "18px" }}>
          {steps}
        </p>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="subject">Who or what is in the photo?</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="subject" placeholder={effect.subject} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} />
            <button className="btn" type="button" disabled={detecting || !photo} onClick={detect} title="Gemma 4 looks at your photo and names the subject">
              {detecting ? "Looking" : "Detect"}
            </button>
          </div>
          <span className="hint">Optional, for example "my dog" or "the woman in the red coat". Detect asks Gemma 4 to name it from the photo.</span>
        </div>
        <div className="row">
          <div className="field" style={{ flex: "0 0 auto" }}>
            <label>Aspect</label>
            <div className="seg" role="group" aria-label="Aspect ratio">
              {ASPECTS.map((a) => (
                <button key={a.id} className={aspect === a.id ? "on" : ""} onClick={() => setAspect(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <label>Quality</label>
            <div className="seg" role="group" aria-label="Quality">
              {["draft", "standard"].map((q) => (
                <button key={q} className={quality === q ? "on" : ""} onClick={() => setQuality(q)}>
                  {q === "draft" ? "Draft" : "Standard"}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 120px", minWidth: 120 }}>
            <label htmlFor="dur">Length {duration} s</label>
            <input id="dur" type="range" min={3} max={8} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: "0 0 120px", minWidth: 120 }}>
            <label htmlFor="seed">Seed</label>
            <input id="seed" className="mono" inputMode="numeric" placeholder="random" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 16, alignItems: "center" }}>
          <button className="btn primary" disabled={busy || !photo} onClick={() => render()}>
            {busy ? "Sending" : `Render ${effect.name}`}
          </button>
          <span className="t-caption">{status?.label ?? ""}</span>
        </div>
      </div>
      {jobs.map((j) => (
        <JobView key={j.id} initial={j} onRerun={() => render({ seed: Math.floor(Math.random() * 2 ** 40) })} />
      ))}
    </>
  );
}
