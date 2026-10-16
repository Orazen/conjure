import { useState } from "react";
import { api, type Effect, type Job } from "../api.ts";
import { useApp } from "../state.tsx";
import { PhotoDock } from "./PhotoDock.tsx";
import { JobView } from "./JobView.tsx";
import { pipelineLabel } from "./EffectCard.tsx";
import { ExampleResult, RunYourself } from "./Showcase.tsx";

const ASPECTS = [
  { id: "auto", label: "Auto" },
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
];

/** Render options + the Conjure button + this session's takes for one effect. */
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

  const conjure = async (overrides: { seed?: number } = {}) => {
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

  if (status?.backend === "showcase")
    return (
      <>
        {!unsaved && <ExampleResult effect={effect} />}
        <RunYourself />
      </>
    );

  return (
    <>
      {!photo && <PhotoDock />}
      <div className="section">
        <h4>Render</h4>
        <div className="pipeline" style={{ marginBottom: 14 }}>
          <span className="step">Your photo</span>
          <span className="arrow">→</span>
          {effect.pipeline === "transform" && (
            <>
              <span className="step">FLUX 3 paints the final frame</span>
              <span className="arrow">→</span>
              <span className="step">LTX-2.5 morphs start → end + audio</span>
            </>
          )}
          {effect.pipeline === "motion" && <span className="step">LTX-2.5 animates + adds audio</span>}
        </div>
        <div className="row">
          <div className="field" style={{ flex: "2 1 260px" }}>
            <label htmlFor="subject">Who or what is in the photo?</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="subject" placeholder={effect.subject} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} />
              <button className="btn small" type="button" disabled={detecting || !photo} onClick={detect} title="Gemma 4 looks at your photo and names the subject">
                {detecting ? "Looking…" : "✦ Detect"}
              </button>
            </div>
            <span className="hint">Optional. For example "my dog", "the woman in the red coat" or "the vintage car".</span>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
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
                  {q === "draft" ? "Draft (fast)" : "Standard"}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 110px", minWidth: 110 }}>
            <label htmlFor="dur">Length: {duration}s</label>
            <input id="dur" type="range" min={3} max={8} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: "0 0 130px", minWidth: 130 }}>
            <label htmlFor="seed">Seed</label>
            <input id="seed" inputMode="numeric" placeholder="random" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 16, alignItems: "center" }}>
          <button className="btn primary" disabled={busy || !photo} onClick={() => conjure()}>
            {busy ? "Sending…" : `Conjure ✦ ${effect.name}`}
          </button>
          <span style={{ color: "var(--faint)", fontSize: 13 }}>
            {pipelineLabel(effect)} · {status?.label ?? "…"}
          </span>
        </div>
      </div>
      {jobs.map((j) => (
        <JobView key={j.id} initial={j} onRerun={() => conjure({ seed: Math.floor(Math.random() * 2 ** 40) })} />
      ))}
    </>
  );
}
