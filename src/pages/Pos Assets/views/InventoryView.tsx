import type { Item, TaxMode, TaxType } from "../types";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrame } from "../../../theme/AppTheme";
import { AddItemForm } from "../components/AddItemForm";
import { InventoryRow } from "../components/InventoryRow";
import type { CSSProperties } from "react";


interface Props {
  items: Item[];
  search: string;
  setSearch: (v: string) => void;
  mode: TaxMode;
  onAdd: (...args: any[]) => void;
  onPatch: (...args: any[]) => void;
  onDelete: (...args: any[]) => void;
  isDark: boolean;
}


export function InventoryView({ items, mode, isDark, onAdd, onPatch, onDelete, search, setSearch }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const input: CSSProperties = {
      width: "100%", minWidth: 0, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
      padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.shell, color: p.ink,
    };
  return (
    <div style={{ display: "grid", gap: AppSpacing.md }}>
      <AddItemForm onAdd={onAdd} mode={mode} isDark={isDark} />
      <WireFrame color={p.card} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
        <h2 style={{ color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` }}>Stock ({items.length})</h2>
        {items.length === 0 && <p style={{ color: p.ink, fontSize: 15, margin: 0 }}>Nothing here yet. Add an item above to start selling.</p>}
        <div style={{ position: "relative", marginBottom: AppSpacing.sm }}>
          <input
            style={{
              ...input,
              paddingRight: 40, 
            }}
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />


          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 12,
                top: "45%",
                transform: "translateY(-45%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: p.ink,
                fontSize: 18,
                fontWeight: 900,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {/* Grid, never more than 5 per row: each column is at least 240px AND at least a fifth of the width. */}
        <div style={{ display: "grid", gap: 12, alignItems: "start", gridTemplateColumns: "repeat(auto-fill, minmax(max(260px, calc((100% - 48px) / 5)), 1fr))" }}>
        {items
          .filter((item) =>
            [
              item.name,
              item.sku,
              item.stock.toString(),
              item.price.toString(),
            ]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              mode={mode}
              onPatch={(patch) => onPatch(item.id, patch)}
              onDelete={() => { if (window.confirm(`Delete "${item.name}"? Past sales keep their records.`)) onDelete(item.id); }}
              isDark={isDark}
            />
          ))}
        </div>
      </WireFrame>
    </div>
  );
}