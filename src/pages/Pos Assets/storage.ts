import { EMPTY } from "./types";
import type { Store } from "./types";
import { compactOps } from "./sheets";

const KEY = "pos-local-v2";
const OLD_KEY = "pos-session-v1"; // read once so existing business details carry over

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

type Local = Pick<Store, "sessionId" | "settings" | "cart" | "items" | "sales" | "readings" | "outbox" | "nextNo" | "pending" | "lastSyncAt">;

/**
 * Everything lives here first: settings, cart, items, sales, readings, the e-invoice queue and `pending`
 * (changes the Google Sheet has not accepted yet). The sheet is a synced copy, see sheets.ts / POSPage.
 */
export function load(): Store {
  let local: Partial<Local> = {};
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw) local = JSON.parse(raw) as Partial<Local>;
  } catch { /* storage unavailable or corrupt: start blank */ }
  const sales = local.sales ?? [];
  const maxNo = sales.reduce((m, x) => Math.max(m, Number(x.no) || 0), 0);
  return {
    ...EMPTY,
    sessionId: local.sessionId || uid(),
    cart: local.cart ?? [],
    settings: { ...EMPTY.settings, ...(local.settings ?? {}) },
    items: local.items ?? [],
    sales,
    readings: local.readings ?? [],
    outbox: local.outbox ?? [],
    nextNo: Math.max(local.nextNo ?? 1, maxNo + 1),
    pending: compactOps(local.pending ?? []),
    lastSyncAt: local.lastSyncAt ?? "",
  };
}

/** Returns false when the browser refused the write (storage full or blocked). */
export function save(s: Store): boolean {
  const local: Local = {
    sessionId: s.sessionId, settings: s.settings, cart: s.cart, items: s.items, sales: s.sales,
    readings: s.readings, outbox: s.outbox, nextNo: s.nextNo, pending: s.pending, lastSyncAt: s.lastSyncAt,
  };
  try { localStorage.setItem(KEY, JSON.stringify(local)); return true; } catch { return false; }
}