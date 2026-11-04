import { EMPTY } from "./types";
import type { Store } from "./types";

const KEY = "pos-local-v2";
const OLD_KEY = "pos-session-v1"; // read once so existing business details carry over

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

type Local = Pick<Store, "sessionId" | "settings" | "cart">;

/**
 * Only the session id, business/machine/e-invoice/sheet settings and the open cart live here.
 * Items, sales, readings and the e-invoice queue come from the Google Sheet (see sheets.ts).
 */
export function load(): Store {
  let local: Partial<Local> = {};
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw) local = JSON.parse(raw) as Partial<Local>;
  } catch { /* storage unavailable or corrupt: start blank */ }
  return {
    ...EMPTY,
    sessionId: local.sessionId || uid(),
    cart: local.cart ?? [],
    settings: { ...EMPTY.settings, ...(local.settings ?? {}) },
  };
}

export function save(s: Store) {
  const local: Local = { sessionId: s.sessionId, settings: s.settings, cart: s.cart };
  try { localStorage.setItem(KEY, JSON.stringify(local)); } catch { /* ignore */ }
}