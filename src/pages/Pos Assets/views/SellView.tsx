import type { CSSProperties, } from "react";
import type { Item, Line, Sale, Settings, Totals } from "../types";
import { peso, r2 } from "../tax";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrame, useResponsive } from "../../../theme/AppTheme";
import { TotalsView } from "../components/TotalsView";
import { ReceiptView } from "../components/ReceiptView";

interface Props {
  items: Item[]; search: string; setSearch: (v: string) => void;
  inCart: (id: string) => number; setQty: (id: string, q: number) => void;
  lines: Line[]; totals: Totals; settings: Settings;
  cash: string; setCash: (v: string) => void; msg: string;
  onCheckout: () => void; onClearCart: () => void; lastSale: Sale | null;
  isDark: boolean;
}

export function SellView(props: Props) {
  const { isDark } = props;
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const stacked = useResponsive().width < 900;
  const change = Number(props.cash) - props.totals.gross;

  const heading: CSSProperties = { color: p.ink, fontSize: 22, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const body: CSSProperties = { color: p.shadow, fontSize: 16 ,fontWeight: 500, margin: 0 };
  const input: CSSProperties = {
    width: "100%", minWidth: 0, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.shell, color: p.ink,
  };
  
  const rule = <hr style={{ border: "none", borderTop: `2px solid ${p.shadow}`, margin: `${AppSpacing.sm}px 0` }} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: stacked ? "minmax(0,1fr)" : "minmax(0,3fr) minmax(0,2fr)", gap: AppSpacing.md, alignItems: "start" }}>
     <WireFrame isDark={isDark}  height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
        <h2 style={heading}>Items</h2>
        <input style={{ ...input, marginBottom: AppSpacing.sm }} placeholder="Search by name or SKU" aria-label="Search items"
          value={props.search} onChange={(e) => props.setSearch(e.target.value)} />
        {props.items.length === 0 ? (
          <p style={body}>No items yet. Add your first item in Inventory.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: AppSpacing.sm }}>
            {props.items
              .filter((i) => (i.name + " " + i.sku).toLowerCase().includes(props.search.toLowerCase()))
              .map((i) => {
                const out = i.stock - props.inCart(i.id) <= 0;
                return (
                  <NeoButton key={i.id} color={p.chip} onPressed={() => props.setQty(i.id, props.inCart(i.id) + 1)}
                    style={{
                      cursor: out ? "not-allowed" : "pointer", opacity: out ? 0.5 : 1,
                    }}>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>{i.name}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, margin: "2px 0" }}>{peso(i.price)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{i.stock <= 0 ? "Out of stock" : `${i.stock} in stock`}</div>
                  </NeoButton>
                );
              })}
          </div>
        )}
      </WireFrame>

      <div style={{ display: "grid", gap: AppSpacing.md, minWidth: 0 }}>
        <WireFrame isDark={isDark} color={p.subcard} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
          <h2 style={heading}>Cart</h2>
          {props.lines.length === 0 ? (
            <p style={body}>Tap an item to add it.</p>
          ) : (
            <div style={{ display: "grid", gap: AppSpacing.sm }}>
              {props.lines.map((l) => (
                <div key={l.itemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: AppSpacing.sm, color: p.shadow }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, letterSpacing: 1 }}>{l.name}</div>
                    <div style={{ fontSize: 13 }}>{peso(l.price)} × {l.qty} = {peso(r2(l.price * l.qty))}</div>
                  </div>
                  <div style={{ display: "flex", gap: AppSpacing.sm }}>
                    <NeoButton label="−" width={52} fontSize={14} isDark={isDark} onPressed={() => props.setQty(l.itemId, l.qty - 1)} />
                    <NeoButton label="+" width={52} fontSize={14} isDark={isDark} color={AppColors.coral} onPressed={() => props.setQty(l.itemId, l.qty + 1)} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {rule}
          <TotalsView totals={props.totals} mode={props.settings.taxMode} isDark={isDark} />
          <label htmlFor="cash" style={{ display: "block", color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: `${AppSpacing.sm}px 0 4px` }}>Cash received</label>
          <div style={{ display: "flex", gap: AppSpacing.sm, alignItems: "center" }}>
            <input id="cash" style={input} type="number" min="0" step="0.01" value={props.cash} onChange={(e) => props.setCash(e.target.value)} />
            <NeoButton label="Exact" fontSize={14} isDark={isDark} color={AppColors.coral} onPressed={props.lines.length ? () => props.setCash(String(props.totals.gross)) : undefined} />
          </div>
          {change >= 0 && props.totals.gross > 0 && <p style={{ ...body, marginTop: AppSpacing.sm, fontWeight: 800 }}>Change: {peso(r2(change))}</p>}
          {props.msg && (
            <p role="alert" style={{ margin: `${AppSpacing.sm}px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: AppColors.coral, color: AppColors.ink, fontWeight: 700, fontSize: 14 }}>
              {props.msg}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, marginTop: AppSpacing.sm }}>
            <NeoButton label="Complete sale" fontSize={14} isDark={isDark} color={props.lines.length ? AppColors.coral : ""} onPressed={props.lines.length ? props.onCheckout : undefined} />
            <NeoButton label="Clear cart" fontSize={14} isDark={isDark} icon={<span aria-hidden>✖</span>} color={props.lines.length ? AppColors.coral : ""} onPressed={props.lines.length ? props.onClearCart : undefined} />
          </div>
        </WireFrame>
        {props.lastSale && <ReceiptView sale={props.lastSale} settings={props.settings} isDark={isDark} />}
      </div>
    </div>
  );
}
