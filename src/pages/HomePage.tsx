import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppColors,
  AppPalette,
  AppSpacing,
  NeoAvatar,
  NeoButton,
  NeoSwitch,
  useResponsive,
  WireFrame,
  WireFrameFrosted,
} from "../theme/AppTheme";
import { FloatingButton } from "../theme/FloatingButton";
import { useAppTheme } from "../theme/ThemeContext";

const HEADER_ROW_MIN_WIDTH = 1000;

// ==========================================
// DATA
// ==========================================

const experiences = [
  { initials: "K", title: "Senior Software Engineer (Full Stack)", company: "Kivo Motion  •  May 2025 – April 2026" },
  { initials: "D", title: "Robotics Software Engineer", company: "Dyson  •  Dec 2023 – April 2025" },
  { initials: "T", title: "Embedded Software Engineer", company: "Thales  •  July 2022 – Nov 2023" },
  { initials: "T", title: "Full Stack Developer", company: "Tesda  •  Sept 2021 – June 2022" },
  { initials: "F", title: "CIE Operator", company: "FactSet  •  July 2020 – March 2021" },
  { initials: "N", title: "Intern Software Engineer", company: "Nokia  •  Dec 2019 – March 2020" },
  { initials: "F", title: "Freelance Software Developer", company: "Self-employed  •  Dec 2019 – Present" },
];

const frontEndTechs = [
  "Flutter", "HTML", "CSS", "React.js", "React Native",
  "SwiftUI", "Vite", "Tailwind CSS", "Material UI",
];

const backEndTechs = [
  "Node.js", "Firebase", "REST API", "Python", "MySQL", "MongoDB", "Git",
  "Docker", "Kubernetes", "Data Pipelines (ETL/ELT)", "Azure",
];

const cloudTools = [
  "AWS Cloud Services", "Github", "VS Code", "Postman", "Figma",
  "Jira", "Kafka", "Kanban", "Google API", "Vercel",
];

const languages = [
  "C", "C++", "C#", "Go Lang", "JavaScript", "Python", "Java", "Dart", "Swift", "Kotlin",
];

// ==========================================
// SMALL PIECES
// ==========================================

function FlipCard({
  front,
  back,
  width,
  height,
}: {
  front: ReactNode;
  back: ReactNode;
  width: number;
  height: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };

  return (
    <button
      type="button"
      aria-label="Flip profile card"
      onClick={() => setFlipped((f) => !f)}
      style={{
        perspective: 800,
        width,
        height,
        padding: 0,
        margin: 4,
        border: "none",
        background: "none",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.5s ease-in-out",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        <div style={face}>{front}</div>
        <div style={{ ...face, transform: "rotateY(180deg)" }}>{back}</div>
      </div>
    </button>
  );
}

function TechChip({ label, isDark }: { label: string; isDark: boolean }) {
  const p = isDark ? AppPalette.dark : AppPalette.light;
  return (
    <span
      style={{
        border: `2px solid ${p.ink}`,
        borderRadius: 8,
        padding: "3px 10px",
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 1,
        color: isDark ? AppColors.oatmilk : p.ink,
        backgroundColor: p.shell,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ==========================================
// PAGE
// ==========================================

export default function HomeScreen() {
  const { isDark, setIsDark } = useAppTheme();

  const responsive = useResponsive();
  const { isMobile, isLargeDesktop, dashboardWidth } = responsive;
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const ink = isDark ? AppColors.oatmilk : p.ink;
  const stacked = dashboardWidth - 28 < HEADER_ROW_MIN_WIDTH;
  const headerWidth = dashboardWidth - 28;
  const aboutWidth = dashboardWidth * (isMobile ? 0.87 : isLargeDesktop ? 0.5 : 0.45);
  const expWidth = dashboardWidth * (isMobile ? 0.87 : isLargeDesktop ? 0.4  : !stacked ? 0.28 : 0.45);

  

  // ---------- shared text styles ----------
  const headerText = (size: number, weight: number): CSSProperties => ({
    color: ink,
    fontSize: size,
    fontWeight: weight,
    letterSpacing: 2,
    margin: 0,
  });

  const heading: CSSProperties = {
    color: ink,
    fontSize: isMobile ? 16 : 20,
    fontWeight: 900,
    letterSpacing: 2.5,
    margin: 0,
  };

  const subheading: CSSProperties = {
    color: ink,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 2.5,
    margin: 0,
  };

  const rule = <hr style={{ border: "none", borderTop: `2px solid ${ink}`, margin: 0 }} />;

  // ---------- header ----------
  const avatarSize = responsive.isMobile
    ? { w: headerWidth * 0.35, h: headerWidth * 0.35 } : 
    responsive.isTablet || stacked ? { w: headerWidth * 0.25, h: headerWidth * 0.25 }
    : { w: headerWidth * 0.12, h: responsive.height * 0.11 };

  const avatarFace = (src: string, fit: CSSProperties["objectFit"]) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 4,
        boxSizing: "border-box",
        backgroundColor: p.card,
        border: `2px solid ${ink}`,
        borderRadius: 8,
        boxShadow: `4px 4px 0 ${p.shadow}`,
      }}
    >
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: fit, display: "block", borderRadius: 4}} />
    </div>
  );

  const avatar = (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems:"center"}}>
      <FlipCard
        width={avatarSize.w}
        height={avatarSize.h}
        front={avatarFace("/profile.gif", "fill")}
        back={avatarFace("/logo.png", "contain")}
      />
      <span style={headerText(16, 500) }>Click Me!</span>
    </div>
  );

  const align = stacked ? "center" : "flex-start";
  const textAlign = stacked ? "center" : "left";

  const nameBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, textAlign, paddingTop: AppSpacing.sm, minWidth: 0, }}>
      <h1 style={{ ...headerText(stacked ? 20 : 22, 900), letterSpacing: 2.5 }}>Emmanuel Despi</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: stacked ? "center" : "flex-start" }}>
        <span style={headerText(stacked ? 16 : 20, 500)}>BSCPE</span>
        <span style={headerText(16, 500)}>• Far Eastern University</span>
        <span style={headerText(16, 500)}>Institute of Technology</span>
      </div>
      <div style={headerText(stacked ? 14 : 16, 500)}>
        Software Engineer • Full Stack Developer • Technical Consultant
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: AppSpacing.sm,
          justifyContent: stacked ? "center" : "flex-start",
          marginTop: AppSpacing.sm,
        }}
      >
        <a
          href="/resume.pdf"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            border: `2px solid ${ink}`,
            borderRadius: 6,
            backgroundColor: AppColors.line,
            color: AppColors.ink,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 2,
            textDecoration: "none",
          }}
        >
          <span aria-hidden>💼</span> Resume
        </a>
        <NeoSwitch value={isDark} onValueChange={setIsDark} />
      </div>
    </div>
  );

  const contactStyle = headerText(stacked ? 14 : 16, 400);
  const contactBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, textAlign, paddingTop: AppSpacing.sm }}>
      <div style={contactStyle}>Las Pinas City</div>
      <div style={contactStyle}>emmanuelrobisodespi@gmail.com</div>
      <div style={contactStyle}>09056248875</div>
    </div>
  );

  const header = stacked ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: AppSpacing.sm }}>
      {avatar}
      {nameBlock}
      {contactBlock}
    </div>
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: AppSpacing.sm,
        paddingLeft: headerWidth * 0.015,
        paddingRight: headerWidth * 0.015,
      }}
    >
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>{nameBlock}</div>
      <div style={{ marginLeft: headerWidth * 0.05 }}>{contactBlock}</div>
    </div>
  );

  // ---------- section divider ----------
  const sectionDivider = (label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: AppSpacing.sm, paddingBottom: 16, paddingLeft: 8 }}>
      <span style={{ color: ink, fontSize: 18, fontWeight: 900, letterSpacing: 2.5 }}>{label}</span>
      <div style={{ flex: 1, height: 2, backgroundColor: ink }} />
    </div>
  );

  // ---------- tech stack ----------
  const techGroup = (label: string, items: string[]) => (
    <div>
      <h3 style={subheading}>{label}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, marginTop: AppSpacing.sm }}>
        {items.map((t) => (
          <TechChip key={t} label={t} isDark={isDark} />
        ))}
      </div>
    </div>
  );

  const groupDivider = <div style={{ padding: `${AppSpacing.sm}px 0` }}>{rule}</div>;

  const techStackPanel = (
    <div>
      <h2 style={heading}>Tech Stack & Skills</h2>
      <div style={{ height: AppSpacing.sm }} />
      {techGroup("Front End", frontEndTechs)}
      {groupDivider}
      {techGroup("Back End", backEndTechs)}
      {groupDivider}
      {techGroup("Cloud and Tools", cloudTools)}
      {groupDivider}
      {techGroup("Languages", languages)}
    </div>
  );

  // ---------- experience ----------
  const experiencePanel = (
    <div>
      <h2 style={heading}>Work Experience</h2>
      <div style={{ height: 22 }} />
      {experiences.map((exp, i) => (
        <div key={i}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: AppSpacing.sm }}>
            <NeoAvatar initials={exp.initials} isDark={isDark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: ink, fontSize: 13, fontWeight: 800, letterSpacing: 1.5 }}>{exp.title}</div>
              <div style={{ color: ink, fontSize: 13, fontWeight: 400, letterSpacing: 1.5, marginTop: 4 }}>
                {exp.company}
              </div>
            </div>
          </div>
          <div style={{ padding: `${AppSpacing.sm}px 0` }}>{rule}</div>
        </div>
      ))}
    </div>
  );

  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // ---------- dashboard ----------
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        ...dotBackground(p.background, isDark ? "#ffffff30" : "#00000030"),
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 42,
        paddingBottom: AppSpacing.lg,
        backgroundColor: p.background,
      }}
    >
      <FloatingButton
        onClick={() => setIsOpen(!isOpen)}
        color={isOpen ? AppColors.coral : AppColors.lime}
        label={
          isOpen ? "x" : "="
        }
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
          <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <NeoButton label="POS System" onPressed={() => navigate("/pos")} />
              <NeoButton label="Catalog" onPressed={() => navigate("/data")} />
            </div>
        </div>
      )}
      <WireFrameFrosted width={dashboardWidth} isDark={isDark} frost={0.05}>
        {header}
        <div style={{ height: 24 }} />
        {sectionDivider("About")}

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: isMobile ? "center" : "flex-start",
          }}
        >
          {isMobile && (
            <WireFrame
              color={p.card}
              isDark={isDark}
              width={expWidth}
              height="auto"
              padding={AppSpacing.sm}
              borderRadius={8}
              style={{ margin: `${AppSpacing.md}px 4px ${AppSpacing.sm}px`, maxWidth: "100%" }}
            >
              {experiencePanel}
            </WireFrame>
          )}

          <WireFrame
            color={p.card}
            isDark={isDark}
            width={aboutWidth}
            height="auto"
            padding={AppSpacing.sm}
            borderRadius={8}
            style={{ marginBottom: AppSpacing.sm, maxWidth: "100%", flexShrink: 1 }}
          >
            {techStackPanel}
          </WireFrame>

          {!isMobile && (
            <WireFrame
              color={p.card}
              isDark={isDark}
              width={expWidth}
              height="auto"
              padding={AppSpacing.sm}
              borderRadius={8}
              style={{ margin: "4px 12px 12px 22px", maxWidth: "100%", flexShrink: 1 }}
            >
              {experiencePanel}
            </WireFrame>
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
