import { useEffect, useState } from "react";
import { api, encodeRecipe, stripMeta, watchJob, type Job } from "../api.ts";
import { useApp } from "../state.tsx";
import { Compare } from "./Compare.tsx";

export function caption(job: Pick<Job, "effect">) {
  return `I used "${job.effect.name}" on one photo. Open-source FLUX 3 + LTX-2.5 running on ComfyUI, made with Conjure ✦ #OpenSourceHiggsfield #ComfyUI`;
}

export function useJob(initial: Job): Job {
  const [job, setJob] = useState(initial);
  useEffect(() => {
    setJob(initial);
    if (initial.status === "succeeded" || initial.status === "failed") return;
    return watchJob(initial.id, setJob);
  }, [initial.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return job;
}

export function JobView({ initial, onRerun }: { initial: Job; onRerun?: (job: Job) => void }) {
  const job = useJob(initial);
  const { status, toast } = useApp();
  const [reeling, setReeling] = useState(false);
  const [reel, setReel] = useState(job.outputs.reel);
  const running = job.status === "queued" || job.status === "running";
  const elapsed = job.finishedAt ? Math.round((Date.parse(job.finishedAt) - Date.parse(job.createdAt)) / 1000) : undefined;

  const makeReel = async () => {
    setReeling(true);
    try {
      const r = await api.reel(job.id);
      setReel(r.reel);
      toast("Reel ready");
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setReeling(false);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption(job)).catch(() => undefined);
    toast("Caption copied");
  };

  return (
    <div className="job section">
      <div className="stage">
        <strong style={{ color: "var(--text)" }}>
          {job.effect.icon} {job.effect.name}
        </strong>
        <span>
          {job.aspect} · {job.width}×{job.height} · {job.duration}s{elapsed !== undefined ? ` · ${elapsed}s render` : ""}
        </span>
      </div>

      {running && (
        <>
          <div className="progress" aria-label="Render progress">
            <div style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
          <div className="stage">
            <span>{job.stage}</span>
            <span>{Math.round(job.progress * 100)}%</span>
          </div>
        </>
      )}

      {job.status === "failed" && <div className="error">{job.error ?? "Render failed."}</div>}

      {job.outputs.endFrame && !job.outputs.video && (
        <div className="frames">
          <figure>
            <img src={job.input} alt="Start frame" />
            <figcaption>Start frame: your photo</figcaption>
          </figure>
          <figure>
            <img src={job.outputs.endFrame} alt="End frame painted by FLUX 3" />
            <figcaption>End frame, painted by FLUX 3. LTX-2.5 is animating the rest.</figcaption>
          </figure>
        </div>
      )}

      {job.outputs.video && (
        <>
          <Compare before={job.input} after={job.outputs.video} aspect={job.aspect} />
          {job.backend === "mock" && (
            <div className="note">This is a mock render (ffmpeg pan + dissolve). Connect a Comfy backend for the real effect.</div>
          )}
          <div className="actions">
            <a className="btn small" href={job.outputs.video} download={`conjure-${job.effect.id}.mp4`}>
              ⬇ Download MP4
            </a>
            {status?.ffmpeg &&
              (reel ? (
                <a className="btn small" href={reel} download={`conjure-${job.effect.id}-reel.mp4`}>
                  ⬇ Before→after reel
                </a>
              ) : (
                <button className="btn small" disabled={reeling} onClick={makeReel}>
                  {reeling ? "Making reel…" : "🎬 Make before→after reel"}
                </button>
              ))}
            <button className="btn small" onClick={copyCaption}>Copy caption</button>
            <a className="btn small ghost" href={`#/builder?recipe=${encodeRecipe(stripMeta(job.recipe))}`}>
              Remix effect
            </a>
            {onRerun && (
              <button className="btn small ghost" onClick={() => onRerun(job)}>
                ↻ New take
              </button>
            )}
          </div>
          {job.outputs.endFrame && (
            <details>
              <summary>See the end frame FLUX 3 painted</summary>
              <img src={job.outputs.endFrame} alt="End frame" style={{ marginTop: 10, borderRadius: 10, maxHeight: 360 }} />
            </details>
          )}
        </>
      )}

      <details>
        <summary>Prompts sent to the models</summary>
        <pre className="recipe">
          {job.prompts.endFrame ? `FLUX 3 end frame:\n${job.prompts.endFrame}\n\n` : ""}
          {`LTX-2.5 motion + audio:\n${job.prompts.motion}\n\nseed ${job.seed}`}
        </pre>
      </details>
    </div>
  );
}
