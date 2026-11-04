import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { EMPTY } from "./Pos Assets/types";
import type { Item, Line, OutboxItem, Reading, Sale, Settings, Store, TaxType } from "./Pos Assets/types";
import { calc, r2 } from "./Pos Assets/tax";
import { load, save, uid } from "./Pos Assets/storage";
import { buildReading } from "./Pos Assets/reports";
import { httpTransmitter, toPayload } from "./Pos Assets/einvoice";
import { SHEET, del, itemRow, lineRows, loadAll, outboxRow, put, readingRow, saleRow, sendOps } from "./Pos Assets/sheets";
import type { Op } from "./Pos Assets/sheets";
import { SellView } from "./Pos Assets/views/SellView";
import { InventoryView } from "./Pos Assets/views/InventoryView";
import { SalesView } from "./Pos Assets/views/SalesView";
import { ReportsView } from "./Pos Assets/views/ReportsView";
import { SettingsView } from "./Pos Assets/views/SettingsView";
import { SetupDialog } from "./Pos Assets/components/SetupDialogue";
import { FloatingButton } from "../theme/FloatingButton";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrameFrosted, useResponsive } from "../theme/AppTheme";
import { useAppTheme } from "../theme/ThemeContext";

type Tab = "sell" | "inventory" | "sales" | "reports" | "settings";
const TABS: [Tab, string][] = [["sell", "Sell"], ["inventory", "Inventory"], ["sales", "Sales"], ["reports", "Reports"], ["settings", "Settings"]];

const errText = (e: unknown) => (e instanceof Error ? e.message : "Failed");

/**
 * Shell only: owns the state and every action that changes it. Screens live in ./views.
 * Saved on this device: session id, settings, cart. Saved in the Google Sheet: items, sales, readings, e-invoice queue.
 * Each sheet action writes to the sheet FIRST and only updates the screen once the sheet accepted it.
 */
export default function POSPage() {
  const [s, setS] = useState<Store>(load);
  const [tab, setTab] = useState<Tab>("sell");
  const [search, setSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [cash, setCash] = useState("");
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  const [sync, setSync] = useState("");       // status / error line about the Google Sheet
  const [loaded, setLoaded] = useState(false); // true once the sheet has been read successfully
  const busy = useRef(false);
  // Starts true for a returning browser that already has a link and token, so the setup dialog doesn't flash while loading.
  const [loading, setLoading] = useState(() => !!(s.settings.sheetsUrl.trim() && s.settings.sheetsToken.trim()));
  const [setupDismissed, setSetupDismissed] = useState(false); // not saved: the dialog returns on the next visit until connected
  const [setupOpen, setSetupOpen] = useState(false);           // opened on demand with the (i) button

  // Shared theme preference controlled by the HomePage NeoSwitch.
  const { isDark } = useAppTheme();
  const responsive = useResponsive();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const shellWidth = responsive.isDesktop ? responsive.width * 0.7 : responsive.dashboardWidth;

  const sid = s.sessionId;
  const connected = !!(s.settings.sheetsUrl.trim() && s.settings.sheetsToken.trim());

  useEffect(() => { save(s); }, [s]);
  useEffect(() => {
    if (s.cart.length === 0) setCash("");
  }, [s.cart.length]);

  /* ── Google Sheet: read ── */
  async function refresh(): Promise<boolean> {
    if (!connected) {
      setLoaded(false);
      setSync("Not connected. Paste your Google Sheet web app link and token in Settings.");
      return false;
    }
    setSync("Loading from your Google Sheet...");
    try {
      const d = await loadAll(s.settings);
      setS((q) => ({ ...q, ...d }));
      setLoaded(true);
      setSync("");
      return true;
    } catch (e) {
      setLoaded(false);
      setSync(`Could not load the sheet: ${errText(e)}`);
      return false;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Google Sheet: write. Returns an error message, or null when the sheet accepted every op. ── */
  async function commit(ops: Op[]): Promise<string | null> {
    if (!loaded) {
      const m = "Not connected to your Google Sheet. Check Settings, then press Connect / reload.";
      setSync(m);
      return m;
    }
    if (busy.current) return "Still saving the previous change. Try again in a moment.";
    busy.current = true;
    setSync("Saving to your Google Sheet...");
    try {
      await sendOps(s.settings, ops);
      setSync("");
      return null;
    } catch (e) {
      const m = errText(e);
      setSync(`Not saved to the sheet: ${m}`);
      return m;
    } finally {
      busy.current = false;
    }
  }

  const lines: Line[] = useMemo(
    () =>
      s.cart.flatMap((c) => {
        const it = s.items.find((i) => i.id === c.itemId);
        return it ? [{ itemId: it.id, name: it.name, price: it.price, qty: c.qty, taxType: it.taxType }] : [];
      }),
    [s.cart, s.items]
  );
  const totals = useMemo(() => calc(lines, s.settings.taxMode), [lines, s.settings.taxMode]);

  /* ── settings (this device only) ── */
  const patchSettings = (patch: Partial<Settings>) => setS((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  /* ── inventory (Items tab) ── */
  const addItem = async (name: string, sku: string, price: number, taxType: TaxType, stock: number): Promise<boolean> => {
    const item: Item = { id: uid(), name: name.trim(), sku: sku.trim(), price: r2(price), taxType, stock };
    if (await commit([put(SHEET.items, itemRow(item, sid))])) return false;
    setS((p) => ({ ...p, items: [...p.items, item] }));
    return true;
  };
  const patchItem = async (id: string, patch: Partial<Item>) => {
    const cur = s.items.find((i) => i.id === id);
    if (!cur) return;
    const next: Item = { ...cur, ...patch };
    if (await commit([put(SHEET.items, itemRow(next, sid))])) return;
    setS((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? next : i)) }));
  };
  const deleteItem = async (id: string) => {
    if (await commit([del(SHEET.items, id)])) return;
    setS((p) => ({ ...p, items: p.items.filter((i) => i.id !== id), cart: p.cart.filter((c) => c.itemId !== id) }));
  };

  /* ── cart (this device only) ── */
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

  /* ── checkout: one batch writes the sale, its lines, the new stock levels and the e-invoice queue entry ── */
  async function checkout() {
    setMsg("");
    const { businessName, tin } = s.settings;
    if (!businessName.trim() || !tin.trim()) return setMsg("Add your business name and TIN in Settings before selling.");
    if (!lines.length) return setMsg("The cart is empty.");
    const tendered = Number(cash);
    if (!(tendered >= totals.gross)) return setMsg("Cash received is less than the total.");
    const sale: Sale = {
      id: uid(), no: String(s.nextNo).padStart(8, "0"), at: new Date().toISOString(), lines, totals,
      tendered: r2(tendered), change: r2(tendered - totals.gross), mode: s.settings.taxMode, voided: false, sessionId: sid,
    };
    const entry: OutboxItem | null = s.settings.eInvoiceEnabled ? { saleId: sale.id, no: sale.no, status: "PENDING", attempts: 0 } : null;
    const updated = s.items
      .filter((it) => lines.some((l) => l.itemId === it.id))
      .map((it) => ({ ...it, stock: it.stock - (lines.find((l) => l.itemId === it.id)?.qty ?? 0) }));

    const ops: Op[] = [
      put(SHEET.sales, saleRow(sale, sid), "no"), // "no" must be unique: stops two tills issuing the same invoice number
      ...lineRows(sale).map((r) => put(SHEET.lines, r)),
      ...updated.map((it) => put(SHEET.items, itemRow(it, sid))),
      ...(entry ? [put(SHEET.outbox, outboxRow(entry, sid))] : []),
    ];
    const err = await commit(ops);
    if (err) {
      if (/already exists/i.test(err)) void refresh(); // another device issued that number: pull its sales
      return setMsg(`Sale not saved. ${err}`);
    }

    setS((p) => ({
      ...p,
      items: p.items.map((it) => updated.find((u) => u.id === it.id) ?? it),
      sales: [sale, ...p.sales], cart: [], nextNo: p.nextNo + 1,
      outbox: entry ? [entry, ...p.outbox] : p.outbox,
    }));
    setCash("");
    setLastId(sale.id);
  }

  /* A void keeps the record, returns the stock, and cancels any unsent e-invoice. Closed days can't be voided. */
  async function voidSale(sale: Sale) {
    if (sale.zNo !== undefined) return;
    const reason = window.prompt(`Reason for voiding invoice ${sale.no}?`);
    if (!reason || !reason.trim()) return;
    const voided: Sale = { ...sale, voided: true, voidReason: reason.trim(), voidedAt: new Date().toISOString() };
    const restored = s.items
      .filter((it) => sale.lines.some((l) => l.itemId === it.id))
      .map((it) => ({ ...it, stock: it.stock + (sale.lines.find((l) => l.itemId === it.id)?.qty ?? 0) }));
    const cancelled: OutboxItem[] = s.outbox.filter((o) => o.saleId === sale.id && o.status !== "SENT").map((o) => ({ ...o, status: "CANCELLED" }));

    const err = await commit([
      put(SHEET.sales, saleRow(voided, sid)),
      ...restored.map((it) => put(SHEET.items, itemRow(it, sid))),
      ...cancelled.map((o) => put(SHEET.outbox, outboxRow(o, sid))),
    ]);
    if (err) return;

    setS((p) => ({
      ...p,
      items: p.items.map((it) => restored.find((r) => r.id === it.id) ?? it),
      sales: p.sales.map((x) => (x.id === sale.id ? voided : x)),
      outbox: p.outbox.map((o) => cancelled.find((c) => c.saleId === o.saleId) ?? o),
    }));
  }

  /* ── X / Z readings (Readings tab; a Z-reading also stamps the closed sales in the Sales tab) ── */
  async function takeReading(kind: "X" | "Z"): Promise<Reading | null> {
    const r = buildReading(kind, s);
    const closing = kind === "Z" ? s.sales.filter((x) => x.zNo === undefined).map((x) => ({ ...x, zNo: r.counter })) : [];
    const err = await commit([
      put(SHEET.readings, readingRow(r, sid)),
      ...closing.map((x) => put(SHEET.sales, saleRow(x, sid))),
    ]);
    if (err) return null;
    setS((p) => ({
      ...p,
      readings: [r, ...p.readings],
      sales: kind === "Z" ? p.sales.map((x) => (x.zNo === undefined ? { ...x, zNo: r.counter } : x)) : p.sales,
    }));
    return r;
  }

  /* ── e-invoice queue (Outbox tab) ── */
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
      let next: OutboxItem;
      try {
        await send(toPayload(sale, s.settings));
        ok++;
        next = { ...o, status: "SENT", attempts: o.attempts + 1, sentAt: new Date().toISOString(), lastError: undefined };
      } catch (e) {
        next = { ...o, status: "FAILED", attempts: o.attempts + 1, lastError: errText(e) };
      }
      setS((p) => ({ ...p, outbox: p.outbox.map((x) => (x.saleId === o.saleId ? next : x)) }));
      await commit([put(SHEET.outbox, outboxRow(next, sid))]);
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
      {(setupOpen || (!loaded && !loading && !setupDismissed)) && (
        <SetupDialog settings={s.settings} onChange={patchSettings} status={sync} connected={loaded} isDark={isDark}
          onConnect={async () => { if (await refresh()) setSetupOpen(false); }}
          onClose={() => { setSetupDismissed(true); setSetupOpen(false); }} />
      )}
      <FloatingButton
        onClick={() => setIsOpen(!isOpen)}
        color={isOpen ? AppColors.coral : AppColors.lime}
        label={isOpen ? "✖" : "☰"}
      />
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ color: p.ink, fontSize: 22, fontWeight: 900, letterSpacing: 2.5, margin: 0, minWidth: 0 }}>
                {s.settings.businessName.trim() || "Point of Sale"}
              </h1>
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                aria-label="Google Sheet setup instructions"
                title={loaded ? "Google Sheet connected. Open setup instructions" : "Google Sheet not connected. Open setup instructions"}
                style={{
                  flex: "none", width: 26, height: 26, borderRadius: "50%", padding: 0, cursor: "pointer",
                  border: `2px solid ${p.ink}`, backgroundColor: p.shell, color: p.ink,
                  fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 900, fontSize: 16, lineHeight: 1,
                }}
              >
                i
              </button>
            </div>
            <div style={{ color: p.ink, fontSize: 16, fontWeight: 500, letterSpacing: 2 }}>
              {s.settings.taxMode === "VAT" ? "VAT-registered" : "Non-VAT"} • saved in Google Sheets
            </div>
          </div>
          {/* <NeoSwitch value={isDark} onValueChange={setIsDark} /> */}
        </div>

        {sync && (
          <div role="status" style={{
            margin: `${AppSpacing.sm}px 8px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8,
            backgroundColor: AppColors.mustard, color: AppColors.ink, fontWeight: 700, fontSize: 14,
          }}>{sync}</div>
        )}

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
              connected={loaded} onReload={refresh}
              onErase={() => {
                if (window.confirm("Erase the business details, settings and cart saved on this device? Your Google Sheet is not touched.")) {
                  setS((q) => ({ ...EMPTY, sessionId: q.sessionId }));
                  setLoaded(false); setSetupDismissed(false); setLastId(null); setCash(""); setNotice(""); setSync("");
                }
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