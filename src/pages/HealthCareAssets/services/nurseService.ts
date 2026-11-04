// ============================================================
// NURSE PROCESSES (observe, collect, coordinate)
// Nurses record vitals, collect samples, enter raw lab values and
// start HMO requests. They can NOT diagnose, prescribe, analyze or sign.
//
// SERVERLESS endpoints (role = nurse):
//   POST  /patients/:id/vitals
//   PATCH /lab-requests/:id/collected
//   POST  /lab-requests/:id/result
// (HMO requests live in hmoService.ts)
// ============================================================
import type { Actor, LabValue } from "../types";
import { mutate } from "../store";
import { assertCan } from "../permissions";
import { logAudit } from "./audit";
import { newId, nowIso, required } from "../utils";

export function recordVitals(actor: Actor, patientId: string, i: { bp: string; hr: string; tempC: string; spo2: string }) {
  assertCan(actor, "vitals.write");
  const bp = required(i.bp, "Blood pressure");
  const hr = Number(i.hr), tempC = Number(i.tempC), spo2 = Number(i.spo2);
  if ([hr, tempC, spo2].some((n) => !Number.isFinite(n))) throw new Error("Heart rate, temperature and SpO2 must be numbers.");
  mutate((db) => {
    db.vitals.push({ id: newId("v"), patientId, takenBy: actor.id, at: nowIso(), bp, hr, tempC, spo2 });
    logAudit(db, actor, "vitals.write", `${patientId}: BP ${bp}`);
  });
}

export function markSampleCollected(actor: Actor, requestId: string) {
  assertCan(actor, "lab.collect");
  mutate((db) => {
    const r = db.labRequests.find((x) => x.id === requestId);
    if (!r) throw new Error("Lab request not found.");
    if (r.status !== "requested") throw new Error("Sample was already collected.");
    r.status = "collected";
    logAudit(db, actor, "lab.collect", `${r.patientId}: ${r.test}`);
  });
}

/** One analyte per line:  name | value | unit | low-high   e.g.  Hemoglobin | 13.4 | g/dL | 12-16 */
export function parseLabValues(text: string): LabValue[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Enter at least one lab value.");
  return lines.map((line) => {
    const [name, val, unit = "", range = ""] = line.split("|").map((s) => s.trim());
    const value = Number(val);
    if (!name || !Number.isFinite(value)) throw new Error(`Cannot read: "${line}". Use: name | value | unit | low-high`);
    const [lo, hi] = range.split("-").map(Number);
    const low = Number.isFinite(lo) ? lo : undefined;
    const high = Number.isFinite(hi) ? hi : undefined;
    const flag: LabValue["flag"] = low !== undefined && value < low ? "low" : high !== undefined && value > high ? "high" : "normal";
    return { name, value, unit, low, high, flag };
  });
}

export function enterLabResult(actor: Actor, requestId: string, valuesText: string) {
  assertCan(actor, "lab.result.enter");
  const values = parseLabValues(valuesText);
  mutate((db) => {
    const r = db.labRequests.find((x) => x.id === requestId);
    if (!r) throw new Error("Lab request not found.");
    if (r.status !== "collected") throw new Error("Collect the sample before entering results.");
    r.status = "resulted";
    db.labResults.push({ id: newId("res"), requestId, patientId: r.patientId, test: r.test, enteredBy: actor.id, at: nowIso(), values });
    logAudit(db, actor, "lab.result.enter", `${r.patientId}: ${r.test}`);
  });
}
