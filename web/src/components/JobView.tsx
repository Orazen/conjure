import { useEffect, useState } from "react";
import { api, encodeRecipe, stripMeta, watchJob, type Job } from "../api.ts";
import { useApp } from "../state.tsx";
import { Compare } from "./Compare.tsx";
import { IconDownload } from "./Icons.tsx";

export function caption(job: Pick<Job, "effect">) {
  return `"${job.effect.name}", made from one photo with Conjure: open-source FLUX 3 + LTX-2.5 on ComfyUI. #OpenSourceHiggsfield #ComfyUI`;
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
      setReel((await api.reel(job.id)).reel);
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
      <div className="job-head">
        <strong>{job.effect.name}</strong>
        <span>
          {job.aspect} · {job.width}×{job.height} · {job.duration} s{elapsed !== undefined ? ` · rendered in ${elapsed} s` : ""}
        </span>
      </div>

      {running && (
        <>
          <div className="progress" role="progressbar" aria-valuenow={Math.round(job.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
          <div className="stage">
            <span>{job.stage}</span>
            <span>{Math.round(job.progress * 100)}%</span>
          </div>
        </>
      )}

      {job.status === "failed" && <p className="error">{job.error ?? "Render failed."}</p>}

      {job.outputs.endFrame && !job.outputs.video && (
        <div className="frames">
          <figure>
            <img src={job.input} alt="Start frame" />
            <figcaption>Start: your photo</figcaption>
          </figure>
          <figure>
            <img src={job.outputs.endFrame} alt="End frame painted by FLUX 3" />
            <figcaption>End: painted by FLUX 3. LTX-2.5 is animating the move.</figcaption>
          </figure>
        </div>
      )}

      {job.outputs.video && (
        <>
          <Compare before={job.input} after={job.outputs.video} aspect={job.aspect} />
          {job.backend === "mock" && (
            <p className="notice" style={{ margin: 0 }}>
              <strong>Mock render.</strong> This is an ffmpeg pan and dissolve. Connect a Comfy backend for the real effect.
            </p>
          )}
          <div className="actions">
            <a className="btn small" href={job.outputs.video} download={`conjure-${job.effect.id}.mp4`}>
              <IconDownload />
              MP4
            </a>
            {status?.ffmpeg &&
              (reel ? (
                <a className="btn small" href={reel} download={`conjure-${job.effect.id}-reel.mp4`}>
                  <IconDownload />
                  Before-and-after reel
                </a>
              ) : (
                <button className="btn small" disabled={reeling} onClick={makeReel}>
                  {reeling ? "Making reel" : "Make before-and-after reel"}
                </button>
              ))}
            <button className="btn small" onClick={copyCaption}>Copy caption</button>
            <a className="btn small ghost" href={`#/builder?recipe=${encodeRecipe(stripMeta(job.recipe))}`}>
              Remix effect
            </a>
            {onRerun && (
              <button className="btn small ghost" onClick={() => onRerun(job)}>
                New take
              </button>
            )}
          </div>
          {job.outputs.endFrame && (
            <details>
              <summary>End frame painted by FLUX 3</summary>
              <img src={job.outputs.endFrame} alt="End frame" style={{ marginTop: 8, borderRadius: 6, maxHeight: 360 }} />
            </details>
          )}
        </>
      )}

      <details>
        <summary>Prompts sent to the models</summary>
        <pre className="recipe">
          {job.prompts.endFrame ? `FLUX 3 end frame:\n${job.prompts.endFrame}\n\n` : ""}
          {`LTX-2.5 motion and sound:\n${job.prompts.motion}\n\nseed ${job.seed}`}
        </pre>
      </details>
    </div>
  );
}
