import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Reading, Store } from "../types";
import { buildEJournal, download, readingText, salesBookCsv } from "../reports";
import { toPayload } from "../einvoice";
import { AppColors, AppPalette, AppSpacing, NeoButton, NeoTag, WireFrame, useResponsive } from "../../../theme/AppTheme";

interface Props {
  store: Store;
  onReading: (kind: "X" | "Z") => Reading;
  onSendOutbox: () => void;
  notice: string;
  isDark: boolean;
}

export function ReportsView({ store: s, onReading, onSendOutbox, notice, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const stacked = useResponsive().width < 900;
  const [selId, setSelId] = useState<string | null>(null);
  const shown = s.readings.find((r) => r.id === selId) ?? s.readings[0] ?? null;
  const unclosed = s.sales.filter((x) => x.zNo === undefined).length;
  const stamp = new Date().toISOString().slice(0, 10);
  const needsSetup = !s.settings.businessName.trim() || !s.settings.tin.trim();
  const queued = s.outbox.filter((o) => o.status === "PENDING" || o.status === "FAILED");

  const closeDay = () => {
    if (!window.confirm(`Close the day with a Z-reading? ${unclosed} invoice(s) will be locked and can no longer be voided. This cannot be undone.`)) return;
    setSelId(onReading("Z").id);
  };

  const heading: CSSProperties = { color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const body: CSSProperties = { color: p.ink, fontSize: 15, margin: 0 };
  const wrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, alignItems: "center" };
  const card = (children: ReactNode) => (
    <WireFrame color={p.subcard} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>{children}</WireFrame>
  );
  const alert = (text: string, tone: "warn" | "info") => (
    <p role={tone === "warn" ? "alert" : "status"} style={{
      margin: `${AppSpacing.sm}px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8,
      backgroundColor: tone === "warn" ? AppColors.coral : AppColors.mustard, color: AppColors.ink, fontWeight: 700, fontSize: 14,
    }}>{text}</p>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: stacked ? "minmax(0,1fr)" : "minmax(0,3fr) minmax(0,2fr)", gap: AppSpacing.md, alignItems: "start" }}>
      <div style={{ display: "grid", gap: AppSpacing.md, minWidth: 0 }}>
        {card(<>
          <h2 style={heading}>Readings</h2>
          <p style={body}>
            An X-reading is a mid-day snapshot and resets nothing. A Z-reading closes the day, locks its invoices, and adds the net sales to the grand total.
            Run one Z-reading for every day you operate, even a day with no sales.
          </p>
          {needsSetup && alert("Add your business name and TIN in Settings first.", "warn")}
          <div style={{ ...wrap, marginTop: AppSpacing.sm }}>
            <NeoButton label="X-reading" fontSize={14} isDark={isDark} color={p.shell} onPressed={needsSetup ? undefined : () => setSelId(onReading("X").id)} />
            <NeoButton label="Close day (Z-reading)" fontSize={14} isDark={isDark} color={p.shell} onPressed={needsSetup ? undefined : closeDay} />
          </div>
          <p style={{ ...body, marginTop: AppSpacing.sm }}>Open invoices not yet closed: <strong>{unclosed}</strong></p>
        </>)}

        {shown ? (
          <WireFrame color={p.card} isDark={isDark} height="auto" width="12" margin={0} padding={AppSpacing.sm} borderRadius={8}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowX: "auto", color: p.ink, fontSize: 16, fontWeight: 500, fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace' }}>
              {readingText(shown, s.settings)}
            </pre>
          </WireFrame>
        ) : card(<p style={body}>No readings yet. Run an X-reading to see today's totals so far.</p>)}
      </div>

      <div style={{ display: "grid", gap: AppSpacing.md, minWidth: 0 }}>
        {card(<>
          <h2 style={heading}>History ({s.readings.length})</h2>
          {s.readings.length === 0 && <p style={body}>Readings you run are kept here.</p>}
          <div style={{ display: "grid", gap: AppSpacing.sm }}>
            {s.readings.map((r) => {
              const sel = r.id === shown?.id;
              return (
                <button key={r.id} type="button" onClick={() => setSelId(r.id)} style={{
                  width: "100%", textAlign: "left", fontFamily: "inherit", padding: AppSpacing.sm, borderRadius: 12,
                  border: `2px solid ${AppColors.ink}`, boxShadow: `3px 3px 0 ${p.buttonShadow}`, cursor: "pointer",
                  backgroundColor: sel ? p.paper : p.shell, color: sel ? AppColors.ink : p.ink,
                }}>
                  <div style={{ fontWeight: 800, letterSpacing: 1 }}>{r.kind}-reading #{r.counter}</div>
                  <div style={{ fontSize: 12 }}>{new Date(r.at).toLocaleString("en-PH")}</div>
                </button>
              );
            })}
          </div>
        </>)}

        {card(<>
          <h2 style={heading}>Exports</h2>
          <div style={wrap}>
            <NeoButton label="E-journal (.txt)" fontSize={14} isDark={isDark} color={p.shell} onPressed={needsSetup ? undefined : () => download(`e-journal-${stamp}.txt`, buildEJournal(s))} />
            <NeoButton label="Sales book (.csv)" fontSize={14} isDark={isDark} color={p.shell} onPressed={() => download(`sales-book-${stamp}.csv`, salesBookCsv(s.sales), "text/csv")} />
            <NeoButton label="Backup (.json)" fontSize={14} isDark={isDark} color={p.shell} onPressed={() => download(`pos-backup-${stamp}.json`, JSON.stringify(s, null, 2), "application/json")} />
          </div>
        </>)}

        {card(<>
          <h2 style={heading}>E-invoice queue</h2>
          {!s.settings.eInvoiceEnabled && <p style={body}>Off. Turn it on in Settings to queue new sales.</p>}
          {notice && alert(notice, "info")}
          {s.outbox.length === 0 ? (
            <p style={body}>Nothing queued.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {s.outbox.map((o) => (
                <div key={o.saleId} style={{ ...wrap, justifyContent: "space-between", color: p.ink, fontSize: 14 }}>
                  <strong>#{o.no}</strong>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <NeoTag text={o.status} isDark={isDark} />
                    {o.attempts ? <span>{o.attempts} tries</span> : null}
                    {o.lastError ? <span>{o.lastError}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ ...wrap, marginTop: AppSpacing.sm }}>
            <NeoButton label={`Send ${queued.length || ""} queued`} fontSize={14} isDark={isDark}
              onPressed={!queued.length || !s.settings.eInvoiceEndpoint.trim() ? undefined : onSendOutbox} />
            <NeoButton label="Download queued (.json)" fontSize={14} isDark={isDark}
              onPressed={!queued.length ? undefined : () => download(`einvoice-queue-${stamp}.json`,
                JSON.stringify(queued.flatMap((o) => { const x = s.sales.find((y) => y.id === o.saleId); return x ? [toPayload(x, s.settings)] : []; }), null, 2), "application/json")} />
          </div>
        </>)}
      </div>
    </div>
  );
}
