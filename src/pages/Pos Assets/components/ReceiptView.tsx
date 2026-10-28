import type { CSSProperties, ReactNode } from "react";
import type { Sale, Settings } from "../types";
import { peso, r2 } from "../tax";
import { AppColors, AppSpacing, WireFrame } from "../../../theme/AppTheme";

/** Receipt paper stays white with dark monospace text in both themes. */
export function ReceiptView({ sale, settings, isDark }: { sale: Sale; settings: Settings; isDark: boolean }) {
  const vat = sale.mode === "VAT";
  const ids = [settings.minNo && `MIN: ${settings.minNo}`, settings.serialNo && `S/N: ${settings.serialNo}`, settings.ptuNo && `PTU: ${settings.ptuNo}`].filter(Boolean).join("  ");
  const center: CSSProperties = { textAlign: "center" };
  const row = (l: ReactNode, v: ReactNode, key?: string, style?: CSSProperties) => (
    <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: AppSpacing.sm, ...style }}><span>{l}</span><span>{v}</span></div>
  );
  const dash = <hr style={{ border: "none", borderTop: `2px dashed ${AppColors.ink}`, margin: "8px 0" }} />;
  return (
    <WireFrame color={AppColors.white} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
      <div style={{ color: AppColors.ink, fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace', fontSize: 13, overflowX: "auto" }}>
        <div style={{ ...center, fontWeight: 800 }}>{settings.businessName}</div>
        <div style={center}>{settings.address}</div>
        <div style={center}>{vat ? "VAT REG TIN" : "NON-VAT REG TIN"}: {settings.tin}</div>
        {ids && <div style={center}>{ids}</div>}
        <div style={{ ...center, fontWeight: 800, margin: "6px 0" }}>SALES INVOICE{sale.voided ? " (VOID)" : ""}</div>
        {row("No.", sale.no)}
        {row("Date", new Date(sale.at).toLocaleString("en-PH"))}
        {dash}
        {sale.lines.map((l) => row(`${l.qty} × ${l.name}`, peso(r2(l.price * l.qty)), l.itemId))}
        {dash}
        {vat && (<>
          {row("VATable Sales", peso(sale.totals.vatable))}
          {row("VAT-Exempt Sales", peso(sale.totals.exempt))}
          {row("Zero-Rated Sales", peso(sale.totals.zero))}
          {row("VAT Amount", peso(sale.totals.vat))}
        </>)}
        {row("TOTAL", peso(sale.totals.gross), undefined, { fontWeight: 800 })}
        {row("Cash", peso(sale.tendered))}
        {row("Change", peso(sale.change))}
        {!vat && <p style={center}>THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX.</p>}
        <p style={{ ...center, fontSize: 11 }}>Test build. Not a BIR-accredited invoice.</p>
      </div>
    </WireFrame>
  );
}
