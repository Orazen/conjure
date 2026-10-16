import { useEffect, useRef, useState } from "react";
import { api } from "../api.ts";
import { useApp } from "../state.tsx";
import { IconUpload } from "./Icons.tsx";

/** Drop / paste / pick a photo. It stays loaded, so you can try effect after effect. */
export function PhotoDock() {
  const { photo, setPhoto, toast } = useApp();
  const [over, setOver] = useState(false);
  const [samples, setSamples] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.samples().then(setSamples).catch(() => undefined);
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        setPhoto(file, file.name);
        toast("Photo pasted");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [setPhoto, toast]);

  const accept = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("That isn't an image");
    if (file.size > 20 * 1024 * 1024) return toast("Photo is larger than 20 MB");
    setPhoto(file, file.name);
  };

  const useSample = async (url: string) => {
    const blob = await (await fetch(url)).blob();
    setPhoto(blob, url.split("/").pop());
  };

  return (
    <div className="dock">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => accept(e.target.files?.[0])} />
      {photo ? (
        <div className="photo-row">
          <img src={photo.url} alt="Your photo" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-label">Your photo</div>
            <p className="muted" style={{ margin: "4px 0 12px", fontSize: 13, lineHeight: "18px" }}>
              Pick any effect below. The photo stays loaded, so you can try as many as you like.
            </p>
            <div className="actions">
              <button className="btn small" onClick={() => input.current?.click()}>Change photo</button>
              <button className="btn small ghost" onClick={() => setPhoto(undefined)}>Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`drop ${over ? "over" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            accept(e.dataTransfer.files[0]);
          }}
        >
          <IconUpload />
          <strong>Drop a photo here</strong>
          <span style={{ fontSize: 13, lineHeight: "18px" }}>Click to choose a file, or paste with Cmd+V / Ctrl+V.</span>
          <span className="t-caption">A clear shot of one person, pet or object works best.</span>
        </div>
      )}
      {samples.length > 0 && (
        <div className="samples">
          <span className="t-caption">No photo handy? Try a sample:</span>
          {samples.slice(0, 6).map((s) => (
            <img key={s} src={s} alt="Sample photo" onClick={() => useSample(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
