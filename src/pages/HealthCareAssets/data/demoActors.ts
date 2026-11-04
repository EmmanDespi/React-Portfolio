// ============================================================
// DEMO SESSIONS (one sample login per role)
// SERVERLESS: delete this file. Build `Actor` from your auth
// provider instead, e.g. Firebase Auth `getIdTokenResult().claims.role`,
// Supabase `session.user.app_metadata.role`, or a decoded JWT.
// ============================================================
import type { Actor, Role } from "../types";

export const DEMO_ACTORS: Record<Role, Actor> = {
  patient: { role: "patient", id: "pt-101" },
  doctor: { role: "doctor", id: "dr-1" },
  nurse: { role: "nurse", id: "nr-1" },
  hmo: { role: "hmo", id: "hmo-1" },
  admin: { role: "admin", id: "adm-1" },
};

export const ROLE_LABELS: Record<Role, { label: string; hint: string }> = {
  patient: { label: "Patient", hint: "My health record" },
  doctor: { label: "Doctor", hint: "Diagnose, prescribe, sign" },
  nurse: { label: "Nurse", hint: "Vitals, samples, HMO requests" },
  hmo: { label: "HMO", hint: "Verify and approve coverage" },
  admin: { label: "Hospital", hint: "Staff access and audit" },
};
