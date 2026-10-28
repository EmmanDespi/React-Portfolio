import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { EMPTY } from "./Pos Assets/types";
import type { Item, Line, Reading, Sale, Settings, Store, TaxType } from "./Pos Assets/types";
import { calc, r2 } from "./Pos Assets/tax";
import { load, save, uid } from "./Pos Assets/storage";
import { buildReading } from "./Pos Assets/reports";
import { httpTransmitter, toPayload } from "./Pos Assets/einvoice";
import { SellView } from "./Pos Assets/views/SellView";
import { InventoryView } from "./Pos Assets/views/InventoryView";
import { SalesView } from "./Pos Assets/views/SalesView";
import { ReportsView } from "./Pos Assets/views/ReportsView";
import { SettingsView } from "./Pos Assets/views/SettingsView";
import { FloatingButton } from "../theme/FloatingButton";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrameFrosted, useResponsive } from "../theme/AppTheme";
import { useAppTheme } from "../theme/ThemeContext";

type Tab = "sell" | "inventory" | "sales" | "reports" | "settings";
const TABS: [Tab, string][] = [["sell", "Sell"], ["inventory", "Inventory"], ["sales", "Sales"], ["reports", "Reports"], ["settings", "Settings"]];

/** Shell only: owns the saved state and every action that changes it. Screens live in ./views. */
export default function POSPage() {
  const [s, setS] = useState<Store>(load);
  const [tab, setTab] = useState<Tab>("sell");
  const [search, setSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [cash, setCash] = useState("");
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  // Same dark-mode setup as HomePage: start from the system scheme, toggle with NeoSwitch.
  const { isDark } = useAppTheme();
  const responsive = useResponsive();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const shellWidth = responsive.isLargeDesktop ? responsive.width * 0.7 : responsive.dashboardWidth;

  useEffect(() => { save(s); }, [s]);
  useEffect(() => {
    if (s.cart.length === 0) setCash("");
  }, [s.cart.length]);

  const lines: Line[] = useMemo(
    () =>
      s.cart.flatMap((c) => {
        const it = s.items.find((i) => i.id === c.itemId);
        return it ? [{ itemId: it.id, name: it.name, price: it.price, qty: c.qty, taxType: it.taxType }] : [];
      }),
    [s.cart, s.items]
  );
  const totals = useMemo(() => calc(lines, s.settings.taxMode), [lines, s.settings.taxMode]);

  /* ── settings ── */
  const patchSettings = (patch: Partial<Settings>) => setS((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  /* ── inventory ── */
  const addItem = (name: string, sku: string, price: number, taxType: TaxType, stock: number) =>
    setS((p) => ({ ...p, items: [...p.items, { id: uid(), name: name.trim(), sku: sku.trim(), price: r2(price), taxType, stock }] }));
  const patchItem = (id: string, patch: Partial<Item>) =>
    setS((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const deleteItem = (id: string) =>
    setS((p) => ({ ...p, items: p.items.filter((i) => i.id !== id), cart: p.cart.filter((c) => c.itemId !== id) }));

  /* ── cart ── */
  const inCart = (id: string) => s.cart.find((c) => c.itemId === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) =>
    setS((p) => {
      const it = p.items.find((i) => i.id === id);
      if (!it) return p;
      const q = Math.min(qty, it.stock);
      if (lastId) {
        setLastId(null);
      }
      if (q <= 0) return { ...p, cart: p.cart.filter((c) => c.itemId !== id) };
      const exists = p.cart.some((c) => c.itemId === id);
      return { ...p, cart: exists ? p.cart.map((c) => (c.itemId === id ? { ...c, qty: q } : c)) : [...p.cart, { itemId: id, qty: q }] };
    });

  /* ── checkout ── */
  function checkout() {
    setMsg("");
    const { businessName, tin } = s.settings;
    if (!businessName.trim() || !tin.trim()) return setMsg("Add your business name and TIN in Settings before selling.");
    if (!lines.length) return setMsg("The cart is empty.");
    const tendered = Number(cash);
    if (!(tendered >= totals.gross)) return setMsg("Cash received is less than the total.");
    const sale: Sale = {
      id: uid(), no: String(s.nextNo).padStart(8, "0"), at: new Date().toISOString(), lines, totals,
      tendered: r2(tendered), change: r2(tendered - totals.gross), mode: s.settings.taxMode, voided: false,
    };
    setS((p) => ({
      ...p,
      items: p.items.map((it) => {
        const l = lines.find((x) => x.itemId === it.id);
        return l ? { ...it, stock: it.stock - l.qty } : it;
      }),
      sales: [sale, ...p.sales], cart: [], nextNo: p.nextNo + 1,
      outbox: p.settings.eInvoiceEnabled ? [{ saleId: sale.id, no: sale.no, status: "PENDING", attempts: 0 }, ...p.outbox] : p.outbox,
    }));
    setCash("");
    setLastId(sale.id);
  }

  /* A void keeps the record, returns the stock, and cancels any unsent e-invoice. Closed days can't be voided. */
  function voidSale(sale: Sale) {
    if (sale.zNo !== undefined) return;
    const reason = window.prompt(`Reason for voiding invoice ${sale.no}?`);
    if (!reason || !reason.trim()) return;
    setS((p) => ({
      ...p,
      items: p.items.map((it) => {
        const l = sale.lines.find((x) => x.itemId === it.id);
        return l ? { ...it, stock: it.stock + l.qty } : it;
      }),
      sales: p.sales.map((x) => (x.id === sale.id ? { ...x, voided: true, voidReason: reason.trim(), voidedAt: new Date().toISOString() } : x)),
      outbox: p.outbox.map((o) => (o.saleId === sale.id && o.status !== "SENT" ? { ...o, status: "CANCELLED" } : o)),
    }));
  }

  /* ── X / Z readings ── */
  function takeReading(kind: "X" | "Z"): Reading {
    const r = buildReading(kind, s);
    setS((p) => ({
      ...p,
      readings: [r, ...p.readings],
      sales: kind === "Z" ? p.sales.map((x) => (x.zNo === undefined ? { ...x, zNo: r.counter } : x)) : p.sales,
    }));
    return r;
  }

  /* ── e-invoice queue ── */
  async function sendOutbox() {
    const endpoint = s.settings.eInvoiceEndpoint.trim();
    if (!endpoint) return setNotice("Add your relay endpoint in Settings first.");
    const send = httpTransmitter(endpoint);
    const todo = s.outbox.filter((o) => o.status === "PENDING" || o.status === "FAILED");
    let ok = 0;
    setNotice(`Sending ${todo.length}...`);
    for (const o of todo) {
      const sale = s.sales.find((x) => x.id === o.saleId);
      if (!sale) continue;
      try {
        await send(toPayload(sale, s.settings));
        ok++;
        setS((p) => ({ ...p, outbox: p.outbox.map((x) => (x.saleId === o.saleId ? { ...x, status: "SENT", attempts: x.attempts + 1, sentAt: new Date().toISOString(), lastError: undefined } : x)) }));
      } catch (e) {
        const lastError = e instanceof Error ? e.message : "Failed";
        setS((p) => ({ ...p, outbox: p.outbox.map((x) => (x.saleId === o.saleId ? { ...x, status: "FAILED", attempts: x.attempts + 1, lastError } : x)) }));
      }
    }
    setNotice(`${ok} of ${todo.length} sent.`);
  }

  const lastSale = s.sales.find((x) => x.id === lastId) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const tabLabel = TABS.find(([k]) => k === tab)?.[1] ?? "";

  return (
    <div
      style={{
        minHeight: "100vh",
        ...dotBackground(p.background, isDark ? "#ffffff30" : "#00000030"),
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",  
        alignItems: "center",
        paddingTop: 42,
        paddingBottom: 80,
        backgroundColor: p.background,
      }}
    >
      <FloatingButton
        onClick={() => setIsOpen(!isOpen)}
        color={isOpen ? AppColors.coral : AppColors.lime}
        label={isOpen ? "✖" : "☰"}
      />
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 90, // Positioned right above the floating button
            right: 24,
            zIndex: 1000,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <NeoButton label="Home" onPressed={() => navigate("/")} />
          </div>
        </div>
      )}

      <WireFrameFrosted width={shellWidth} isDark={isDark} frost={0.05}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: AppSpacing.sm, padding: `${AppSpacing.xs}px 8px 0` }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: p.ink, fontSize: 22, fontWeight: 900, letterSpacing: 2.5, margin: 0 }}>
              {s.settings.businessName.trim() || "Point of Sale"}
            </h1>
            <div style={{ color: p.ink, fontSize: 16, fontWeight: 500, letterSpacing: 2 }}>
              {s.settings.taxMode === "VAT" ? "VAT-registered" : "Non-VAT"} • saved on this device
            </div>
          </div>
          {/* <NeoSwitch value={isDark} onValueChange={setIsDark} /> */}
        </div>

        <div style={{ height: AppSpacing.md }} />
        <nav aria-label="POS sections" style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, paddingLeft: 8, paddingBottom: AppSpacing.md }}>
          {TABS.map(([k, label]) => (
            <NeoButton key={k} label={label} fontSize={16} isDark={isDark} color={tab === k? p.shell : ""} onPressed={() => setTab(k)} />
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: AppSpacing.sm, paddingBottom: 16, paddingLeft: 8 }}>
          <span style={{ color: p.ink, fontSize: 18, fontWeight: 900, letterSpacing: 2.5 }}>{tabLabel}</span>
          <div style={{ flex: 1, height: 2, backgroundColor: p.ink }} />
        </div>

        <div style={{ padding: `0 ${AppSpacing.xs}px ${AppSpacing.sm}px` }}>
          {tab === "sell" && (
            <SellView items={s.items} search={search} setSearch={setSearch} inCart={inCart} setQty={setQty}
              lines={lines} totals={totals} settings={s.settings} cash={cash} setCash={setCash} msg={msg}
              onCheckout={checkout} onClearCart={() => setS((q) => ({ ...q, cart: [] }))} lastSale={lastSale} isDark={isDark} />
          )}
          {tab === "inventory" && (
            <InventoryView
              items={s.items}
              search={inventorySearch}
              setSearch={setInventorySearch}
              mode={s.settings.taxMode}
              onAdd={addItem}
              onPatch={patchItem}
              onDelete={deleteItem}
              isDark={isDark}
            />
          )}
          {tab === "sales" && <SalesView sales={s.sales} onVoid={voidSale} settings={s.settings} isDark={isDark} />}
          {tab === "reports" && <ReportsView store={s} onReading={takeReading} onSendOutbox={sendOutbox} notice={notice} isDark={isDark} />}
          {tab === "settings" && (
            <SettingsView settings={s.settings} onChange={patchSettings} isDark={isDark}
              onErase={() => {
                if (window.confirm("Erase all items, sales, readings and settings on this device?")) { setS(EMPTY); setLastId(null); setCash(""); setNotice(""); }
              }} />
          )}
        </div>
      </WireFrameFrosted>
    </div>
  );
}
export const dotBackground = (
  bg: string,
  dot: string,
  gap = 26,
  size = 2
): CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(${dot} ${size}px, transparent ${size}px)`,
  backgroundSize: `${gap}px ${gap}px`,
});
