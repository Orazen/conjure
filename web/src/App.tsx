import { useEffect } from "react";
import { AppProvider, useApp, useRoute } from "./state.tsx";
import { EffectsPage } from "./components/EffectsPage.tsx";
import { BuilderPage } from "./components/BuilderPage.tsx";
import { GalleryPage } from "./components/GalleryPage.tsx";
import { EffectSheet } from "./components/EffectSheet.tsx";

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
      <a className="brand" href="#/" aria-label="Conjure home">
        Conjure<b>.</b>
      </a>
      <nav className="nav">
        {link("/", "Effects", "Effects", (p) => p === "/" || p.startsWith("/effect/"))}
        {link("/builder", "Effect Builder", "Builder", (p) => p.startsWith("/builder"))}
        {link("/gallery", status?.backend === "showcase" ? "Examples" : "My renders", status?.backend === "showcase" ? "Examples" : "Renders", (p) => p.startsWith("/gallery"))}
      </nav>
      <div className="spacer" />
      {status && (
        <span className={`status ${status.backend === "mock" ? "mock" : ""}`} title={status.baseUrl ?? "Renders are simulated locally"}>
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
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);
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
        <span>Conjure is MIT licensed. FLUX 3 Image Klein, LTX-2.5 and Gemma 4, open weights, on the Comfy Developer Platform.</span>
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
