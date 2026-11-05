import type { Item, Line, Op, OutboxItem, Reading, Sale, Settings, Store, TaxMode, TaxType } from "./types";
export type { Op };

/**
 * Talks to the Google Apps Script web app in Code.gs, which is bound to YOUR sheet.
 * One tab per group of data. Every row has an `id` column, which is how rows are updated or deleted.
 * All cells are stored as text; numbers and booleans are converted here.
 */
export const SHEET = { items: "Items", sales: "Sales", lines: "SaleLines", readings: "Readings", outbox: "Outbox" } as const;

type R = Record<string, string>;

export const put = (sheet: string, row: R, unique?: string): Op => ({ op: "put", sheet, row, ...(unique ? { unique } : {}) });
export const del = (sheet: string, id: string): Op => ({ op: "del", sheet, id });

/**
 * Squashes a queue of writes: for each row only the newest write is kept (a row edited 5 times is sent once).
 * Safe to resend: puts replace by id and deleting a missing row does nothing.
 */
export function compactOps(ops: Op[]): Op[] {
  const out: (Op | null)[] = [];
  const at = new Map<string, number>();
  for (const o of ops) {
    const key = `${o.sheet}|${o.op === "put" ? o.row.id : o.id}`;
    const prevIdx = at.get(key);
    let next: Op = o;
    if (prevIdx !== undefined) {
      const prev = out[prevIdx];
      if (prev && prev.op === "put" && o.op === "put" && prev.unique && !o.unique) next = { ...o, unique: prev.unique };
      out[prevIdx] = null;
    }
    at.set(key, out.length);
    out.push(next);
  }
  return out.filter((x): x is Op => x !== null);
}

/* ───────── transport ───────── */

async function call<T>(st: Settings, body: object): Promise<T> {
  const url = st.sheetsUrl.trim();
  if (!url || !st.sheetsToken.trim()) throw new Error("Sheet link or token is missing");
  // text/plain keeps this a "simple" request, so the browser doesn't send a CORS preflight that Apps Script can't answer.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...body, token: st.sheetsToken.trim() }),
  });
  if (!res.ok) throw new Error(`Sheet server replied ${res.status}`);
  let out: { ok: boolean; error?: string };
  try { out = await res.json(); } catch { throw new Error("Unexpected reply. Check that the link is the web app /exec link."); }
  if (!out.ok) throw new Error(out.error || "Sheet error");
  return out as T;
}

export const sendOps = (st: Settings, ops: Op[]) => call(st, { action: "batch", ops });

/* ───────── value helpers ───────── */

const s = (v: unknown): string => (v === undefined || v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
const n = (v: string | undefined) => Number(v) || 0;
const b = (v: string | undefined) => v === "TRUE";

/* ───────── object → row ───────── */

export const itemRow = (i: Item, sid: string): R => ({
  id: i.id, name: i.name, sku: i.sku, price: s(i.price), taxType: i.taxType, stock: s(i.stock),
  lastSession: sid, updatedAt: new Date().toISOString(),
});

export const saleRow = (x: Sale, sid: string): R => ({
  id: x.id, no: x.no, at: x.at,
  gross: s(x.totals.gross), vatable: s(x.totals.vatable), vat: s(x.totals.vat), exempt: s(x.totals.exempt), zero: s(x.totals.zero),
  tendered: s(x.tendered), change: s(x.change), mode: x.mode,
  voided: s(x.voided), voidReason: s(x.voidReason), voidedAt: s(x.voidedAt), zNo: s(x.zNo),
  sessionId: x.sessionId ?? sid,
});

export const lineRows = (x: Sale): R[] =>
  x.lines.map((l) => ({
    id: `${x.id}|${l.itemId}`, saleId: x.id, no: x.no, itemId: l.itemId, name: l.name,
    price: s(l.price), qty: s(l.qty), taxType: l.taxType,
  }));

export const readingRow = (r: Reading, sid: string): R => ({
  id: r.id, kind: r.kind, at: r.at, counter: s(r.counter), resetCounter: s(r.resetCounter),
  begInvoice: r.begInvoice, endInvoice: r.endInvoice, invoiceCount: s(r.invoiceCount), voidCount: s(r.voidCount),
  gross: s(r.gross), voids: s(r.voids), net: s(r.net),
  vatable: s(r.vatable), vatExempt: s(r.vatExempt), zeroRated: s(r.zeroRated), vat: s(r.vat), nonVat: s(r.nonVat),
  begGrandTotal: s(r.begGrandTotal), endGrandTotal: s(r.endGrandTotal), sessionId: sid,
});

export const outboxRow = (o: OutboxItem, sid: string): R => ({
  id: o.saleId, saleId: o.saleId, no: o.no, status: o.status, attempts: s(o.attempts),
  lastError: s(o.lastError), sentAt: s(o.sentAt), sessionId: sid,
});

/* ───────── row → object ───────── */

const parseItem = (r: R): Item => ({ id: r.id, name: r.name, sku: r.sku, price: n(r.price), taxType: r.taxType as TaxType, stock: n(r.stock) });

const parseLine = (r: R): Line => ({ itemId: r.itemId, name: r.name, price: n(r.price), qty: n(r.qty), taxType: r.taxType as TaxType });

const parseSale = (r: R, lines: Line[]): Sale => ({
  id: r.id, no: r.no, at: r.at, lines,
  totals: { gross: n(r.gross), vatable: n(r.vatable), vat: n(r.vat), exempt: n(r.exempt), zero: n(r.zero) },
  tendered: n(r.tendered), change: n(r.change), mode: r.mode as TaxMode,
  voided: b(r.voided), voidReason: r.voidReason || undefined, voidedAt: r.voidedAt || undefined,
  zNo: r.zNo ? Number(r.zNo) : undefined, sessionId: r.sessionId || undefined,
});

const READING_NUMS = ["counter", "resetCounter", "invoiceCount", "voidCount", "gross", "voids", "net",
  "vatable", "vatExempt", "zeroRated", "vat", "nonVat", "begGrandTotal", "endGrandTotal"] as const;

const parseReading = (r: R): Reading => {
  const out: Record<string, unknown> = { kind: r.kind, id: r.id, at: r.at, begInvoice: r.begInvoice, endInvoice: r.endInvoice };
  for (const k of READING_NUMS) out[k] = n(r[k]);
  return out as unknown as Reading;
};

const parseOutbox = (r: R): OutboxItem => ({
  saleId: r.saleId || r.id, no: r.no, status: r.status as OutboxItem["status"], attempts: n(r.attempts),
  lastError: r.lastError || undefined, sentAt: r.sentAt || undefined,
});

/* ───────── load everything ───────── */

export type Remote = Pick<Store, "items" | "sales" | "readings" | "outbox" | "nextNo">;

export async function loadAll(st: Settings): Promise<Remote> {
  const { sheets } = await call<{ sheets: Record<string, R[]> }>(st, { action: "load" });
  const rows = (name: string) => (sheets[name] ?? []).filter((r) => r.id);

  const linesBySale = new Map<string, Line[]>();
  for (const r of rows(SHEET.lines)) {
    const list = linesBySale.get(r.saleId) ?? [];
    list.push(parseLine(r));
    linesBySale.set(r.saleId, list);
  }

  const sales = rows(SHEET.sales).map((r) => parseSale(r, linesBySale.get(r.id) ?? [])).sort((a, c) => c.no.localeCompare(a.no));
  const readings = rows(SHEET.readings).map(parseReading).sort((a, c) => c.at.localeCompare(a.at));
  const outbox = rows(SHEET.outbox).map(parseOutbox).sort((a, c) => c.no.localeCompare(a.no));
  const items = rows(SHEET.items).map(parseItem);
  const nextNo = sales.reduce((m, x) => Math.max(m, Number(x.no) || 0), 0) + 1;

  return { items, sales, readings, outbox, nextNo };
}