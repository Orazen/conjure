import { useEffect } from "react";
import { AppProvider, useApp, useRoute } from "./state.tsx";
import { EffectsPage } from "./components/EffectsPage.tsx";
import { BuilderPage } from "./components/BuilderPage.tsx";
import { GalleryPage } from "./components/GalleryPage.tsx";
import { EffectSheet } from "./components/EffectSheet.tsx";

function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.5" stopColor="#ff6ad5" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <path d="M32 6 L38.5 25.5 L58 32 L38.5 38.5 L32 58 L25.5 38.5 L6 32 L25.5 25.5 Z" fill="url(#lg)" />
    </svg>
  );
}

function TopBar({ path }: { path: string }) {
  const { status } = useApp();
  const link = (hash: string, label: string, short: string, match: (p: string) => boolean) => (
    <a href={`#${hash}`} className={match(path) ? "active" : ""}>
      <span className="long">{label}</span>
      <span className="short">{short}</span>
    </a>
  );
  return (
    <header className="topbar">
      <a className="brand" href="#/">
        <Logo />
        Conjure <small>open-source VFX</small>
      </a>
      <nav className="nav">
        {link("/", "Effects", "Effects", (p) => p === "/" || p.startsWith("/effect/"))}
        {link("/builder", "Effect Builder", "Builder", (p) => p.startsWith("/builder"))}
        {link("/gallery", status?.backend === "showcase" ? "Examples" : "My renders", status?.backend === "showcase" ? "Examples" : "Renders", (p) => p.startsWith("/gallery"))}
      </nav>
      <div className="spacer" />
      {status && (
        <span className={`pill ${status.backend === "mock" ? "mock" : ""}`} title={status.baseUrl ?? "Renders are simulated locally"}>
          <span className="dot" />
          {status.label}
        </span>
      )}
    </header>
  );
}

function Routes() {
  const { path, params } = useRoute();
  const effectId = path.startsWith("/effect/") ? decodeURIComponent(path.slice("/effect/".length)) : undefined;
  const page = path.startsWith("/builder") ? "builder" : path.startsWith("/gallery") ? "gallery" : "effects";
  useEffect(() => window.scrollTo({ top: 0 }), [page]);
  return (
    <div className="shell">
      <TopBar path={path} />
      {path.startsWith("/builder") ? (
        <BuilderPage params={params} />
      ) : path.startsWith("/gallery") ? (
        <GalleryPage />
      ) : (
        <EffectsPage />
      )}
      {effectId && <EffectSheet effectId={effectId} />}
      <footer className="footer">
        <span>
          Conjure is MIT-licensed. Runs FLUX 3 Image Klein + LTX-2.5 open weights through the Comfy Developer Platform.
        </span>
        <span>#OpenSourceHiggsfield</span>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Routes />
    </AppProvider>
  );
}
