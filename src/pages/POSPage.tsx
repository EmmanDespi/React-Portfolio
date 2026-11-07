import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EMPTY } from "./PosAssets/types";
import type { Item, Line, OutboxItem, Reading, Sale, Settings, Store, TaxType } from "./PosAssets/types";
import { calc, r2 } from "./PosAssets/tax";
import { load, save, uid } from "./PosAssets/storage";
import { buildReading } from "./PosAssets/reports";
import { httpTransmitter, toPayload } from "./PosAssets/einvoice";
import { SHEET, compactOps, del, itemRow, lineRows, loadAll, outboxRow, put, readingRow, saleRow, sendOps } from "./PosAssets/sheets";
import type { Op } from "./PosAssets/sheets";
import { SellView } from "./PosAssets/views/SellView";
import { InventoryView } from "./PosAssets/views/InventoryView";
import { SalesView } from "./PosAssets/views/SalesView";
import { ReportsView } from "./PosAssets/views/ReportsView";
import { SettingsView } from "./PosAssets/views/SettingsView";
import { SetupDialog } from "./PosAssets/components/SetupDialogue";
import { FloatingButton } from "../theme/FloatingButton";
import { AppColors, AppPalette, AppSpacing } from "../theme/tokens";
import { useResponsive } from "../theme/responsive";
import { NeoButton, WireFrameFrosted } from "../theme/AppTheme";
import { useAppTheme } from "../theme/useAppTheme";
import { dotBackground } from "../theme/background";

type Tab = "sell" | "inventory" | "sales" | "reports" | "settings";
const TABS: [Tab, string][] = [["sell", "Sell"], ["inventory", "Inventory"], ["sales", "Sales"], ["reports", "Reports"], ["settings", "Settings"]];

const errText = (e: unknown) => (e instanceof Error ? e.message : "Failed");

const SYNC_EVERY_MS = 60 * 60 * 1000; // auto sync: every hour
const CHUNK = 100;                    // ops per request to Apps Script

/** Appends sheet writes to the unsynced queue. Every change goes through this, whether or not a sheet is connected. */
const withOps = (p: Store, ops: Op[]): Store => ({ ...p, pending: [...p.pending, ...ops] });

/**
 * Shell only: owns the state and every action that changes it. Screens live in ./views.
 * Local-first: every action saves on this device immediately and queues its sheet writes in `pending`.
 * syncNow() uploads the queue to the Google Sheet (when connected) and then reads the sheet back.
 * It runs on connect, every hour, on the Sync button, and after a Z-reading.
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
  const [sync, setSync] = useState("");       // progress / error line about the Google Sheet
  const [loaded, setLoaded] = useState(false); // true when the last sync with the sheet succeeded
  const [syncing, setSyncing] = useState(false);
  const [syncTick, setSyncTick] = useState(0); // bump to request a sync after the next render (state is then up to date)
  const [saveFailed, setSaveFailed] = useState(false);
  const syncBusy = useRef(false);
  const [setupOpen, setSetupOpen] = useState(() => !(s.settings.sheetsUrl.trim() && s.settings.sheetsToken.trim())); // first visit without a sheet: offer setup (can be dismissed)

  // Shared theme preference controlled by the HomePage NeoSwitch.
  const { isDark } = useAppTheme();
  const responsive = useResponsive();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const shellWidth = responsive.isDesktop ? responsive.width * 0.7 : responsive.dashboardWidth;

  const sid = s.sessionId;
  const hasLink = !!(s.settings.sheetsUrl.trim() && s.settings.sheetsToken.trim());
  const unsynced = useMemo(() => compactOps(s.pending).length, [s.pending]);
  const sRef = useRef(s);
  useEffect(() => {
    sRef.current = s;
  }, [s]);

  useEffect(() => {
    const failed = !save(s);
    const frame = window.requestAnimationFrame(() => setSaveFailed(failed));
    return () => window.cancelAnimationFrame(frame);
  }, [s]);

  /* ── Google Sheet sync: upload everything queued, then read the sheet back ── */
  async function syncNow(): Promise<boolean> {
    const st = sRef.current.settings;
    if (!(st.sheetsUrl.trim() && st.sheetsToken.trim())) {
      setLoaded(false);
      setSync("Not connected. Paste your Google Sheet web app link and token in Settings. Your data stays on this device until then.");
      return false;
    }
    if (syncBusy.current) return false;
    syncBusy.current = true;
    setSyncing(true);
    setSync("Syncing with your Google Sheet...");
    try {
      const queue = sRef.current.pending;
      const ops = compactOps(queue);
      for (let i = 0; i < ops.length; i += CHUNK) await sendOps(st, ops.slice(i, i + CHUNK));
      // Everything in `queue` is now in the sheet. Changes made while syncing were appended after it and stay queued.
      if (queue.length) setS((q) => ({ ...q, pending: q.pending.slice(queue.length) }));
      const d = await loadAll(st);
      const at = new Date().toISOString();
      // Only replace local data with the sheet's copy when nothing newer is waiting, so nothing is overwritten.
      setS((q) => (q.pending.length ? { ...q, lastSyncAt: at } : { ...q, ...d, lastSyncAt: at }));
      setLoaded(true);
      setSync("");
      return true;
    } catch (e) {
      setLoaded(false);
      setSync(`Sync failed: ${errText(e)}. Your data is safe on this device and will upload on the next sync.`);
      return false;
    } finally {
      syncBusy.current = false;
      setSyncing(false);
    }
  }
  const syncRef = useRef(syncNow);
  useEffect(() => {
    syncRef.current = syncNow;
  });

  // On open: sync if a sheet is configured.
  useEffect(() => {
    if (hasLink) void syncRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Auto sync every hour while the page is open and a sheet is configured.
  useEffect(() => {
    if (!hasLink) return;
    const t = window.setInterval(() => { void syncRef.current(); }, SYNC_EVERY_MS);
    return () => window.clearInterval(t);
  }, [hasLink]);
  // Requested syncs (after a Z-reading).
  useEffect(() => {
    if (syncTick > 0 && hasLink) void syncRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTick]);

  const lines: Line[] = useMemo(
    () =>
      s.cart.flatMap((c) => {
        const it = s.items.find((i) => i.id === c.itemId);
        return it ? [{ itemId: it.id, name: it.name, price: it.price, qty: c.qty, taxType: it.taxType }] : [];
      }),
    [s.cart, s.items]
  );
  const totals = useMemo(() => calc(lines, s.settings.taxMode), [lines, s.settings.taxMode]);

  /* ── settings (kept on this device, never synced) ── */
  const patchSettings = (patch: Partial<Settings>) => setS((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  /* ── inventory (Items tab) ── */
  const addItem = (name: string, sku: string, price: number, taxType: TaxType, stock: number): boolean => {
    const item: Item = { id: uid(), name: name.trim(), sku: sku.trim(), price: r2(price), taxType, stock };
    setS((p) => withOps({ ...p, items: [...p.items, item] }, [put(SHEET.items, itemRow(item, sid))]));
    return true;
  };
  const patchItem = (id: string, patch: Partial<Item>) =>
    setS((p) => {
      const cur = p.items.find((i) => i.id === id);
      if (!cur) return p;
      const next: Item = { ...cur, ...patch };
      return withOps({ ...p, items: p.items.map((i) => (i.id === id ? next : i)) }, [put(SHEET.items, itemRow(next, sid))]);
    });
  const deleteItem = (id: string) => {
    if (s.cart.length === 1 && s.cart[0].itemId === id) setCash("");
    setS((p) => withOps({ ...p, items: p.items.filter((i) => i.id !== id), cart: p.cart.filter((c) => c.itemId !== id) }, [del(SHEET.items, id)]));
  };

  /* ── cart (this device only, never synced) ── */
  const inCart = (id: string) => s.cart.find((c) => c.itemId === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) => {
    if (qty <= 0 && s.cart.length === 1 && s.cart[0].itemId === id) setCash("");
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
  };

  /* ── checkout: saves the sale, its lines, the new stock levels and the e-invoice queue entry on this device, and queues them for the sheet ── */
  function checkout() {
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
      put(SHEET.sales, saleRow(sale, sid), "no"), // "no" must be unique in the sheet: a clash is reported at sync time
      ...lineRows(sale).map((r) => put(SHEET.lines, r)),
      ...updated.map((it) => put(SHEET.items, itemRow(it, sid))),
      ...(entry ? [put(SHEET.outbox, outboxRow(entry, sid))] : []),
    ];
    setS((p) => withOps({
      ...p,
      items: p.items.map((it) => updated.find((u) => u.id === it.id) ?? it),
      sales: [sale, ...p.sales], cart: [], nextNo: p.nextNo + 1,
      outbox: entry ? [entry, ...p.outbox] : p.outbox,
    }, ops));
    setCash("");
    setLastId(sale.id);
  }

  /* A void keeps the record, returns the stock, and cancels any unsent e-invoice. Closed days can't be voided. */
  function voidSale(sale: Sale) {
    if (sale.zNo !== undefined) return;
    const reason = window.prompt(`Reason for voiding invoice ${sale.no}?`);
    if (!reason || !reason.trim()) return;
    const voided: Sale = { ...sale, voided: true, voidReason: reason.trim(), voidedAt: new Date().toISOString() };
    const restored = s.items
      .filter((it) => sale.lines.some((l) => l.itemId === it.id))
      .map((it) => ({ ...it, stock: it.stock + (sale.lines.find((l) => l.itemId === it.id)?.qty ?? 0) }));
    const cancelled: OutboxItem[] = s.outbox.filter((o) => o.saleId === sale.id && o.status !== "SENT").map((o) => ({ ...o, status: "CANCELLED" }));

    setS((p) => withOps({
      ...p,
      items: p.items.map((it) => restored.find((r) => r.id === it.id) ?? it),
      sales: p.sales.map((x) => (x.id === sale.id ? voided : x)),
      outbox: p.outbox.map((o) => cancelled.find((c) => c.saleId === o.saleId) ?? o),
    }, [
      put(SHEET.sales, saleRow(voided, sid)),
      ...restored.map((it) => put(SHEET.items, itemRow(it, sid))),
      ...cancelled.map((o) => put(SHEET.outbox, outboxRow(o, sid))),
    ]));
  }

  /* ── X / Z readings. A Z-reading stamps the closed sales, then triggers a sync to the sheet. ── */
  async function takeReading(kind: "X" | "Z"): Promise<Reading | null> {
    const r = buildReading(kind, s);
    const closing = kind === "Z" ? s.sales.filter((x) => x.zNo === undefined).map((x) => ({ ...x, zNo: r.counter })) : [];
    setS((p) => withOps({
      ...p,
      readings: [r, ...p.readings],
      sales: kind === "Z" ? p.sales.map((x) => (x.zNo === undefined ? { ...x, zNo: r.counter } : x)) : p.sales,
    }, [
      put(SHEET.readings, readingRow(r, sid)),
      ...closing.map((x) => put(SHEET.sales, saleRow(x, sid))),
    ]));
    if (kind === "Z") setSyncTick((n) => n + 1);
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
      setS((p) => withOps({ ...p, outbox: p.outbox.map((x) => (x.saleId === o.saleId ? next : x)) }, [put(SHEET.outbox, outboxRow(next, sid))]));
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
      {setupOpen && (
        <SetupDialog settings={s.settings} onChange={patchSettings} status={sync} connected={loaded} isDark={isDark}
          onConnect={async () => { if (await syncNow()) setSetupOpen(false); }}
          onClose={() => setSetupOpen(false)} />
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
              {s.settings.taxMode === "VAT" ? "VAT-registered" : "Non-VAT"} • {!hasLink ? "saved on this device only" : unsynced > 0 ? "saved here, sync pending" : "synced with Google Sheets"}
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

        {(saveFailed || !hasLink || (unsynced > 0 && !syncing)) && (
          <div role="alert" style={{
            margin: `${AppSpacing.sm}px 8px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8,
            backgroundColor: !hasLink || saveFailed ? AppColors.coral : AppColors.mustard, color: AppColors.ink, fontWeight: 700, fontSize: 14,
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: AppSpacing.sm,
          }}>
            <span>
              {saveFailed
                ? "This browser could not save your data (storage full or blocked). Download a backup in Reports and free up space."
                : !hasLink
                  ? `Google Sheets is not set up. All data is stored only on this device${unsynced ? ` (${unsynced} record(s))` : ""}. Clearing browser data will erase it. Connect a sheet and everything here is uploaded automatically.`
                  : `${unsynced} record(s) are saved on this device but not in your Google Sheet yet. They sync every hour, when you close the day, or when you press Sync now.`}
            </span>
            {!saveFailed && (
              <NeoButton label={hasLink ? "Sync now" : "Set up"} fontSize={14} isDark={isDark} color={p.shell}
                onPressed={hasLink ? () => { void syncNow(); } : () => setSetupOpen(true)} />
            )}
          </div>
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
              onCheckout={checkout} onClearCart={() => { setS((q) => ({ ...q, cart: [] })); setCash(""); }} lastSale={lastSale} isDark={isDark} />
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
              connected={loaded} onSync={() => { void syncNow(); }} syncing={syncing} unsynced={unsynced} lastSyncAt={s.lastSyncAt}
              onErase={() => {
                const warn = unsynced > 0 ? `${unsynced} record(s) have NOT been synced to your Google Sheet and will be lost permanently. ` : "";
                if (window.confirm(`${warn}Erase all data, settings and the cart saved on this device? Data already synced stays in your Google Sheet.`)) {
                  setS((q) => ({ ...EMPTY, sessionId: q.sessionId }));
                  setLoaded(false); setLastId(null); setCash(""); setNotice(""); setSync("");
                }
              }} />
          )}
        </div>
      </WireFrameFrosted>
    </div>
  );
}