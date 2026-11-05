import type { CSSProperties, ReactNode } from "react";
import { C } from "./themeStyles";

/* ───────────────────────── THEME ADAPTER ─────────────────────────
   To use your own theme, map `C` to AppColors/AppPalette and swap `Btn` / `Box`
   for NeoButton / WireFrame. Nothing below this block touches styling.        */

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="pos-btn"
      style={{ ["--bg" as string]: props.color ?? "#fff" }}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  );
}

export function Box(props: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div className="pos-box" style={{ background: props.color ?? C.card, ...props.style }}>
      {props.children}
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span className="pos-lbl">{props.label}</span>
      {props.children}
    </label>
  );
}
