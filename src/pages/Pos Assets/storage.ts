import { EMPTY } from "./types";
import type { Store } from "./types";

const KEY = "pos-session-v1";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

/** Older saved sessions are merged onto EMPTY so newly added fields exist. */
export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>;
      return { ...EMPTY, ...p, settings: { ...EMPTY.settings, ...(p.settings ?? {}) } };
    }
  } catch { /* storage unavailable or corrupt: start blank */ }
  return EMPTY;
}

export function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
