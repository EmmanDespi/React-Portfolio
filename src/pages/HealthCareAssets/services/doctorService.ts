// ============================================================
// DOCTOR PROCESSES (decide, prescribe, sign)
// Doctors approve and generate documents: consultations, prescriptions,
// lab requests, lab analysis, certificates.
//
// SERVERLESS endpoints (one cloud function each, role = doctor):
//   POST  /patients/:id/consultations
//   POST  /patients/:id/medications          PATCH /medications/:id
//   POST  /patients/:id/lab-requests
//   PATCH /lab-results/:id/analysis
//   PATCH /certificates/:id/issue            POST  /patients/:id/certificates
// ============================================================
import type { Actor } from "../types";
import { mutate } from "../store";
import { assertCan } from "../permissions";
import { logAudit } from "./audit";
import { newId, nowIso, required } from "../utils";

export function addConsultation(actor: Actor, patientId: string, i: { complaint: string; diagnosis: string; notes: string }) {
  assertCan(actor, "consult.write");
  const complaint = required(i.complaint, "Complaint");
  const diagnosis = i.diagnosis.trim();
  mutate((db) => {
    db.consultations.push({ id: newId("co"), patientId, doctorId: actor.id, at: nowIso(), complaint, diagnosis, notes: i.notes.trim() });
    // A diagnosis becomes part of the patient's sickness history.
    if (diagnosis) db.conditions.push({ id: newId("c"), patientId, name: diagnosis, since: nowIso(), status: "active" });
    logAudit(db, actor, "consult.write", `${patientId}: ${diagnosis || complaint}`);
  });
}

export function prescribeMedication(actor: Actor, patientId: string, i: { name: string; dose: string; frequency: string }) {
  assertCan(actor, "med.prescribe");
  const name = required(i.name, "Medication");
  mutate((db) => {
    const patient = db.patients.find((p) => p.id === patientId);
    // Safety net shown to the doctor before saving.
    if (patient?.allergies.some((a) => name.toLowerCase().includes(a.toLowerCase()))) {
      throw new Error(`${patient.name} is allergic to ${name}.`);
    }
    db.medications.push({ id: newId("m"), patientId, name, dose: i.dose.trim(), frequency: i.frequency.trim(), prescribedBy: actor.id, startedAt: nowIso(), active: true });
    logAudit(db, actor, "med.prescribe", `${patientId}: ${name} ${i.dose}`);
  });
}

export function stopMedication(actor: Actor, medicationId: string) {
  assertCan(actor, "med.prescribe");
  mutate((db) => {
    const m = db.medications.find((x) => x.id === medicationId);
    if (!m) throw new Error("Medication not found.");
    m.active = false;
    logAudit(db, actor, "med.stop", `${m.patientId}: ${m.name}`);
  });
}

export function requestLab(actor: Actor, patientId: string, test: string) {
  assertCan(actor, "lab.request");
  const t = required(test, "Test name");
  mutate((db) => {
    db.labRequests.push({ id: newId("lr"), patientId, requestedBy: actor.id, test: t, at: nowIso(), status: "requested" });
    logAudit(db, actor, "lab.request", `${patientId}: ${t}`);
  });
}

export function analyzeLabResult(actor: Actor, resultId: string, analysis: string) {
  assertCan(actor, "lab.analyze");
  const text = required(analysis, "Analysis");
  mutate((db) => {
    const r = db.labResults.find((x) => x.id === resultId);
    if (!r) throw new Error("Lab result not found.");
    r.analysis = text;
    r.analyzedBy = actor.id;
    logAudit(db, actor, "lab.analyze", `${r.patientId}: ${r.test}`);
  });
}

/** Sign a certificate the patient asked for. */
export function issueCertificate(actor: Actor, certificateId: string, note: string) {
  assertCan(actor, "cert.issue");
  mutate((db) => {
    const c = db.certificates.find((x) => x.id === certificateId);
    if (!c) throw new Error("Certificate request not found.");
    c.status = "issued";
    c.issuedBy = actor.id;
    c.issuedAt = nowIso();
    c.note = note.trim();
    logAudit(db, actor, "cert.issue", `${c.patientId}: ${c.type}`);
  });
}

/** Create and sign a certificate directly (no patient request). */
export function createCertificate(actor: Actor, patientId: string, i: { type: string; reason: string; note: string }) {
  assertCan(actor, "cert.issue");
  const type = required(i.type, "Certificate type");
  mutate((db) => {
    const now = nowIso();
    db.certificates.push({ id: newId("ce"), patientId, type, reason: i.reason.trim(), status: "issued", requestedAt: now, issuedBy: actor.id, issuedAt: now, note: i.note.trim() });
    logAudit(db, actor, "cert.issue", `${patientId}: ${type}`);
  });
}
