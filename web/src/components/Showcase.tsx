import { useEffect, useState } from "react";
import type { Effect } from "../api.ts";
import { useApp, go } from "../state.tsx";
import { Compare } from "./Compare.tsx";

/** Shown instead of the render button on the static GitHub Pages showcase. */
export function RunYourself() {
  const { status, toast } = useApp();
  const repo = status?.githubRepo ?? "<you>/conjure";
  const cmd = `git clone https://github.com/${repo}\ncd conjure && npm install\nnpm run mock        # or put COMFY_API_KEY in .env and: npm run dev`;
  return (
    <div className="section">
      <h4>Render your own photo</h4>
      <p style={{ margin: "0 0 10px", color: "var(--muted)", fontSize: 14 }}>
        This is the live showcase, so every render you see was made with Conjure on open weights. To use your own photo, run Conjure
        locally. It works with a Comfy Cloud key, a Comfy API deployment, or your own GPU.
      </p>
      <pre className="recipe" style={{ background: "var(--bg-2)", padding: 12, borderRadius: 10, color: "var(--text)" }}>{cmd}</pre>
      <div className="actions" style={{ marginTop: 10 }}>
        <button
          className="btn small"
          onClick={async () => {
            await navigator.clipboard.writeText(cmd).catch(() => undefined);
            toast("Commands copied");
          }}
        >
          Copy commands
        </button>
        {status?.githubRepo && (
          <a className="btn small" href={`https://github.com/${status.githubRepo}`} target="_blank" rel="noreferrer">
            Open on GitHub
          </a>
        )}
      </div>
    </div>
  );
}

/** The example render for an effect, with the before/after slider. */
export function ExampleResult({ effect }: { effect: Effect }) {
  if (!effect.example?.video || !effect.example.input) return null;
  return (
    <div className="section job">
      <h4>Example render</h4>
      <Compare before={effect.example.input} after={effect.example.video} aspect="9:16" />
      {effect.example.endFrame && (
        <details>
          <summary>The end frame FLUX 3 painted</summary>
          <img src={effect.example.endFrame} alt="End frame" style={{ marginTop: 10, borderRadius: 10, maxHeight: 360 }} />
        </details>
      )}
    </div>
  );
}

/** Hero reel for the showcase: cycles through the rendered examples. */
export function HeroReel() {
  const { effects } = useApp();
  const withVideo = effects.filter((e) => e.example?.video);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (withVideo.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % withVideo.length), 5200);
    return () => clearInterval(t);
  }, [withVideo.length]);
  const e = withVideo[i];
  if (!e) return <RunYourself />;
  return (
    <div className="dock" style={{ display: "grid", gap: 12 }}>
      <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "9 / 16", maxHeight: 520, margin: "0 auto", background: "#000" }}>
        <video key={e.id} src={e.example!.video} poster={e.example!.input} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <button className="go" style={{ opacity: 1, transform: "none", position: "absolute", right: 10, bottom: 10 }} onClick={() => go(`/effect/${e.id}`)}>
          {e.icon} {e.name} →
        </button>
      </div>
    </div>
  );
}
