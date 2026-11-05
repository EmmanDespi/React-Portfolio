import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Settings } from "../types";
import { APPS_SCRIPT, TOKEN_PLACEHOLDER } from "../SetupScript";
import { AppColors, AppPalette, AppSpacing, NeoButton, WireFrame } from "../../../theme/AppTheme";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  /** Reads the sheet using the link and token currently entered. */
  onConnect: () => void;
  /** Latest sheet status/error line from the POS shell. */
  status: string;
  onClose: () => void;
  /** True when the sheet is already loaded (dialog opened on demand with the (i) button). */
  connected: boolean;
  isDark: boolean;
}

const newToken = () => {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Shown when this browser has no working Google Sheet connection (first visit, or browsing data was cleared). */
export function SetupDialog({ settings: st, onChange, onConnect, status, onClose, connected, isDark }: Props) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const box = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const token = st.sheetsToken.trim();
  const hasLink = !!st.sheetsUrl.trim();
  // The token goes into a JS string literal in the script, so escape quotes and backslashes.
  const script = APPS_SCRIPT.replace(TOKEN_PLACEHOLDER, () => JSON.stringify(token).slice(1, -1));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false); // clipboard blocked: the "Show the script" box below can be copied by hand
    }
  };

  const heading: CSSProperties = { color: p.ink, fontSize: 20, fontWeight: 900, letterSpacing: 2.5, margin: `0 0 ${AppSpacing.sm}px` };
  const body: CSSProperties = { color: p.ink, fontSize: 15, margin: 0 };
  const small: CSSProperties = { color: p.ink, fontSize: 13, opacity: 0.85, margin: `${AppSpacing.xs}px 0 0` };
  const label: CSSProperties = { display: "block", color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 4px" };
  const input: CSSProperties = {
    width: "100%", minWidth: 0, boxSizing: "border-box", border: `2px solid ${p.ink}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 16, fontFamily: "inherit", backgroundColor: p.shell, color: p.ink,
  };
  const li: CSSProperties = { color: p.ink, fontSize: 15, marginBottom: AppSpacing.sm, lineHeight: 1.45 };
  const row: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: AppSpacing.sm, marginTop: AppSpacing.sm };
  const rule = <hr style={{ border: "none", borderTop: `2px solid ${p.ink}`, margin: `${AppSpacing.md}px 0` }} />;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="setup-title" tabIndex={-1}
        style={{ width: "100%", height: "100%", maxHeight: "120vh", overflowY: "auto", outline: "none" }}>
        <WireFrame color={p.card} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
          <h2 id="setup-title" style={heading}>{connected ? "Google Sheet setup" : "Connect your Google Sheet"}</h2>
          <p style={body}>
            {connected
              ? "Your sheet is connected. Use this guide to set up another sheet or script, or to change the link and token."
              : "This POS saves items, sales, readings and the e-invoice queue in a Google Sheet you own. This browser has no connection yet (first visit, or its data was cleared), so set one up below. Until then everything is saved on this device only, and it uploads to the sheet automatically once you connect."}
          </p>
          {!connected && <p style={small}>Already did this before? Skip to step 5 and paste your existing link and token.</p>}

          {rule}
          <h3 style={{ ...heading, fontSize: 16 }}>One-time setup</h3>
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>
              Open (or create) a Google Sheet. It can be empty. The tabs <strong>Items, Sales, SaleLines, Readings, Outbox</strong> are created for you.
            </li>
            <li style={li}>
              In the sheet, open <strong>Extensions → Apps Script</strong>. Delete the sample code in the editor.
            </li>
            <li style={li}>
              Press <strong>Generate token</strong>, then <strong>Copy script</strong>, and paste it into the editor and save.
              The token is already inside the copied script.
              <div style={row}>
                <NeoButton label="Generate token" fontSize={14} isDark={isDark} color={p.shell} onPressed={() => onChange({ sheetsToken: newToken() })} />
                <NeoButton label={copied ? "Copied ✓" : "Copy script"} fontSize={14} isDark={isDark} color={p.shell} onPressed={token ? copy : undefined} />
              </div>
              <div style={{ marginTop: AppSpacing.sm }}>
                <span style={label}>Access token</span>
                <input style={input} value={st.sheetsToken} autoComplete="off" spellCheck={false} aria-label="Access token"
                  placeholder="Press Generate token, or paste your existing token"
                  onChange={(e) => onChange({ sheetsToken: e.target.value })} />
              </div>
              <details style={{ marginTop: AppSpacing.sm, color: p.ink }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Show the script</summary>
                <textarea readOnly value={script} onFocus={(e) => e.currentTarget.select()} aria-label="Apps Script code"
                  style={{ ...input, marginTop: AppSpacing.xs, height: 180, fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace', fontSize: 12 }} />
              </details>
            </li>
            <li style={li}>
              Press <strong>Deploy → New deployment</strong>, click the gear and choose <strong>Web app</strong>. Set <strong>Execute as: Me</strong> and
              <strong> Who has access: Only Myself</strong>, then Deploy. Approve the permission prompt. If Google says the app is
              unverified, choose <strong>Advanced → Go to project</strong>. It is your own script.
            </li>
            <li style={li}>
              Copy the <strong>Web app URL</strong> (it ends in <code>/exec</code>), paste it here, and connect.
              <div style={{ marginTop: AppSpacing.sm }}>
                <span style={label}>Web app link</span>
                <input style={input} value={st.sheetsUrl} autoComplete="off" spellCheck={false} aria-label="Web app link"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  onChange={(e) => onChange({ sheetsUrl: e.target.value })} />
              </div>
            </li>
          </ol>

          {!!status && hasLink && !!token && (
            <p role="alert" style={{
              margin: `${AppSpacing.sm}px 0`, padding: "8px 12px", border: `2px solid ${AppColors.ink}`, borderRadius: 8,
              backgroundColor: AppColors.mustard, color: AppColors.ink, fontWeight: 700, fontSize: 14,
            }}>{status}</p>
          )}

          <div style={row}>
            <NeoButton label="Connect" fontSize={16} isDark={isDark} color={hasLink && token ? p.shell : ""} onPressed={hasLink && token ? onConnect : undefined} />
            <NeoButton label={connected ? "Close" : "Set up later"} fontSize={16} isDark={isDark} onPressed={onClose} />
          </div>
          <p style={small}>
            If you edit the script later, use Deploy → Manage deployments → Edit → New version. Your link and token stay in this browser only,
            so keep the token private: anyone who has both can read and change your sheet.
          </p>
        </WireFrame>
      </div>
    </div>
  );
}