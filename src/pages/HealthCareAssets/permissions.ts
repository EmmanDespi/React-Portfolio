// ============================================================
// ROLE-BASED ACCESS CONTROL
// One table decides who can do what. Doctors and nurses have
// different actions on purpose: doctors decide and sign, nurses
// observe, collect and coordinate.
//
// SERVERLESS: mirror this table in your backend (custom claims +
// security rules / RLS policies / API gateway authorizer).
// ============================================================
import type { Action, Actor, Role } from "./types";
import { getDb } from "./store";

export const PERMISSIONS: Record<Role, Action[]> = {
  patient: ["record.view.own", "cert.request"],
  doctor: ["record.view.any", "consult.write", "med.prescribe", "lab.request", "lab.analyze", "cert.issue"],
  nurse: ["record.view.any", "vitals.write", "lab.collect", "lab.result.enter", "hmo.request"],
  hmo: ["hmo.view", "hmo.respond"],
  admin: ["staff.manage", "audit.view"],
};

export const can = (role: Role, action: Action) => PERMISSIONS[role].includes(action);

/** Throws when the actor is not allowed (or the staff account is disabled). */
export function assertCan(actor: Actor, action: Action) {
  if (!can(actor.role, action)) {
    throw new Error(`Your role (${actor.role}) is not allowed to do this.`);
  }
  if (actor.role === "doctor" || actor.role === "nurse") {
    const staff = getDb().staff.find((s) => s.id === actor.id);
    if (!staff?.active) throw new Error("This staff account is disabled.");
  }
}

/** Patients see only themselves, clinicians see everyone, the HMO sees its own members. */
export function canViewPatient(actor: Actor, patientId: string): boolean {
  if (actor.role === "patient") return actor.id === patientId;
  if (actor.role === "doctor" || actor.role === "nurse") return true;
  if (actor.role === "hmo") return getDb().patients.some((p) => p.id === patientId && p.hmoId === actor.id);
  return false;
}
