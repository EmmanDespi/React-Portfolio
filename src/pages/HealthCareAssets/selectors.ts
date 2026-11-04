// Read-only helpers that shape data for the screens.
import type { Actor, HealthDb } from "./types";

const newestFirst = <T>(items: T[], at: (t: T) => string) =>
  [...items].sort((a, b) => at(b).localeCompare(at(a)));

export function selectRecord(db: HealthDb, patientId: string) {
  const mine = <T extends { patientId: string }>(arr: T[]) => arr.filter((x) => x.patientId === patientId);
  return {
    patient: db.patients.find((p) => p.id === patientId),
    vitals: newestFirst(mine(db.vitals), (v) => v.at),
    conditions: newestFirst(mine(db.conditions), (c) => c.since),
    medications: newestFirst(mine(db.medications), (m) => m.startedAt),
    consultations: newestFirst(mine(db.consultations), (c) => c.at),
    labRequests: newestFirst(mine(db.labRequests), (r) => r.at),
    labResults: newestFirst(mine(db.labResults), (r) => r.at),
    certificates: newestFirst(mine(db.certificates), (c) => c.requestedAt),
    authorizations: newestFirst(mine(db.authorizations), (a) => a.verifiedAt),
  };
}

export const staffName = (db: HealthDb, id: string) => db.staff.find((s) => s.id === id)?.name ?? id;

/** Header info shown under the name, per role. */
export function describeActor(db: HealthDb, actor: Actor): { name: string; place: string; rows: [string, string | number][] } {
  if (actor.role === "patient") {
    const p = db.patients.find((x) => x.id === actor.id);
    return {
      name: p?.name ?? "Unknown patient",
      place: p?.location ?? "",
      rows: [["Policy Number", p?.policyNum ?? "-"], ["Policy Level", p?.policyLevel ?? "-"]],
    };
  }
  if (actor.role === "hmo") {
    const h = db.hmos.find((x) => x.id === actor.id);
    return {
      name: h?.name ?? "Unknown HMO",
      place: "HMO partner API",
      rows: [
        ["Members", db.patients.filter((p) => p.hmoId === actor.id).length],
        ["Covered procedures", h?.coveredProcedures.length ?? 0],
      ],
    };
  }
  const s = db.staff.find((x) => x.id === actor.id);
  return {
    name: s?.name ?? "Unknown staff",
    place: s?.department ?? "",
    rows: [["Specialty", s?.specialty ?? "-"], ["License", s?.license ?? "-"]],
  };
}
