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
        <h2 className="t-section">{showcase ? "Example renders" : "Your renders"}</h2>
        <span className="t-caption">
          {jobs.length} {jobs.length === 1 ? "render" : "renders"} ·{" "}
          {showcase ? "made with Conjure on FLUX 3 and LTX-2.5, open weights" : "saved in data/outputs"}
        </span>
      </div>
      {open && (
        <div style={{ marginBottom: 32 }}>
          <div className="actions" style={{ marginBottom: 12 }}>
            <button className="btn small" onClick={() => setOpen(undefined)}>Back to all renders</button>
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
          {jobs.map((j, i) => (
            <button
              key={j.id}
              className={`tile ${i % 5 === 0 ? "tall" : ""}`}
              onClick={() => (setOpen(j), window.scrollTo({ top: 0, behavior: "smooth" }))}
            >
              {j.outputs.video && isVideo(j.outputs.video) ? (
                <video
                  src={j.outputs.video}
                  poster={j.input}
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
              ) : (
                <img src={j.outputs.endFrame ?? j.input} alt="" />
              )}
              <div className="caption">
                <div className="name">{j.effect.name}</div>
                <div className="sub">
                  {j.status === "succeeded" ? new Date(j.createdAt).toLocaleDateString() : j.status} · {j.backend}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
