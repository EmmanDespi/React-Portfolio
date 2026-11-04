import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppColors,
  AppPalette,
  AppSpacing,
  NeoAvatar,
  NeoChip,
  NeoSwitch,
  useResponsive,
  WireFrame,
  WireFrameFrosted,
} from "../theme/AppTheme";
import { useAppTheme } from "../theme/ThemeContext";

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
const createProjectPreview = (title: string, accent: string, label: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
      <rect width="480" height="270" rx="18" fill="#171713"/>
      <rect x="14" y="14" width="452" height="242" rx="12" fill="#f3efe2"/>
      <rect x="14" y="14" width="452" height="34" rx="12" fill="#e2dacb"/>
      <circle cx="34" cy="31" r="5" fill="#ef6249"/>
      <circle cx="52" cy="31" r="5" fill="#ffbf00"/>
      <circle cx="70" cy="31" r="5" fill="#d7f34a"/>
      <rect x="30" y="64" width="110" height="176" rx="8" fill="#211832"/>
      <rect x="158" y="66" width="184" height="18" rx="6" fill="${accent}"/>
      <rect x="158" y="96" width="276" height="8" rx="4" fill="#c2a178"/>
      <rect x="158" y="116" width="226" height="8" rx="4" fill="#c2a178"/>
      <rect x="158" y="148" width="126" height="76" rx="8" fill="#ff fefa"/>
      <rect x="296" y="148" width="138" height="76" rx="8" fill="#e2dacb"/>
      <text x="158" y="178" fill="#171713" font-family="Arial, sans-serif" font-size="16" font-weight="700">${label}</text>
      <text x="158" y="242" fill="#171713" font-family="Arial, sans-serif" font-size="14" font-weight="700">${title}</text>
    </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const projects = [
  {
    title: "Point of Sale",
    subtitle: "Retail sales and inventory",
    description: "A point-of-sale experience for managing products, inventory, sales, reports, and store settings.",
    path: "/pos",
    image: createProjectPreview("Point of Sale", "#ef6249", "Checkout"),
  },
  {
    title: "Shadow Catalog",
    subtitle: "Searchable character catalog",
    description: "Browse and filter a shadow collection with detailed profiles, stats, and grid or list views.",
    path: "/data",
    image: createProjectPreview("Shadow Catalog", "#d7f34a", "Collection"),
  },
  {
    title: "Healthcare",
    subtitle: "Healthcare profile dashboard",
    description: "A healthcare-themed dashboard presenting member details and policy information.",
    path: "/healthcare",
    image: createProjectPreview("Healthcare", "#38515a", "Member profile"),
  },
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

// ==========================================
// PAGE
// ==========================================

export default function HomeScreen() {
  const { isDark, setIsDark } = useAppTheme();

  const responsive = useResponsive();
  const dashboardWidth = responsive.width * ((responsive.isDesktop &&responsive.width < 1850) ? 0.8 : responsive.isDesktop ? 0.6 : responsive.isMobile ? 0.95 : 0.95);
  const { isMobile, isTablet, isDesktop } = responsive;
  const p = isDark ? AppPalette.dark : AppPalette.light;

  const ink = isDark ? AppColors.oatmilk : p.ink;
  const stacked = isMobile;;
  const expWidth = dashboardWidth * (isMobile ? 0.96 : isDesktop ? 0.45 : isTablet ? 0.45 : 0.45);

  

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
    ? { w: dashboardWidth * 0.3, h: dashboardWidth * 0.3 } : 
    responsive.isTablet || stacked ? { w: 120, h: 120 }
    : { w: 160, h: 160 };

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
      <h1 style={{ ...headerText(stacked ? 20 : 22, 900), letterSpacing: 2.5, paddingBottom: AppSpacing.xs }}>Emmanuel Despi</h1>
      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: stacked ? "center" : "flex-start" }}>
        <span style={headerText(stacked ? 16 : 20, 500)}>BSCPE</span>
        <span style={{...headerText(18, 500), paddingLeft: 12}}>  @ Far Eastern University</span>
        <span style={headerText(16, 500)}>  Institute of Technology</span>
      </div>
      <div style={{...headerText(stacked ? 14 : 16, 500), display: "flex", flexDirection: "column", flexWrap: "nowrap"}}>
        <span style={headerText(16, 500)}>• Software Engineer</span>
        <span style={headerText(16, 500)}>• Full Stack Developer</span>
        <span style={headerText(16, 500)}>• Technical Consultant</span>
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
        paddingLeft: dashboardWidth * 0.015,
        paddingRight: dashboardWidth * 0.015,
      }}
    >
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>{nameBlock}</div>
      <div style={{ marginLeft: dashboardWidth * 0.05 }}>{contactBlock}</div>
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
          <NeoChip key={t} label={t} isDark={isDark} />
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

  // ---------- projects ------------
  const projectPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: AppSpacing.sm }}>
      {projects.map((project) => (
        <button
          key={project.path}
          type="button"
          onClick={() => navigate(project.path)}
          aria-label={`Open ${project.title}: ${project.description}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: AppSpacing.md,
            width: "100%",
            padding: AppSpacing.sm,
            border: `2px solid ${ink}`,
            borderRadius: 8,
            backgroundColor: p.card,
            color: ink,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <img
            src={project.image}
            alt=""
            style={{
              display: "block",
              width: isMobile ? 100 : 180,
              aspectRatio: "16 / 9",
              objectFit: "cover",
              flexShrink: 0,
              border: `2px solid ${ink}`,
              borderRadius: 6,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: p.ink, fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
              {project.subtitle}
            </div>
            <h3 style={{ color: ink, fontSize: 18, fontWeight: 900, letterSpacing: 1.5, margin: "4px 0" }}>
              {project.title}
            </h3>
            <p style={{ color: p.ink, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              {project.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
  // ---------- experience ----------
  const experiencePanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }} 
    > 
      <h2 style={heading}>Work Experience</h2>
      <div style={{ height: 22 }} />
      {experiences.map((exp, i) => (
        <div key={i}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: AppSpacing.sm }}>
            <NeoAvatar initials={exp.initials} isDark={isDark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: ink, fontSize: 16, fontWeight: 800, letterSpacing: 1.5 }}>{exp.title}</div>
              <div style={{ color: ink, fontSize: 14, fontWeight: 400, letterSpacing: 1.5, marginTop: 4 }}>
                {exp.company}
              </div>
            </div>
          </div>
          <div style={{ padding: `${AppSpacing.sm}px 0` }}>{rule}</div>
        </div>
      ))}
    </div>
  );

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
        paddingTop: 32,
        paddingBottom: AppSpacing.lg,
        padding: "16px 12px",
        backgroundColor: p.background,
      }}
    >
      <WireFrameFrosted width={dashboardWidth} isDark={isDark} frost={0.05}>
        {header}
        <div style={{ height: 24 }} />
        {sectionDivider("About")}

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: isMobile ? "center" : "stretch",
            gap: isDesktop ? AppSpacing.md : AppSpacing.sm,
          }}
        >
          {isMobile && (
            <WireFrame
              color={p.card}
              isDark={isDark}
              width={expWidth}
              height="100%"
              padding={AppSpacing.sm}
              borderRadius={8}
              style={{ marginBottom: AppSpacing.sm, maxWidth: "100%", flexShrink: 1 }}
            >
              {experiencePanel}
            </WireFrame>
            
          )}

          <WireFrame
            color={p.card}
            isDark={isDark}
            width={expWidth}
            height="100%"
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
              height="100%"
              padding={AppSpacing.sm}
              borderRadius={8}
              style={{ marginBottom: AppSpacing.sm, maxWidth: "100%", flexShrink: 1 }}
            >
              {experiencePanel}
            </WireFrame>
          )}
        </div>
        {sectionDivider("Projects")}
        {projectPanel}
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
