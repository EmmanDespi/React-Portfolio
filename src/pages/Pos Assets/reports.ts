import type { Reading, Sale, Settings, Store, Totals } from "./types";
import { peso, r2 } from "./tax";
import { uid } from "./storage";

const W = 40;
const row = (l: string, v: string) => l + " ".repeat(Math.max(1, W - l.length - v.length)) + v;
const center = (s: string) => " ".repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s;
const rule = (c = "-") => c.repeat(W);

function header(st: Settings, vat: boolean): string[] {
  const out = [center(st.businessName), center(st.address), center(`${vat ? "VAT REG TIN" : "NON-VAT REG TIN"}: ${st.tin}`)];
  const ids = [st.minNo && `MIN: ${st.minNo}`, st.serialNo && `S/N: ${st.serialNo}`, st.ptuNo && `PTU: ${st.ptuNo}`].filter(Boolean) as string[];
  if (ids.length) out.push(center(ids.join("  ")));
  return out;
}

/* ───────── X / Z readings ───────── */

/** Builds a reading from all sales not yet closed by a Z-reading. Does not change any state. */
export function buildReading(kind: "X" | "Z", s: Store): Reading {
  const open = s.sales.filter((x) => x.zNo === undefined).sort((a, b) => a.no.localeCompare(b.no));
  const live = open.filter((x) => !x.voided);
  const voided = open.filter((x) => x.voided);
  const sum = (arr: Sale[], k: keyof Totals) => r2(arr.reduce((a, x) => a + x.totals[k], 0));
  const gross = sum(open, "gross");
  const voids = sum(voided, "gross");
  const net = r2(gross - voids);
  const zs = s.readings.filter((r) => r.kind === "Z");
  const xs = s.readings.filter((r) => r.kind === "X");
  const beg = zs.length ? zs[0].endGrandTotal : 0; // grand total only ever grows, one Z at a time
  return {
    kind, id: uid(), at: new Date().toISOString(),
    counter: kind === "Z" ? zs.length + 1 : xs.length + 1,
    resetCounter: kind === "Z" ? zs.length + 1 : zs.length,
    begInvoice: open[0]?.no ?? "", endInvoice: open[open.length - 1]?.no ?? "",
    invoiceCount: open.length, voidCount: voided.length,
    gross, voids, net,
    vatable: sum(live, "vatable"), vatExempt: sum(live, "exempt"), zeroRated: sum(live, "zero"), vat: sum(live, "vat"),
    nonVat: r2(live.filter((x) => x.mode === "NON_VAT").reduce((a, x) => a + x.totals.gross, 0)),
    begGrandTotal: beg, endGrandTotal: r2(beg + net),
  };
}

export function readingText(r: Reading, st: Settings): string {
  const z = r.kind === "Z";
  return [
    ...header(st, st.taxMode === "VAT"),
    rule(),
    center(z ? "Z-READING" : "X-READING"),
    row("Date", new Date(r.at).toLocaleString("en-PH")),
    row(z ? "Z Counter No." : "X Count No.", String(r.counter)),
    row("Reset Counter No.", String(r.resetCounter)),
    row("Beg. SI #", r.begInvoice || "-"),
    row("End. SI #", r.endInvoice || "-"),
    row("Invoices issued", String(r.invoiceCount)),
    row("Voided invoices", String(r.voidCount)),
    rule(),
    row("Gross Sales", peso(r.gross)),
    row("Less: Voids", peso(r.voids)),
    row("Net Sales", peso(r.net)),
    rule(),
    row("VATable Sales", peso(r.vatable)),
    row("VAT-Exempt Sales", peso(r.vatExempt)),
    row("Zero-Rated Sales", peso(r.zeroRated)),
    row("VAT Amount", peso(r.vat)),
    row("Non-VAT Sales", peso(r.nonVat)),
    rule(),
    row("Beginning Grand Total", peso(r.begGrandTotal)),
    row(z ? "New Grand Total" : "Present Accumulated Sales", peso(r.endGrandTotal)),
    rule(),
    center(z ? "Day closed. This report cannot be edited." : "Interim report. No totals were reset."),
  ].join("\n");
}

/* ───────── electronic journal ───────── */

export function invoiceText(x: Sale, st: Settings): string {
  const vat = x.mode === "VAT";
  return [
    ...header(st, vat),
    center(`SALES INVOICE${x.voided ? " (VOIDED)" : ""}`),
    row("No.", x.no),
    row("Date", new Date(x.at).toLocaleString("en-PH")),
    rule(),
    ...x.lines.map((l) => row(`${l.qty} x ${l.name}`, peso(r2(l.price * l.qty)))),
    rule(),
    ...(vat
      ? [row("VATable Sales", peso(x.totals.vatable)), row("VAT-Exempt Sales", peso(x.totals.exempt)),
         row("Zero-Rated Sales", peso(x.totals.zero)), row("VAT Amount", peso(x.totals.vat))]
      : []),
    row("TOTAL", peso(x.totals.gross)),
    row("Cash", peso(x.tendered)),
    row("Change", peso(x.change)),
    ...(vat ? [] : [center("NOT VALID FOR CLAIM OF INPUT TAX")]),
  ].join("\n");
}

function voidSlipText(x: Sale, st: Settings): string {
  return [
    ...header(st, x.mode === "VAT"),
    center("VOID SLIP"),
    row("Invoice No.", x.no),
    row("Voided on", new Date(x.voidedAt ?? x.at).toLocaleString("en-PH")),
    row("Amount", peso(x.totals.gross)),
    `Reason: ${x.voidReason ?? ""}`,
  ].join("\n");
}

/** Every invoice, void slip, X-reading and Z-reading in time order, as one text file. */
export function buildEJournal(s: Store): string {
  const ev: { at: string; text: string }[] = [];
  for (const x of s.sales) {
    ev.push({ at: x.at, text: invoiceText(x, s.settings) });
    if (x.voided) ev.push({ at: x.voidedAt ?? x.at, text: voidSlipText(x, s.settings) });
  }
  for (const r of s.readings) ev.push({ at: r.at, text: readingText(r, s.settings) });
  ev.sort((a, b) => a.at.localeCompare(b.at));
  const top = [center("ELECTRONIC JOURNAL"), center(`Generated ${new Date().toLocaleString("en-PH")}`), rule("=")].join("\n");
  return [top, ...ev.map((e) => e.text)].join("\n" + rule("=") + "\n") + "\n";
}

/* ───────── sales book (CSV) ───────── */

const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function salesBookCsv(sales: Sale[]): string {
  const head = ["Date", "Invoice No", "Status", "Z No", "Gross", "VATable", "VAT-Exempt", "Zero-Rated", "VAT", "Tax mode"];
  const rows = [...sales].sort((a, b) => a.no.localeCompare(b.no)).map((x) => [
    new Date(x.at).toLocaleString("en-PH"), x.no, x.voided ? "VOID" : "VALID", x.zNo ?? "",
    x.totals.gross, x.totals.vatable, x.totals.exempt, x.totals.zero, x.totals.vat, x.mode,
  ]);
  return [head, ...rows].map((r) => r.map(q).join(",")).join("\n");
}

export function download(name: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
