import type { CSSProperties, ReactNode } from "react";
import type { Settings, TaxMode } from "../types";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrame } from "../../../theme/AppTheme";

interface Props { settings: Settings; onChange: (patch: Partial<Settings>) => void; onErase: () => void; isDark: boolean }

export function SettingsView({ settings: st, onChange, onErase, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const heading: CSSProperties = { color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const body: CSSProperties = { color: p.ink, fontSize: 15, margin: 0 };
  const small: CSSProperties = { color: p.ink, fontSize: 13, opacity: 0.85, margin: `${AppSpacing.xs}px 0 0` };
  const label: CSSProperties = { display: "block", color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 4px" };
  const input: CSSProperties = {
    width: "100%", minWidth: 0, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.shell, color: p.ink,
  };
  const rule = <hr style={{ border: "none", borderTop: `2px solid ${p.ink}`, margin: `${AppSpacing.md}px 0` }} />;
  const field = (text: string, control: ReactNode) => (
    <label style={{ display: "block", minWidth: 0 }}><span style={label}>{text}</span>{control}</label>
  );
  const text = (k: "businessName" | "tin" | "address" | "minNo" | "serialNo" | "ptuNo" | "eInvoiceEndpoint") => (
    <input style={input} value={st[k]} onChange={(e) => onChange({ [k]: e.target.value })} />
  );
  const stack: CSSProperties = { display: "grid", gap: AppSpacing.sm, marginTop: AppSpacing.sm };

  return (
    <WireFrame color={p.card} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8} style={{ maxWidth: 560 }}>
      <h2 style={heading}>Business details</h2>
      <p style={body}>These print on every invoice. Sales are blocked until the name and TIN are filled in.</p>
      <div style={stack}>
        {field("Registered business name", text("businessName"))}
        {field("TIN (with branch code)", text("tin"))}
        {field("Business address", text("address"))}
        {field("Tax registration",
          <select style={input} value={st.taxMode} onChange={(e) => onChange({ taxMode: e.target.value as TaxMode })}>
            <option value="VAT">VAT-registered (12%, prices include VAT)</option>
            <option value="NON_VAT">Non-VAT (no VAT shown on invoices)</option>
          </select>)}
      </div>
      <p style={small}>Changing this applies to new sales only. Past invoices keep the tax mode they were issued under.</p>
      {rule}
      <h2 style={heading}>Machine details</h2>
      <p style={body}>Leave blank until the BIR issues them. They print on invoices and readings once filled in.</p>
      <div style={stack}>
        {field("Machine Identification Number (MIN)", text("minNo"))}
        {field("Serial number", text("serialNo"))}
        {field("Permit to Use (PTU) number", text("ptuNo"))}
      </div>
      {rule}
      <h2 style={heading}>E-invoicing</h2>
      <label style={{ display: "flex", alignItems: "center", gap: AppSpacing.sm, color: p.ink, fontWeight: 700, marginBottom: AppSpacing.sm }}>
        <input type="checkbox" checked={st.eInvoiceEnabled} onChange={(e) => onChange({ eInvoiceEnabled: e.target.checked })}
          style={{ width: 20, height: 20, accentColor: AppColors.coral }} />
        Queue new sales for e-invoice transmission
      </label>
      {field("Your relay endpoint (https://...)", text("eInvoiceEndpoint"))}
      <p style={small}>Point this at your own backend, which keeps the BIR credentials and does the actual transmission.</p>
      {rule}
      <NeoButton label="Erase everything" fontSize={14} isDark={isDark} icon={<span aria-hidden>✖</span>} onPressed={onErase} style={{ display: "inline-block" }} />
    </WireFrame>
  );
}
