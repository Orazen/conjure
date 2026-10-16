import { useEffect, useState } from "react";
import type { Effect } from "../api.ts";
import { useApp, go } from "../state.tsx";
import { Compare } from "./Compare.tsx";

/** Shown instead of the render button on the static GitHub Pages showcase. */
export function RunYourself() {
  const { status, toast } = useApp();
  const repo = status?.githubRepo ?? "<you>/conjure";
  const cmd = `git clone https://github.com/${repo}\ncd conjure && npm install\nnpm run mock        # or set COMFY_API_KEY in .env, then: npm run dev`;
  return (
    <div className="section">
      <h4>Render your own photo</h4>
      <p className="muted" style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "18px" }}>
        This page is a static showcase. To use your own photo, run Conjure on your machine with a Comfy Cloud key, a Comfy API
        deployment, or your own GPU.
      </p>
      <pre className="recipe" style={{ color: "var(--ink)" }}>{cmd}</pre>
      <div className="actions" style={{ marginTop: 12 }}>
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
          <summary>End frame painted by FLUX 3</summary>
          <img src={effect.example.endFrame} alt="End frame" style={{ marginTop: 8, borderRadius: 6, maxHeight: 360 }} />
        </details>
      )}
    </div>
  );
}

/** Hero for the showcase: cycles through the rendered examples. */
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
    <button className="tile" style={{ position: "relative", height: 560, width: "100%" }} onClick={() => go(`/effect/${e.id}`)}>
      <video key={e.id} src={e.example!.video} poster={e.example!.input} autoPlay muted loop playsInline />
      <div className="caption">
        <div className="name">{e.name}</div>
        <div className="sub">{e.tagline}</div>
      </div>
    </button>
  );
}
