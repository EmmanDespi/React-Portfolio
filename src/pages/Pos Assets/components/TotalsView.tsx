import type { ReactNode } from "react";
import type { TaxMode, Totals } from "../types";
import { peso } from "../tax";
import { AppColors, AppPalette, NeoRows } from "../../../theme/AppTheme";

export function TotalsView({ totals, mode, isDark }: { totals: Totals; mode: TaxMode; isDark: boolean }) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const rows: [string, ReactNode][] = [];
  if (mode === "VAT") {
    rows.push(["VATable sales", peso(totals.vatable)], ["VAT-exempt sales", peso(totals.exempt)],
      ["Zero-rated sales", peso(totals.zero)], ["VAT (12%)", peso(totals.vat)]);
  }
  rows.push(["Total", <span key="t" style={{color:p.ink, fontSize: 20, fontWeight: 900 }}>{peso(totals.gross)}</span>]);
  return <NeoRows rows={rows} isDark={isDark} />;
}
