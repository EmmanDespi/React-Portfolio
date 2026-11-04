import { useState, type CSSProperties } from "react";
import { useAppTheme } from "../theme/ThemeContext";
import { AppColors, AppPalette, AppSpacing, NeoButton, NeoFloatingMenu, useResponsive, WireFrameFrosted } from "../theme/AppTheme";
import { useDb } from "./HealthCareAssets/store";
import { describeActor } from "./HealthCareAssets/selectors";
import { DEMO_ACTORS, ROLE_LABELS } from "./HealthCareAssets/data/demoActors";
import type { Role } from "./HealthCareAssets/types";
import PatientView from "./HealthCareAssets/views/PatientView";
import DoctorView from "./HealthCareAssets/views/DoctorView";
import NurseView from "./HealthCareAssets/views/NurseView";
import HmoView from "./HealthCareAssets/views/HmoView";
import HospitalAdminView from "./HealthCareAssets/views/HospitalAdminView";
import { FloatingButton } from "../theme/FloatingButton";
import { useNavigate } from "react-router-dom";

const VIEWS = {
  patient: PatientView,
  doctor: DoctorView,
  nurse: NurseView,
  hmo: HmoView,
  admin: HospitalAdminView,
} as const;

export default function HealthCare() {
  const navigate = useNavigate();
  const { isDark } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const responsive = useResponsive();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const shellWidth = responsive.width > 1400 ? responsive.width * 0.7 : responsive.width * 0.9;

  // Role preview. In production the role comes from the signed-in user, and this switcher is removed.
  const [role, setRole] = useState<Role>("patient");
  const actor = DEMO_ACTORS[role];
  const db = useDb();
  const info = describeActor(db, actor);
  const RoleView = VIEWS[role];

  const headerText = (size: number, weight: number): CSSProperties => ({
    color: p.ink, fontSize: size, fontWeight: weight, letterSpacing: 1.5, margin: 0,
  });

  // =======================================
  //                 Header
  // =======================================
  const avatar = (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 120, height: 120, padding: 2, boxSizing: "border-box", backgroundColor: p.card, border: `1px solid ${p.ink}`, borderRadius: 8, boxShadow: `4px 4px 0 ${p.shadow}` }}>
        <img src={"/profile.gif"} alt="" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", borderRadius: 4 }} />
      </div>
    </div>
  );

  const nameBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingTop: AppSpacing.sm, minWidth: 0 }}>
      <h1 style={{ ...headerText(22, 900), letterSpacing: 2 }}>{info.name}</h1>
      <div style={{ ...headerText(14, 700), opacity: 0.7, marginTop: 4 }}>{ROLE_LABELS[role].label} view</div>
    </div>
  );

  const dataBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: "auto" }}>
      <div style={{ ...headerText(16, 500), paddingBottom: 14 }}>{info.place}</div>
      {info.rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
          <div style={headerText(16, 500)}>{label}:&nbsp;</div>
          <div style={headerText(16, 700)}>{value}</div>
        </div>
      ))}
    </div>
  );

  const header = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: AppSpacing.sm, paddingLeft: 8, paddingRight: 8 }}>
      {avatar}
      <div style={{ display: "flex", flexDirection: "column", flex: 2, minWidth: 0, alignSelf: "stretch" }}>
        {nameBlock}
        {dataBlock}
      </div>
    </div>
  );

  // `key={role}` resets each view's local state when the role changes.
  const body = <RoleView key={role} actor={actor} isDark={isDark} />;

  return (
    <div
      style={{
        minHeight: "100vh", width: "100%",
        ...dotBackground(p.background, isDark ? "#ffffff30" : "#00000030"),
        boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 22, paddingBottom: AppSpacing.lg, backgroundColor: p.background,
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
      <NeoFloatingMenu
        label={`Role: ${ROLE_LABELS[role].label}`}
        value={role}
        isDark={isDark}
        onChange={setRole}
        options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r].label, hint: ROLE_LABELS[r].hint }))}
        bottom={30}
        right={100}
      />
      <WireFrameFrosted width={shellWidth} isDark={isDark} frost={0.05} padding={8}>
        {header}
      </WireFrameFrosted>
      <WireFrameFrosted width={shellWidth} isDark={isDark} frost={0.05} minHeight={250} padding={12}>
        {body}
      </WireFrameFrosted>
    </div>
  );
}

export const dotBackground = (bg: string, dot: string, gap = 26, size = 2): CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(${dot} ${size}px, transparent ${size}px)`,
  backgroundSize: `${gap}px ${gap}px`,
});
