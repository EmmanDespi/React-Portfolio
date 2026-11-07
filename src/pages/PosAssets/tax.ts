import type { Line, TaxMode, TaxType, Totals } from "./types";

export const VAT_RATE = 0.12;

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const peso = (n: number) =>
  "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const TAX_LABEL: Record<TaxType, string> = { VATABLE: "VATable (12%)", EXEMPT: "VAT-exempt", ZERO: "Zero-rated" };

/* Prices are VAT-inclusive (standard PH retail). VAT is backed out of the VATable total. */
export function calc(lines: Line[], mode: TaxMode): Totals {
  let vg = 0, ex = 0, ze = 0, all = 0;
  for (const l of lines) {
    const g = l.price * l.qty;
    all += g;
    if (l.taxType === "VATABLE") vg += g;
    else if (l.taxType === "EXEMPT") ex += g;
    else ze += g;
  }
  if (mode === "NON_VAT") return { gross: r2(all), vatable: 0, vat: 0, exempt: 0, zero: 0 };
  const vatable = r2(vg / (1 + VAT_RATE));
  return { gross: r2(vg + ex + ze), vatable, vat: r2(vg - vatable), exempt: r2(ex), zero: r2(ze) };
}
