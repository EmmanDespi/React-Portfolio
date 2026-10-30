import React, { useEffect, useState, type ReactNode } from "react";

// ==========================================
// 1. CONSTANTS & SPACING
// ==========================================

export const AppColors = {
  ink: "#171713",
  paper: "#F3EFE2",
  white: "#FFFEFA",
  lime: "#D7F34A",
  mustard: "#FFBF00",
  coral: "#EF6249",
  pantone: "#211832",
  muted: "#77766F",
  line: "#BCB9AE",
  oatcream: "#C2A178",
  dsBlue: "#38515A",
  deep: "#0E1012",
  oatmilk: "#E2DACB",
  onyx: "#57505C",
  stone: "#4E4A52",
} as const;

export const AppSpacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

// ==========================================
// 2. PALETTE & THEME
// ==========================================

export const AppPalette = {
  light: {
    background: AppColors.paper,
    title: AppColors.deep,
    shell: AppColors.paper,
    card: AppColors.white,
    subcard: AppColors.oatmilk,
    paper: AppColors.lime,
    chip: AppColors.oatmilk,
    ink: AppColors.ink,
    shadow: AppColors.ink,
    buttonShadow: AppColors.ink,
    inActive: AppColors.stone
  },
  dark: { 
    background: AppColors.deep,
    title: AppColors.coral,
    shell: AppColors.dsBlue,
    card: AppColors.stone,
    subcard: AppColors.onyx,
    paper: AppColors.mustard,
    chip: AppColors.dsBlue,
    ink: AppColors.paper,
    shadow: AppColors.ink,
    buttonShadow: AppColors.ink,
    inActive: AppColors.stone
  },
};

export type ThemePalette = typeof AppPalette.light;

// Hook for System Dark Mode in Web
export function useColorScheme(): "dark" | "light" {
  const [colorScheme, setColorScheme] = useState<"dark" | "light">(() =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return colorScheme;
}

// ==========================================
// 3. RESPONSIVE HOOK
// ==========================================

const BREAKPOINTS = {
  mobile: 600,
  tablet: 1024,
  desktop: 1440,
};

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { width, height } = windowSize;

  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;
  const isLargeDesktop = width >= BREAKPOINTS.desktop;

  const dashboardWidth = () => {
    if (isMobile) return width * 0.97;
    if (isTablet) return width * 0.95;
    if (isLargeDesktop) return width * 0.5;
    return width * 0.7;
  };

  const pagePadding = () => {
    if (isMobile) return 12;
    if (isTablet) return 20;
    return 12;
  };

  const dialogWidth = (maxWidth: number) => {
    return Math.min(width * 0.95, maxWidth);
  };

  const gridColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    dashboardWidth: dashboardWidth(),
    pagePadding: pagePadding(),
    dialogWidth,
    gridColumns: gridColumns(),
    titleSize: isMobile ? 26 : isTablet ? 30 : 34,
    dialogHeight: (factor: number) => height * factor,
    contentWidth: Math.min(width, 1600),
  };
}

// ==========================================
// 4. COMPONENTS
// ==========================================

interface WireFrameProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  minHeight?: number;
  padding?: number;
  margin?: number;
  color?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  isDark?: boolean;
  style?: React.CSSProperties;
}

export const WireFrame: React.FC<WireFrameProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight,
  padding = 6,
  margin = 4,
  borderRadius = 6,
  borderWidth = 2,
  color,
  borderColor = AppColors.ink,
  isDark = true,
  style,
}) => {
  const shadowOffset = 4;
  const p = isDark ? AppPalette.dark : AppPalette.light;
  return (
    <div style={{ position: "relative", width, minHeight, margin, ...style }}>
      {/* Neo Shadow Layer */}
      <div
        style={{
          position: "absolute",
          top: shadowOffset,
          left: shadowOffset,
          right: -shadowOffset,
          bottom: -shadowOffset,
          backgroundColor: p.shadow,
          border: `2px solid ${AppColors.ink}`,
            borderRadius: 6,
          pointerEvents: "none",
        }}
      />

      {/* Main Content Layer */}
      <div
        style={{
          position: "relative",
          width,
          height,
          minHeight,
          padding,
          backgroundColor: color || p.card,
          borderRadius,
          border: `${borderWidth}px solid ${borderColor}`,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface WireFrameFrostedProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  minHeight?: number;
  padding?: number;
  margin?: number;
  color?: string;          // hex like "#ffffff" (6 digits). Falls back to the palette card color
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  isDark?: boolean;
  frost?: number;          // 0 = clear glass, 1 = heavy frost (default 0.5)
  blur?: number;           // optional px override for the blur amount
  style?: React.CSSProperties;
}

/** Turns "#rrggbb" or "#rgb" into "rgba(r, g, b, a)". Other formats are returned as-is. */
const withAlpha = (color: string, alpha: number): string => {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const WireFrameFrosted: React.FC<WireFrameFrostedProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight,
  padding = 6,
  margin = 4,
  borderRadius = 6,
  borderWidth = 2,
  color,
  borderColor,
  isDark = true,
  frost = 0.5,
  blur,
  style,
}) => {
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const f = Math.max(0, Math.min(1, frost));
  const blurPx = blur ?? f * 20;          // 0 to 20px
  const alpha = 0.10 + f * 0.6;           // 0.15 to 0.75
  const filter = `blur(${blurPx}px) saturate(150%)`;

  const borderColored = borderColor || p.ink

  return (
    <div style={{ position: "relative", width, minHeight, margin, ...style }}>
      <div
        style={{
          position: "relative",
          width,
          height,
          minHeight,
          padding,
          backgroundColor: withAlpha(color || p.card, alpha),
          backdropFilter: filter,
          WebkitBackdropFilter: filter, // Safari
          borderRadius,
          border: `${borderWidth}px solid ${borderColored}`,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface NeoAvatarProps {
  imageUrl?: string;
  initials: string;
  size?: number;
  isDark?: boolean;
}

export const NeoAvatar: React.FC<NeoAvatarProps> = ({
  imageUrl,
  initials,
  size = 52,
  isDark = false,
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isDark ? AppColors.onyx : AppColors.oatmilk,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        boxShadow: "2px 2px 5px rgba(0,0,0,0.25)",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Avatar"
          style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            color: AppColors.coral,
            fontSize: size * 0.35,
            fontWeight: "700",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

interface NeoButtonProps {
  label?: string;
  children?: React.ReactNode;
  align?: "left" | "center";
  labelColor?: string;
  onPressed?: () => void;
  icon?: React.ReactNode;
  color?: string;
  shadowOffset?: number;
  width?: number | string;
  height?: number | string;
  fontSize?: number;
  isDark?: boolean;
  style?: React.CSSProperties;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  label,
  children,
  align = "left",
  labelColor,
  onPressed,
  icon,
  color,
  shadowOffset = 4,
  width,
  height,
  fontSize = 18,
  isDark = true,
  style,
}) => {
  const [pressed, setPressed] = useState(false);
  const enabled = !!onPressed;
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const baseColor = color || p.inActive;
  const bg = enabled ? baseColor : `${p.chip}99`;
  const fg = enabled ? p.ink : `${p.ink}66`;

  const shift = pressed ? shadowOffset : 0;
  const hasChildren = children !== undefined && children !== null;

  return (
    <div style={{ position: "relative", width, height, ...style }}>
      {!pressed && (
        <div
          style={{
            position: "absolute",
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
            backgroundColor: p.buttonShadow,
            border: `1px solid ${p.buttonShadow}`,
            borderRadius: 12,
            pointerEvents: "none",
          }}
        />
      )}

      <button
        type="button"
        disabled={!enabled}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={onPressed}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          border: `2px solid ${AppColors.ink}`,
          borderRadius: 12,
          padding: `${AppSpacing.sm}px ${AppSpacing.md}px`,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          cursor: enabled ? "pointer" : "not-allowed",
          transform: `translate(${shift}px, ${shift}px)`,
          transition: "transform 0.05s ease-in-out",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      >
        {icon}
        {hasChildren ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: align,
              color: labelColor || fg,
              marginLeft: icon ? fontSize * 0.5 : 0,
            }}
          >
            {children}
          </div>
        ) : (
          <span
            style={{
              color: labelColor || fg,
              fontSize,
              fontWeight: 900,
              letterSpacing: 1.5,
              marginLeft: icon ? fontSize * 0.5 : 0,
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        )}
      </button>
    </div>
  );
};



type NeoSwitchProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  theme?: {
    surface?: string;
  };
  style?: React.CSSProperties;
};

export function NeoSwitch({
  value,
  onValueChange,
  theme,
  style,
}: NeoSwitchProps) {
  const surface = theme?.surface ?? AppColors.oatmilk;

  return (
    <button
      onClick={() => onValueChange?.(!value)}
      role="switch"
      aria-checked={value}
      style={{
        width: 52,
        height: 28,
        borderRadius: 14,
        padding: 3,
        border: "none",
        backgroundColor: value ? AppColors.coral : surface,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        transition: "background-color 0.2s ease-in-out",
        boxShadow: "2px 2px 5px rgba(0,0,0,0.22)",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 11,
          backgroundColor: value ? AppColors.onyx : "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${value ? 24 : 0}px)`,
          transition: "transform 0.2s ease-in-out",
          boxShadow: "1px 1px 1px rgba(0,0,0,0.2)",
        }}
      >
        {value ? "🌙" : "☀️"}
      </div>
    </button>
  );
}


interface NeoChipProps {
  label: string;
  active?: boolean;
  onPressed?: () => void;
  activeColor?: string;
  fontSize?: number;
  isDark?: boolean;
  style?: React.CSSProperties;
}

export const NeoChip: React.FC<NeoChipProps> = ({
  label,
  active = false,
  onPressed,
  activeColor = AppColors.paper,
  fontSize = 14,
  isDark = false,
  style,
}) => {
  const p = isDark ? AppPalette.dark : AppPalette.light;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPressed}
      style={{
        border: `2px solid ${AppColors.ink}`,
        borderRadius: 999,
        padding: "4px 12px",
        fontSize,
        fontWeight: 700,
        cursor: onPressed ? "pointer" : "default",
        backgroundColor: active ? activeColor : AppColors.stone,
        color: active ? AppColors.ink : p.ink,
        ...style,
      }}
    >
      {label}
    </button>
  );
};

export function NeoImage({
  src,
  alt = "",
  size,
  isDark = false,
}: {
  src?: string;
  alt?: string;
  size: number;
  isDark?: boolean;
}) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          border: `2px dashed ${p.ink}`,
          opacity: 0.45,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: size * 0.4,
          color: p.ink,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 12,
        border: `2px solid ${AppColors.ink}`,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    />
  );
}

export function NeoTag({ text, isDark = false }: { text: string; isDark?: boolean }) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  return (
    <span
      style={{
        border: `2px solid ${AppColors.ink}`,
        backgroundColor: p.chip,
        color: p.ink,
        borderRadius: 8,
        padding: "1px 8px",
        fontSize: 17,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function NeoStatBar({
  label,
  value,
  max = 100,
  color = AppColors.coral,
  isDark = false,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  isDark?: boolean;
}) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 80, fontWeight: 700, fontSize: 14, color: p.ink }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 12,
          borderRadius: 7,
          border: `3px solid ${AppColors.ink}`,
          backgroundColor: p.chip,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </div>
      <div style={{ width: 28, textAlign: "right", fontWeight: 700, fontSize: 14, color: p.ink }}>{value}</div>
    </div>
  );
}

// Label / value rows with a top divider (the "Class / Magazine / Weight" block)
export function NeoRows({
  rows,
  isDark = false,
}: {
  rows: [string, ReactNode][];
  isDark?: boolean;
}) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  return (
    <div style={{ borderTop: `2px solid ${p.ink}`, paddingTop: 12 }}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "4px 0",
            color: p.ink,
            fontSize: 16,
          }}
        >
          <span style={{ fontWeight: 600, opacity: 0.9 }}>{label}</span>
          <span style={{ fontWeight: 700, textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- NeoDialog (generic shell, takes children) ----------

interface NeoDialogProps {
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  maxWidth?: number;
  closeLabel?: string;
  backLabel?: string;
  isDark?: boolean;
  ariaLabel?: string;
  frost?: number;
}

export const NeoDialog: React.FC<NeoDialogProps> = ({
  children,
  onClose,
  onBack,
  frost = 0.1,
  maxWidth = 560,
  closeLabel = "Close",
  backLabel = "Back",
  isDark = false,
  ariaLabel = "Dialog",
}) => {
  const responsive = useResponsive();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        style={{ width: responsive.dialogWidth(maxWidth), maxWidth: "100%" }}
      >
        <WireFrameFrosted  isDark={isDark} frost={frost}>
          <div style={{ maxHeight: "85vh", overflowY: "auto", padding: AppSpacing.md, borderRadius: 12 }}>
            {onBack && (
              <div style={{ marginBottom: AppSpacing.sm }}>
                <NeoButton label={backLabel} fontSize={13} onPressed={onBack} />
              </div>
            )}

            {children}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: AppSpacing.md }}>
              <NeoButton fontSize={12} label={closeLabel} color={AppColors.coral} onPressed={onClose} />
            </div>
          </div>
        </WireFrameFrosted>
      </div>
    </div>
  );
};

// ---------- NeoDetailDialog (generic: any model + a config) ----------

export interface DetailStat {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export interface DetailConfig<T> {
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  getCode?: (item: T) => string | undefined;
  getSubtitle?: (item: T) => string | undefined;
  getImage?: (item: T) => string | undefined;
  getTags?: (item: T) => (string | undefined | false | null)[];
  getStats?: (item: T) => DetailStat[];
  getDescription?: (item: T) => string | undefined;
  getRows?: (item: T) => [label: string, value: string | number | undefined | null][];
  /** Other items shown in the strip at the bottom (variants, similar, etc). */
  getRelated?: (item: T) => T[];
  relatedTitle?: string;
}

interface NeoDetailDialogProps<T> {
  item: T;
  config: DetailConfig<T>;
  onClose: () => void;
  onOpen?: (item: T) => void; // called when a related item is tapped
  onBack?: () => void;
  maxWidth?: number;
  isDark?: boolean;
}

export function NeoDetailDialog<T>({
  item,
  config,
  onClose,
  onOpen,
  onBack,
  maxWidth = 560,
  isDark = false,
}: NeoDetailDialogProps<T>) {
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const title = config.getTitle(item);
  const code = config.getCode?.(item);
  const subtitle = config.getSubtitle?.(item);
  const image = config.getImage?.(item);
  const description = config.getDescription?.(item);

  const tags = (config.getTags?.(item) ?? []).filter(Boolean) as string[];
  const stats = config.getStats?.(item) ?? [];
  const related = config.getRelated?.(item) ?? [];

  // Rows with no value are skipped, so optional fields vanish on their own.
  const rows = (config.getRows?.(item) ?? []).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string | number][];

  return (
    <NeoDialog isDark={isDark} ariaLabel={`${title} details`} maxWidth={maxWidth} onBack={onBack} onClose={onClose}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <NeoImage src={image} alt={title} size={120} isDark={isDark} />
        <div style={{ minWidth: 0 }}>
          {code && <div style={{ color: p.ink, opacity: 0.7, fontWeight: 700, fontSize: 14 }}>{code}</div>}
          <div style={{ color: p.ink, fontWeight: 900, fontSize: 24, lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ color: p.ink, fontWeight: 600, fontSize: 15, marginTop: 2 }}>{subtitle}</div>}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {tags.map((t) => (
                <NeoTag key={t} text={t} isDark={isDark} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
          {stats.map((s) => (
            <NeoStatBar key={s.label} label={s.label} value={s.value} max={s.max} color={s.color} isDark={isDark} />
          ))}
        </div>
      )}

      {/* Description */}
      {description && (
        <p style={{ color: p.ink, fontWeight: 600, fontSize: 16, lineHeight: 1.5, margin: "12px 0" }}>
          {description}
        </p>
      )}

      {/* Rows */}
      {rows.length > 0 && (
        <div style={{ borderTop: `2px solid ${p.ink}`, paddingTop: 12 }}>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "4px 0",
                color: p.ink,
                fontSize: 15,
              }}
            >
              <span style={{ fontWeight: 600, opacity: 0.8 }}>{label}</span>
              <span style={{ fontWeight: 700, textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Related */}
      {related.length > 0 && onOpen && (
        <div style={{ marginTop: AppSpacing.md }}>
          <div style={{ color: p.ink, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
            {config.relatedTitle ?? "Related"} ({related.length})
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {related.map((r) => {
              const label = config.getCode?.(r) ?? config.getTitle(r);
              return (
                <button
                  key={config.getId(r)}
                  type="button"
                  onClick={() => onOpen(r)}
                  aria-label={`Open ${label}`}
                  style={{
                    border: `2px solid ${AppColors.ink}`,
                    borderRadius: 12,
                    backgroundColor: p.chip,
                    padding: 6,
                    width: 96,
                    flexShrink: 0,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <NeoImage src={config.getImage?.(r)} size={56} isDark={isDark} />
                  <span style={{ color: p.ink, fontSize: 11, fontWeight: 700 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </NeoDialog>
  );
}