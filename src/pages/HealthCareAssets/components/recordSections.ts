export type RecordSection = "overview" | "vitals" | "labs" | "meds" | "history" | "consults" | "certs" | "hmo";

export const SECTION_LABELS: Record<RecordSection, string> = {
  overview: "Overview",
  vitals: "Vitals",
  labs: "Lab results",
  meds: "Medications",
  history: "Sickness history",
  consults: "Consultations",
  certs: "Certificates",
  hmo: "HMO",
};
