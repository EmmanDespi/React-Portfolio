import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { NeoChip, WireFrame } from "../../theme/AppTheme";
import { AppColors, AppPalette, AppSpacing } from "../../theme/tokens";
import { intro, journey, journeyNote, layers, principles, projectDetails } from "./AboutData";
import type { Domain } from "./AboutData";

type Focus = "all" | "software" | "hardware";

const TAG: Record<Domain, { label: string; bg: string }> = {
  software: { label: "Software", bg: AppColors.lime },
  bridge: { label: "Software + hardware", bg: AppColors.mustard },
  hardware: { label: "Hardware", bg: AppColors.coral },
};

const FOCUS: [Focus, string][] = [["all", "All"], ["software", "Software"], ["hardware", "Hardware"]];

interface Props {
  isDark: boolean;
  isMobile: boolean;
}

export function AboutSection({ isDark, isMobile }: Props) {
  const navigate = useNavigate();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const ink = isDark ? AppColors.oatmilk : p.ink;
  const [focus, setFocus] = useState<Focus>("all");

  const heading: CSSProperties = { color: ink, fontSize: isMobile ? 16 : 20, fontWeight: 900, letterSpacing: 2.5, margin: 0 };
  const body: CSSProperties = { color: ink, fontSize: isMobile ? 15 : 16, lineHeight: 1.6, margin: 0 };
  const small: CSSProperties = { color: ink, fontSize: 13, fontWeight: 600, letterSpacing: 1.5, margin: 0, opacity: 0.85 };
  const rule = <hr style={{ border: "none", borderTop: `2px solid ${ink}`, margin: 0 }} />;
  const card = (children: ReactNode, key?: string) => (
    <WireFrame key={key} color={p.card} isDark={isDark} height="auto" margin={0} padding={AppSpacing.sm} borderRadius={8}>
      {children}
    </WireFrame>
  );
  const pill = (label: string, bg: string) => (
    <span style={{
      display: "inline-block", padding: "2px 8px", border: `2px solid ${AppColors.ink}`, borderRadius: 6,
      backgroundColor: bg, color: AppColors.ink, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, whiteSpace: "nowrap",
    }}>{label}</span>
  );

  /* ── intro ── */
  const introCard = card(<p style={body}>{intro}</p>)
  /* ── skill coverage: software at the top, hardware at the bottom, with a filter ── */
  const filterButton = ([key, label]: [Focus, string]) => {
    const on = focus === key;
    return (
      <button key={key} type="button" aria-pressed={on} onClick={() => setFocus(key)} style={{
        padding: "4px 12px", border: `2px solid ${ink}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
        fontSize: 14, fontWeight: 800, letterSpacing: 1.5,
        backgroundColor: on ? AppColors.line : p.card, color: on ? AppColors.ink : ink,
      }}>{label}</button>
    );
  };

  const coverage = card(<>
    <h2 style={heading}>What my skills cover</h2>
    <p style={{ ...body, marginTop: AppSpacing.xs }}>From the screen in your hand to the board it runs on. Filter to see each side.</p>
    <div role="group" aria-label="Filter skills" style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, margin: `${AppSpacing.sm}px 0` }}>
      {FOCUS.map(filterButton)}
    </div>
    <p style={small}>↑ CLOSEST TO THE USER</p>
    <div style={{ height: AppSpacing.xs }} />
    {layers.map((l, i) => {
      const on = focus === "all" || l.domain === "bridge" || l.domain === focus;
      return (
        <div key={l.name} style={{ opacity: on ? 1 : 0.3, transition: "opacity 0.2s" }}>
          {i > 0 && <div style={{ padding: `${AppSpacing.sm}px 0` }}>{rule}</div>}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,220px) minmax(0,1fr)", gap: AppSpacing.sm, alignItems: "start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: ink, fontSize: 16, fontWeight: 900, letterSpacing: 1.5 }}>{l.name}</div>
              <div style={{ margin: `${AppSpacing.xs}px 0` }}>{pill(TAG[l.domain].label, TAG[l.domain].bg)}</div>
              <div style={{ color: ink, fontSize: 14, lineHeight: 1.5 }}>{l.blurb}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm }}>
              {l.skills.map((t) => <NeoChip key={t} label={t} isDark={isDark} />)}
            </div>
          </div>
        </div>
      );
    })}
    <div style={{ height: AppSpacing.sm }} />
    <p style={small}>↓ CLOSEST TO THE METAL</p>
  </>);

  /* ── career path ── */
  const path = card(<>
    <h2 style={heading}>Moving between worlds</h2>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(auto-fit, minmax(200px, 1fr))", gap: AppSpacing.sm, marginTop: AppSpacing.sm }}>
      {journey.map((s, i) => (
        <div key={`${s.where}-${s.when}`} style={{
          border: `2px solid ${ink}`, borderRadius: 8, padding: AppSpacing.sm, backgroundColor: p.card, minWidth: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            {pill(s.kind, TAG[s.domain].bg)}
            <span aria-hidden style={{ color: ink, fontWeight: 900 }}>{i < journey.length - 1 ? isMobile ? "↓" : "→" :  ""}</span>
          </div>
          <div style={{ color: ink, fontSize: 15, fontWeight: 800, letterSpacing: 1, margin: `${AppSpacing.xs}px 0 2px` }}>{s.role}</div>
          <div style={{ color: ink, fontSize: 13 }}>{s.where}  •  {s.when}</div>
        </div>
      ))}
    </div>
    <p style={{ ...body, fontSize: 14, marginTop: AppSpacing.sm }}>{journeyNote}</p>
  </>);

  /* ── projects ── */
  const projects = card(<>
    <h2 style={heading}>Things I've built</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: AppSpacing.sm, marginTop: AppSpacing.sm, alignItems: "stretch" }}>
      {projectDetails.map((d) => (
        <article key={d.name} style={{
          display: "flex", flexDirection: "column", gap: AppSpacing.xs, minWidth: 0,
          border: `2px solid ${ink}`, borderRadius: 8, padding: AppSpacing.sm, backgroundColor: p.card,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {pill(d.kind, AppColors.line)}
            {d.status && pill(d.status, AppColors.mustard)}
          </div>
          <h3 style={{ color: ink, fontSize: 18, fontWeight: 900, letterSpacing: 1.5, margin: 0 }}>{d.name}</h3>
          <p style={{ ...body, fontSize: 14 }}>{d.summary}</p>
          <ul style={{ color: ink, fontSize: 14, lineHeight: 1.5, margin: 0, paddingLeft: 18 }}>
            {d.highlights.map((h) => <li key={h}>{h}</li>)}
          </ul>
          {d.path && (
            <button type="button" onClick={() => navigate(d.path as string)} aria-label={`Open ${d.name}`} style={{
              alignSelf: "flex-start", marginTop: AppSpacing.xs, padding: "4px 12px", border: `2px solid ${ink}`, borderRadius: 6,
              backgroundColor: AppColors.line, color: AppColors.ink, fontFamily: "inherit", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer",
            }}>Open →</button>
          )}
        </article>
      ))}
    </div>
  </>);

  /* ── principles ── */
  const principlesCard = card(<>
    <h2 style={heading}>How I work</h2>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(auto-fit, minmax(220px, 1fr))", gap: AppSpacing.sm, marginTop: AppSpacing.sm }}>
      {principles.map((pr, i) => (
        <div key={pr.title} style={{ border: `2px solid ${ink}`, borderRadius: 8, padding: AppSpacing.sm, backgroundColor: p.card, minWidth: 0 }}>
          <div style={{ color: ink, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ color: ink, fontSize: 16, fontWeight: 900, letterSpacing: 1, margin: `2px 0 ${AppSpacing.xs}px` }}>{pr.title}</div>
          <div style={{ color: ink, fontSize: 14, lineHeight: 1.5 }}>{pr.text}</div>
        </div>
      ))}
    </div>
  </>);

  return (
    <div style={{ display: "grid", gap: AppSpacing.md, minWidth: 0, paddingLeft: isMobile ? AppSpacing.xs : AppSpacing.xl, paddingRight: isMobile ? AppSpacing.xs : AppSpacing.xl, paddingBottom: AppSpacing.xl}}>
      {introCard}
      {coverage}
      {path}
      {projects}
      {principlesCard}
    </div>
  );
}