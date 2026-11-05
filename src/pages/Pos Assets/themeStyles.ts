export const C = {
  ink: "#000",
  bg: "#EDEFF5",
  card: "#fff",
  accent: "#FFD23F",
  ok: "#7CE38B",
  warn: "#FF7A7A",
  info: "#8FD3FF",
};

export const css = `
.pos{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:${C.bg};color:${C.ink};min-height:100vh;padding:16px}
.pos *{box-sizing:border-box}
.pos h1,.pos h2,.pos h3{margin:0 0 10px;font-weight:900}
.pos-in{border:3px solid ${C.ink};padding:8px 10px;font:inherit;background:#fff;width:100%;min-width:0;border-radius:0}
.pos-in:focus-visible,.pos-btn:focus-visible{outline:3px solid #0057FF;outline-offset:2px}
.pos-btn{border:3px solid ${C.ink};box-shadow:4px 4px 0 ${C.ink};padding:8px 14px;font:inherit;font-weight:800;cursor:pointer;background:var(--bg,#fff);color:${C.ink};border-radius:0}
.pos-btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 ${C.ink}}
.pos-btn:disabled{opacity:.45;cursor:not-allowed}
.pos-box{border:3px solid ${C.ink};box-shadow:6px 6px 0 ${C.ink};background:${C.card};padding:14px;min-width:0}
.pos-cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:20px;align-items:start}
.pos-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.pos-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.pos-flex{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.pos-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.pos-line{display:flex;justify-content:space-between;gap:12px}
.pos-lbl{display:block;font-weight:700;font-size:13px;margin:0 0 4px}
@media(max-width:820px){.pos-cols{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.pos-btn:active{transform:none}}
`;
