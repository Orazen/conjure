import { useEffect, useState } from "react";
import { api, isVideo, type Job } from "../api.ts";
import { JobView } from "./JobView.tsx";
import { useApp } from "../state.tsx";

export function GalleryPage() {
  const [jobs, setJobs] = useState<Job[]>();
  const [open, setOpen] = useState<Job>();
  const { status } = useApp();
  const showcase = status?.backend === "showcase";

  useEffect(() => {
    api.jobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  if (!jobs) return null;
  return (
    <>
      <div className="toolbar">
        <h2>{showcase ? "Example renders" : "My renders"}</h2>
        <span className="tag">{jobs.length}</span>
        <div className="spacer" />
        <span style={{ color: "var(--faint)", fontSize: 13 }}>
          {showcase ? "Rendered with Conjure: FLUX 3 + LTX-2.5, open weights." : "Saved in your data/outputs folder."}
        </span>
      </div>
      {open && (
        <div style={{ marginBottom: 20 }}>
          <div className="actions" style={{ marginBottom: 10 }}>
            <button className="btn small" onClick={() => setOpen(undefined)}>← Back to all renders</button>
          </div>
          <JobView key={open.id} initial={open} />
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="empty">
          Nothing rendered yet. <a href="#/">Pick an effect</a> to get started.
        </div>
      ) : (
        <div className="grid">
          {jobs.map((j) => (
            <button key={j.id} className="card jobcard" onClick={() => (setOpen(j), window.scrollTo({ top: 0, behavior: "smooth" }))}>
              <div className="media">
                {j.outputs.video && isVideo(j.outputs.video) ? (
                  <video src={j.outputs.video} poster={j.input} muted loop playsInline onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                ) : (
                  <img src={j.outputs.endFrame ?? j.input} alt="" />
                )}
                <div className="badge">
                  <span>{j.status === "succeeded" ? j.effect.name : j.status}</span>
                </div>
              </div>
              <div className="body">
                <h3>
                  {j.effect.icon} {j.effect.name}
                </h3>
                <p>
                  {new Date(j.createdAt).toLocaleString()} · {j.backend}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
