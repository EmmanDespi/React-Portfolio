import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Sale, Settings, Totals } from "../types";
import { peso, r2 } from "../tax";
import { AppPalette, AppSpacing, NeoButton, NeoTag, WireFrame } from "../../../theme/AppTheme";
import { ReceiptView } from "../components/ReceiptView";

interface Props { sales: Sale[]; onVoid: (s: Sale) => void; settings: Settings; isDark: boolean }

export function SalesView({ sales, onVoid, settings, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const [open, setOpen] = useState<string | null>(null);
  const today = new Date().toDateString();
  const valid = sales.filter((x) => !x.voided && new Date(x.at).toDateString() === today);
  const sum = (k: keyof Totals) => r2(valid.reduce((a, x) => a + x.totals[k], 0));
  const voids = sales.filter((x) => x.voided && new Date(x.at).toDateString() === today).length;

  const heading: CSSProperties = { color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const card = (children: ReactNode, key?: string) => (
    <WireFrame key={key} color={p.subcard} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>{children}</WireFrame>
  );
  const stat = (label: string, value: string) =>
    card(<>
      <div style={{ color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ color: p.ink, fontSize: 22, fontWeight: 900 }}>{value}</div>
    </>, label);

  return (
    <div style={{ display: "grid", gap: AppSpacing.md }}>
      <div>
        <h2 style={heading}>Today</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: AppSpacing.md }}>
          {stat("Invoices", String(valid.length))}
          {stat("Total sales", peso(sum("gross")))}
          {settings.taxMode === "VAT" && stat("VATable sales", peso(sum("vatable")))}
          {settings.taxMode === "VAT" && stat("VAT collected", peso(sum("vat")))}
          {settings.taxMode === "VAT" && stat("VAT-exempt", peso(sum("exempt")))}
          {settings.taxMode === "VAT" && stat("Zero-rated", peso(sum("zero")))}
          {stat("Voided", String(voids))}
        </div>
      </div>

      <div>
        <h2 style={heading}>All invoices ({sales.length})</h2>
        {sales.length === 0 && card(<p style={{ color: p.ink, fontSize: 15, margin: 0 }}>No sales yet. Completed sales show up here.</p>)}
        <div style={{ display: "grid", gap: 12, alignItems: "start", gridTemplateColumns: "repeat(auto-fill, minmax(max(260px, calc((100% - 48px) / 3)), 1fr))" }}>
          {sales.map((x) => card(<>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: AppSpacing.sm, color: p.ink }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ letterSpacing: 1.5 }}>#{x.no}</strong>
                {x.voided && <NeoTag text="VOID" isDark={isDark} />}
                {!x.voided && x.zNo !== undefined && <NeoTag text={`Closed by Z-reading #${x.zNo}`} isDark={isDark} />}
              </div>
              <span style={{ fontSize: 14 }}>{new Date(x.at).toLocaleString("en-PH")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: p.ink, paddingTop:12, paddingBottom: 12}}>
            <strong style={{ textDecoration: x.voided ? "line-through" : "none" }}>{peso(x.totals.gross)}</strong>
            </div>
            {x.voided && <p style={{ color: p.ink, fontSize: 13, margin: `${AppSpacing.xs}px 0 0` }}>Voided: {x.voidReason}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, marginTop: AppSpacing.sm }}>
              <NeoButton label={open === x.id ? "Hide invoice" : "View invoice"} fontSize={14} isDark={isDark} color={p.shell} onPressed={() => setOpen(open === x.id ? null : x.id)} />
              {!x.voided && x.zNo === undefined && (
                <NeoButton label="Void" fontSize={14} isDark={isDark} icon={<span aria-hidden>✖</span>} onPressed={() => onVoid(x)} />
              )}
            </div>
            {open === x.id && <div style={{ marginTop: AppSpacing.sm }}><ReceiptView sale={x} settings={settings} isDark={isDark} /></div>}
          </>, x.id))}
        </div>
      </div>
    </div>
  );
}
