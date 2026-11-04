// ============================================================
// Healthcare domain types. Keep these in sync with your future
// API / database schema (one collection/table per array in HealthDb).
// ============================================================

export type Role = "patient" | "doctor" | "nurse" | "hmo" | "admin";

/** The signed-in identity. In production this comes from your auth session / token claims. */
export interface Actor {
  role: Role;
  id: string; // patient id, staff id, or hmo id depending on role
}

export type Action =
  | "record.view.own"
  | "record.view.any"
  | "cert.request"
  | "cert.issue"
  | "consult.write"
  | "med.prescribe"
  | "lab.request"
  | "lab.analyze"
  | "lab.collect"
  | "lab.result.enter"
  | "vitals.write"
  | "hmo.request"
  | "hmo.respond"
  | "hmo.view"
  | "staff.manage"
  | "audit.view";

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  location: string;
  bloodType: string;
  allergies: string[];
  policyNum: number;
  policyLevel: string;
  hmoId: string;
  /** Set once, at account creation, after the HMO confirms membership. */
  hmoVerified: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: "doctor" | "nurse" | "admin";
  department: string;
  specialty: string;
  license: string;
  active: boolean;
}

export interface Hmo {
  id: string;
  name: string;
  coveredProcedures: string[];
}

export interface Vitals {
  id: string; patientId: string; takenBy: string; at: string;
  bp: string; hr: number; tempC: number; spo2: number;
}
export interface Condition {
  id: string; patientId: string; name: string; since: string; status: "active" | "resolved";
}
export interface Medication {
  id: string; patientId: string; name: string; dose: string; frequency: string;
  prescribedBy: string; startedAt: string; active: boolean;
}
export interface Consultation {
  id: string; patientId: string; doctorId: string; at: string;
  complaint: string; diagnosis: string; notes: string;
}
export interface LabRequest {
  id: string; patientId: string; requestedBy: string; test: string; at: string;
  status: "requested" | "collected" | "resulted";
}
export interface LabValue {
  name: string; value: number; unit: string; low?: number; high?: number;
  flag: "low" | "normal" | "high";
}
export interface LabResult {
  id: string; requestId: string; patientId: string; test: string; enteredBy: string; at: string;
  values: LabValue[]; analysis?: string; analyzedBy?: string;
}
export interface Certificate {
  id: string; patientId: string; type: string; reason: string;
  status: "requested" | "issued"; requestedAt: string;
  issuedBy?: string; issuedAt?: string; note?: string;
}
export interface Authorization {
  id: string; patientId: string; hmoId: string; requestedBy: string; procedure: string;
  /** "verified" = membership confirmed instantly, waiting for the HMO coverage decision. */
  status: "verified" | "approved" | "denied";
  verifiedAt: string; respondedAt?: string; coveredAmount?: number; remarks?: string;
}
export interface AuditEntry {
  id: string; at: string; actorRole: Role; actorId: string; action: string; detail: string;
}

export interface HealthDb {
  patients: Patient[];
  staff: Staff[];
  hmos: Hmo[];
  vitals: Vitals[];
  conditions: Condition[];
  medications: Medication[];
  consultations: Consultation[];
  labRequests: LabRequest[];
  labResults: LabResult[];
  certificates: Certificate[];
  authorizations: Authorization[];
  audit: AuditEntry[];
}
