import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Item, TaxMode, TaxType } from "../types";
import { TAX_LABEL, r2 } from "../tax";
import { AppColors, AppPalette, AppSpacing, NeoButton, NeoChip } from "../../../theme/AppTheme";

interface Props { item: Item; mode: TaxMode; onPatch: (p: Partial<Item>) => void; onDelete: () => void; isDark: boolean }

export function InventoryRow({ item, mode, onPatch, onDelete, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const [add, setAdd] = useState("");

  const label: CSSProperties = { display: "block", color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 4px",};
  const input: CSSProperties = {
    width: "100%", minWidth: 100, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.card, color: p.ink, 
  };
  const field = (text: string, control: ReactNode) => (
    <label style={{ display: "block", minWidth: 0 }}><span style={label}>{text}</span>{control}</label>
  );

  return (
    <div style={{
      border: `2px solid ${p.ink}`, borderRadius: 8, padding: AppSpacing.sm, color: p.ink,
      backgroundColor: item.stock <= 0 ? `${p.paper}44` : p.shell,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: AppSpacing.sm }}>
        <strong style={{ fontSize: 16, letterSpacing: 1,  }}>{item.name}{item.sku ? ` (${item.sku})` : ""}</strong>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {mode === "VAT" && <NeoChip label={TAX_LABEL[item.taxType]} isDark={isDark} active={true}/>}
          <NeoChip label={item.stock <= 0 ? "Out of stock" : `${item.stock} in stock`}active={true}  isDark={isDark} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", marginTop: AppSpacing.sm }}>
        {field("Price",
          <input key={item.price} style={input} type="number" min="0" step="0.01" defaultValue={item.price}
            onBlur={(e) => { const v = Number(e.target.value); if (v > 0) onPatch({ price: r2(v) }); else e.target.value = String(item.price); }} />)}
        {mode === "VAT" && field("Tax type",
          <select style={input} value={item.taxType} onChange={(e) => onPatch({ taxType: e.target.value as TaxType })}>
            {(Object.keys(TAX_LABEL) as TaxType[]).map((k) => <option key={k} value={k}>{TAX_LABEL[k]}</option>)}
          </select>)}
        {field("Add stock",
          <div style={{ display: "flex", gap: AppSpacing.sm, alignItems: "center" }}>
            <input style={input} type="number" min="1" step="1" value={add} onChange={(e) => setAdd(e.target.value)} />
            <NeoButton label="Add" fontSize={16} isDark={isDark} color={p.shell}
              onPressed={Number(add) > 0 ? () => { onPatch({ stock: item.stock + Math.floor(Number(add)) }); setAdd(""); } : undefined} />
          </div>)}
      </div>

      <div style={{ marginTop: AppSpacing.sm }}>
        <NeoButton label="Delete item" fontSize={14} isDark={isDark} icon={<span aria-hidden>✖</span>} color={AppColors.coral} onPressed={onDelete} style={{ display: "inline-block" }} />
      </div>
    </div>
  );
}
