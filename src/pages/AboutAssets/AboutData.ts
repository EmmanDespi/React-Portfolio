/**
 * Everything the About section shows lives here, so you can edit the words without touching the layout.
 * Roles, dates and skills come from your page and your projects. Items marked DRAFT are my wording: rewrite them in your own voice.
 */

export type Domain = "software" | "bridge" | "hardware";

export interface Layer {
  name: string;
  domain: Domain;
  blurb: string;
  skills: string[];
}

export interface Step {
  kind: string;
  domain: Domain;
  role: string;
  where: string;
  when: string;
}

export interface ProjectDetail {
  name: string;
  kind: string;
  status?: string;
  summary: string;
  highlights: string[];
  path?: string;
}

export interface Principle {
  title: string;
  text: string;
}

// DRAFT
export const intro =
  "I'm a software engineer whose work runs from polished front ends, through APIs and cloud services, down to embedded and robotics code. " +
  "A Computer Engineering degree gave me the hardware foundation, and my roles since have moved between full stack products, embedded software and robot software. " +
  "I like the places where those worlds meet, and I try to bring the discipline of one into the others.";

/**
 * From the part people touch (top) to the part closest to the metal (bottom).
 * TODO: add the boards, protocols, sensors and tools you have actually worked with to the last two layers.
 */
export const layers: Layer[] = [
  {
    name: "Interfaces",
    domain: "software",
    blurb: "Mobile and web apps people touch.",
    skills: ["Flutter", "React.js", "React Native", "SwiftUI", "Tailwind CSS", "Material UI", "HTML", "CSS", "Figma"],
  },
  {
    name: "Apps & APIs",
    domain: "software",
    blurb: "The logic and services between the screen and the data.",
    skills: ["Node.js", "Next.js", "REST API", "Firebase", "TypeScript", "C#", "Python", "Dart", "Kotlin", "Swift", "Fast Api", "Express.js", "GraphQL"],
  },
  {
    name: "Data & Cloud",
    domain: "software",
    blurb: "Where data lives and how it ships.",
    skills: ["MySQL", "MongoDB", "Redis", "Kafka", "Data Pipelines (ETL/ELT)", "AWS Cloud Services", "Azure", "Docker", "Kubernetes",],
  },
  {
    name: "Systems & Robotics",
    domain: "bridge",
    blurb: "Performance-sensitive code that talks to machines.",
    skills: ["C++", "C", "Go Lang", "Python", "Robotics", "ROS", "RTOS", "Linux", "Embedded Linux", "Microcontrollers",],
  },
  {
    name: "Embedded & Hardware",
    domain: "hardware",
    blurb: "Software that lives on devices, on a Computer Engineering foundation.",
    skills: ["Prototyping", "Microcontrollers", "Sensors", "Actuators", "PCB design", "Circuit design", "Signal processing", "Power management", "Wireless protocols"],
  },
];

/** Built from the roles on your page. */
export const journey: Step[] = [
    { kind: "Embedded", domain: "software", role: "Software Engineer Intern", where: "Nokia", when: "Dec 2019 – March 2020" },
    { kind: "Support Engineer", domain: "software", role: "CIE Operator", where: "FactSet", when: "July 2020 – March 2021" },
    { kind: "Full stack", domain: "software", role: "Full Stack Developer", where: "Tesda", when: "Sept 2021 – June 2022" },
    { kind: "Embedded", domain: "hardware", role: "Embedded Software Engineer", where: "Thales", when: "July 2022 – Nov 2023" },
    { kind: "Robotics", domain: "bridge", role: "Robotics Software Engineer", where: "Dyson", when: "Dec 2023 – April 2025" },
    { kind: "Full stack", domain: "software", role: "Senior Software Engineer (Full Stack)", where: "Kivo Motion", when: "May 2025 – April 2026" },
];

export const journeyNote = "Alongside these roles: freelance software development since Dec 2019.";

/**
 * Personal and portfolio projects. TODO: add the work you are free to describe from Kivo Motion, Dyson, Thales and Tesda,
 * for example what you built, the scale, and the result.
 */
export const projectDetails: ProjectDetail[] = [
  {
    name: "Point of Sale",
    kind: "Web app",
    status: "Free Testing",
    summary: "A retail point of sale built around Philippine tax rules and an offline-first workflow.",
    highlights: [
      "VAT, VAT-exempt and zero-rated items, with VAT backed out of VAT-inclusive prices",
      "X and Z readings, an e-journal and void slips for closing the day",
      "Sales are saved on the device first and synced to Google Sheets at the end of the day",
      "An e-invoice queue ready to hand off to a relay",
    ],
    path: "/pos",
  },
  {
    name: "Healthcare Tracking System",
    kind: "Web app",
    status: "Preview",
    summary: "A central health record with separate views for patient, doctor, nurse, HMO and hospital.",
    highlights: [
      "Role-based access, so each role only sees and does its own part",
      "Nurses request HMO access, which is verified automatically",
      "Local-first sample data, with notes on moving to an API or serverless",
    ],
    path: "/healthcare",
  },
  {
    name: "Tournament Manager",
    kind: "Web app",
    status: "Free Use",
    summary: "Tournament management with brackets and matchups.",
    highlights: [
      "Bracket type selection",
      "Randomized matchup toggle",
      "Initials-based participant avatars",
    ],
    path: "/tournament",
  },
];

export const principles: Principle[] = [
  { title: "Local-first, honest about failure", text: "Apps should keep working without a connection, and say plainly when something did not save." },
  { title: "One job per piece", text: "Roles, layers and files each own one responsibility, so a change stays small and easy to review." },
  { title: "Respect the constraint", text: "Embedded work teaches you to care about memory, timing and power. I bring that care to web and mobile too." },
  { title: "Small slices, steady iteration", text: "Get a working slice in front of people, then refine it instead of polishing in the dark." },
  { title: "Support and delivery", text: "A production ready system doesnt mean perfection, it means it meets the needs of its users. Any issues or bugs are addressed in a timely manner." },
];