import { useEffect, useMemo, useState } from "react";
import { api, decodeRecipe, encodeRecipe, type Effect } from "../api.ts";
import { useApp, go } from "../state.tsx";
import { EffectCard } from "./EffectCard.tsx";
import { RenderPanel } from "./RenderPanel.tsx";

type Draft = Omit<Effect, "source" | "example">;

const BLANK_TRANSFORM: Draft = {
  id: "my-effect",
  name: "My Effect",
  tagline: "Describe the effect in one line.",
  icon: "✨",
  colors: ["#a78bfa", "#1e1b4b"],
  pipeline: "transform",
  tags: [],
  subject: "the person",
  endFrame:
    "Turn {subject} into … Keep the exact same pose, framing, camera angle, background and lighting.",
  motion: "{subject} … (describe what happens, in order, and how the camera moves)",
  sound: "",
  duration: 5,
  author: "",
  version: 1,
};

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "my-effect";

function clean(d: Draft): Draft {
  const out: Draft = { ...d, tags: d.tags.filter(Boolean) };
  if (!out.sound) delete out.sound;
  if (out.pipeline === "motion") delete out.endFrame;
  if (!out.author) out.author = "anonymous";
  return out;
}

export function BuilderPage({ params }: { params: URLSearchParams }) {
  const { effects, status, toast, reloadEffects } = useApp();
  const [draft, setDraft] = useState<Draft>(BLANK_TRANSFORM);
  const [idTouched, setIdTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [testing, setTesting] = useState(false);

  // Load a shared recipe from the URL (#/builder?recipe=...)
  useEffect(() => {
    const r = params.get("recipe");
    if (!r) return;
    try {
      const loaded = decodeRecipe(r) as Draft;
      setDraft({ ...BLANK_TRANSFORM, ...loaded, sound: loaded.sound ?? "" });
      setIdTouched(true);
      toast(`Loaded "${loaded.name}"`);
    } catch {
      toast("That effect link is broken");
    }
  }, [params.get("recipe")]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipe = useMemo(() => clean(draft), [draft]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await api.validate(recipe).catch(() => ({ ok: false, error: "server unreachable" }));
      setError(r.ok ? undefined : r.error);
    }, 250);
    return () => clearTimeout(t);
  }, [recipe]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const builtinIds = new Set(effects.filter((e) => e.source === "builtin").map((e) => e.id));
  const idClash = builtinIds.has(recipe.id);

  const json = JSON.stringify(recipe, null, 2);
  const shareLink = `${window.location.origin}${window.location.pathname}#/builder?recipe=${encodeRecipe(recipe)}`;
  const repo = status?.githubRepo;
  const prLink = repo
    ? `https://github.com/${repo}/new/main/effects?filename=${encodeURIComponent(recipe.id + ".json")}&value=${encodeURIComponent(json + "\n")}`
    : undefined;

  const save = async () => {
    try {
      await api.saveEffect(recipe);
      await reloadEffects();
      toast("Saved to My effects");
      go(`/effect/${recipe.id}`);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json + "\n"], { type: "application/json" }));
    a.download = `${recipe.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <section style={{ padding: "28px 0 4px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 48, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Effect <em style={{ background: "var(--spell)", WebkitBackgroundClip: "text", color: "transparent" }}>Builder</em>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 720, margin: 0 }}>
          An effect is a small recipe: the final look, the motion, and the sound. Write one, test it on your photo, then
          share it as a link or as a pull request that adds it for everyone. You never touch a node graph.
        </p>
      </section>

      <div className="builder">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="section">
            <h4>Start from</h4>
            <div className="row">
              <div className="field">
                <select
                  aria-label="Start from an existing effect"
                  value=""
                  onChange={(e) => {
                    const src = effects.find((x) => x.id === e.target.value);
                    if (!src) return;
                    const { source: _s, example: _e, ...rest } = src;
                    setDraft({ ...rest, id: `${src.id}-remix`, name: `${src.name} Remix`, sound: rest.sound ?? "", author: "" });
                    setIdTouched(true);
                  }}
                >
                  <option value="">Remix an existing effect…</option>
                  {effects.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.icon} {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn small" onClick={() => (setDraft(BLANK_TRANSFORM), setIdTouched(false))}>Blank</button>
            </div>
          </div>

          <div className="section">
            <h4>Identity</h4>
            <div className="row">
              <div className="field" style={{ flex: "0 0 70px", minWidth: 70 }}>
                <label htmlFor="icon">Icon</label>
                <input id="icon" value={draft.icon} maxLength={8} onChange={(e) => set("icon", e.target.value)} style={{ textAlign: "center", fontSize: 20 }} />
              </div>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={draft.name}
                  maxLength={40}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, id: idTouched ? d.id : slug(e.target.value) }))}
                />
              </div>
              <div className="field">
                <label htmlFor="id">ID (file name)</label>
                <input id="id" value={draft.id} onChange={(e) => (setIdTouched(true), set("id", slug(e.target.value)))} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="tagline">Tagline</label>
                <input id="tagline" value={draft.tagline} maxLength={140} onChange={(e) => set("tagline", e.target.value)} />
              </div>
              <div className="field" style={{ flex: "0 0 auto" }}>
                <label>Colours</label>
                <div className="swatches">
                  <input type="color" aria-label="Colour 1" value={draft.colors[0]} onChange={(e) => set("colors", [e.target.value, draft.colors[1]])} />
                  <input type="color" aria-label="Colour 2" value={draft.colors[1]} onChange={(e) => set("colors", [draft.colors[0], e.target.value])} />
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <h4>How it works</h4>
            <div className="seg" role="group" aria-label="Pipeline" style={{ marginBottom: 12 }}>
              <button className={draft.pipeline === "transform" ? "on" : ""} onClick={() => set("pipeline", "transform")}>
                Transform · FLUX 3 → LTX-2.5
              </button>
              <button className={draft.pipeline === "motion" ? "on" : ""} onClick={() => set("pipeline", "motion")}>
                Motion · LTX-2.5
              </button>
            </div>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13.5 }}>
              {draft.pipeline === "transform"
                ? "Transform effects end somewhere new. FLUX 3 paints the final frame from your photo, then LTX-2.5 animates the change from the first frame to the last."
                : "Motion effects keep your photo as the first frame, and LTX-2.5 animates whatever happens next: particles, camera moves, superpowers."}
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="subj">Default subject</label>
              <input id="subj" value={draft.subject} maxLength={60} onChange={(e) => set("subject", e.target.value)} />
              <span className="hint">
                Write <code>{"{subject}"}</code> in the prompts below. People can change it when they render, for example to "my cat".
              </span>
            </div>
            {draft.pipeline === "transform" && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="end">Final frame (FLUX 3 edit instruction)</label>
                <textarea id="end" value={draft.endFrame ?? ""} onChange={(e) => set("endFrame", e.target.value)} />
                <span className="hint">Describe the end state concretely, then say what should stay the same.</span>
              </div>
            )}
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="motion">Motion (LTX-2.5 prompt)</label>
              <textarea id="motion" value={draft.motion} onChange={(e) => set("motion", e.target.value)} style={{ minHeight: 130 }} />
              <span className="hint">Describe what happens, in order. Include the camera move and the lighting.</span>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="sound">Sound</label>
              <input id="sound" value={draft.sound ?? ""} onChange={(e) => set("sound", e.target.value)} placeholder="e.g. a crackling whoosh and a deep boom" />
              <span className="hint">LTX-2.5 generates the soundtrack together with the video.</span>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="tags">Tags</label>
                <input id="tags" value={draft.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim().toLowerCase()).slice(0, 8))} />
              </div>
              <div className="field" style={{ flex: "0 0 140px", minWidth: 140 }}>
                <label htmlFor="bdur">Default length: {draft.duration}s</label>
                <input id="bdur" type="range" min={3} max={8} value={draft.duration} onChange={(e) => set("duration", Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="author">Author</label>
                <input id="author" value={draft.author} maxLength={60} placeholder="your name or @handle" onChange={(e) => set("author", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="preview">
          <div style={{ maxWidth: 260 }}>
            <EffectCard effect={recipe as Effect} onOpen={() => setTesting(true)} />
          </div>
          {error && <div className="error">{error}</div>}
          {idClash && <div className="note">"{recipe.id}" is already a built-in effect. Change the ID before you save.</div>}
          <div className="actions">
            <button className="btn primary" disabled={!!error} onClick={() => setTesting(true)}>Test on my photo</button>
            <button className="btn" disabled={!!error || idClash} onClick={save}>Save to My effects</button>
          </div>
          <div className="section">
            <h4>Share</h4>
            <div className="actions">
              <button
                className="btn small"
                disabled={!!error}
                onClick={async () => {
                  await navigator.clipboard.writeText(shareLink).catch(() => undefined);
                  toast("Effect link copied. Anyone running Conjure can open it.");
                }}
              >
                Copy effect link
              </button>
              <button className="btn small" disabled={!!error} onClick={download}>Download .json</button>
              {prLink ? (
                <a className={`btn small ${error ? "disabled" : ""}`} href={prLink} target="_blank" rel="noreferrer">
                  Submit to community (GitHub PR)
                </a>
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--faint)" }}>
                  Set CONJURE_GITHUB_REPO to enable one-click pull requests.
                </span>
              )}
            </div>
            <details style={{ marginTop: 12 }}>
              <summary>Recipe JSON</summary>
              <pre className="recipe">{json}</pre>
            </details>
          </div>
        </div>
      </div>

      {testing && !error && (
        <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Test render</h2>
          <RenderPanel key={json} effect={recipe as Effect} unsaved />
        </div>
      )}
    </>
  );
}
