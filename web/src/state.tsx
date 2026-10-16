import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Effect, type Status } from "./api.ts";

interface Photo {
  blob: Blob;
  url: string;
  name: string;
}

interface AppState {
  status?: Status;
  effects: Effect[];
  reloadEffects: () => Promise<void>;
  photo?: Photo;
  setPhoto: (blob: Blob | undefined, name?: string) => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>();
  const [effects, setEffects] = useState<Effect[]>([]);
  const [photo, setPhotoState] = useState<Photo>();
  const [toastMsg, setToastMsg] = useState<string>();

  const reloadEffects = useCallback(async () => setEffects(await api.effects()), []);
  useEffect(() => {
    api.status().then(setStatus).catch(() => undefined);
    reloadEffects().catch(() => undefined);
  }, [reloadEffects]);

  const setPhoto = useCallback((blob: Blob | undefined, name = "photo") => {
    setPhotoState((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return blob ? { blob, url: URL.createObjectURL(blob), name } : undefined;
    });
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? undefined : m)), 2400);
  }, []);

  const value = useMemo(
    () => ({ status, effects, reloadEffects, photo, setPhoto, toast }),
    [status, effects, reloadEffects, photo, setPhoto, toast],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

/** Tiny hash router: #/, #/builder, #/gallery, #/effect/<id>, #/builder?recipe=... */
export function useRoute(): { path: string; params: URLSearchParams } {
  const read = () => {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [path, query = ""] = raw.split("?");
    return { path: path || "/", params: new URLSearchParams(query) };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (hash: string) => {
  window.location.hash = hash;
};
