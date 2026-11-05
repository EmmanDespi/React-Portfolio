import type { CSSProperties } from "react";

export const dotBackground = (
  bg: string,
  dot: string,
  gap = 14,
  size = 1.5,
): CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(${dot} ${size}px, transparent ${size}px)`,
  backgroundSize: `${gap}px ${gap}px`,
});
