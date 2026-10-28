import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { TaxMode, TaxType } from "../types";
import { TAX_LABEL } from "../tax";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrame } from "../../../theme/AppTheme";

interface Props {
  onAdd: (n: string, sku: string, p: number, t: TaxType, st: number) => void;
  mode: TaxMode;
  isDark: boolean;
}

export function AddItemForm({ onAdd, mode, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [tax, setTax] = useState<TaxType>("VATABLE");
  const [err, setErr] = useState("");

  const submit = () => {
    const pr = Number(price), st = Number(stock || 0);
    if (!name.trim()) return setErr("Enter an item name.");
    if (!(pr > 0)) return setErr("Enter a selling price greater than zero.");
    if (!Number.isInteger(st) || st < 0) return setErr("Opening stock must be a whole number, 0 or more.");
    onAdd(name, sku, pr, mode === "VAT" ? tax : "VATABLE", st);
    setName(""); setSku(""); setPrice(""); setStock(""); setTax("VATABLE"); setErr("");
  };

  const heading: CSSProperties = { color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const label: CSSProperties = { display: "block", color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 4px" };
  const input: CSSProperties = {
    width: "100%", minWidth: 0, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.shell, color: p.ink,
  };
  const field = (text: string, control: ReactNode) => (
    <label style={{ display: "block", minWidth: 0 }}><span style={label}>{text}</span>{control}</label>
  );

  return (
    <WireFrame color={p.subcard} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
      <h2 style={heading}>Add item</h2>
      <div style={{ display: "grid", gap: AppSpacing.sm, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {field("Name", <input style={input} value={name} onChange={(e) => setName(e.target.value)} />)}
        {field("SKU (optional)", <input style={input} value={sku} onChange={(e) => setSku(e.target.value)} />)}
        {field(mode === "VAT" ? "Price (VAT included)" : "Price",
          <input style={input} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />)}
        {field("Opening stock", <input style={input} type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />)}
        {mode === "VAT" && field("Tax type",
          <select style={input} value={tax} onChange={(e) => setTax(e.target.value as TaxType)}>
            {(Object.keys(TAX_LABEL) as TaxType[]).map((k) => <option key={k} value={k}>{TAX_LABEL[k]}</option>)}
          </select>)}
      </div>
      {err && (
        <p role="alert" style={{ margin: `${AppSpacing.sm}px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: AppColors.coral, color: AppColors.ink, fontWeight: 700, fontSize: 14 }}>
          {err}
        </p>
      )}
      <div style={{ marginTop: AppSpacing.sm }}>
        <NeoButton label="Add item" fontSize={14} isDark={isDark} color={p.shell} onPressed={submit} style={{ display: "inline-block" }} />
      </div>
    </WireFrame>
  );
}
