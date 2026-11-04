// ============================================================
// HMO PROCESSES  (two-way API)
//
//  Nurse  ──requestAuthorization()──►  HMO API  (membership verified instantly,
//                                              because the HMO already verified
//                                              the member at account creation)
//  HMO    ──respondAuthorization()──►  Hospital (approve / deny + covered amount)
//
// Here both sides are simulated locally. SERVERLESS / API version:
//  - requestAuthorization: POST {HMO_API}/eligibility  then  POST {HMO_API}/authorizations
//    (a cloud function holds the HMO API key; never call it from the browser).
//  - respondAuthorization: replace with a webhook, e.g. POST /webhooks/hmo/decision,
//    verified by signature, which updates the authorization row. Clients then get
//    the change through realtime updates or polling.
// ============================================================
import type { Actor } from "../types";
import { getDb, mutate } from "../store";
import { assertCan } from "../permissions";
import { logAudit } from "./audit";
import { newId, nowIso, required } from "../utils";

const fakeLatency = () => new Promise((r) => setTimeout(r, 400));

export async function requestAuthorization(actor: Actor, patientId: string, procedure: string) {
  assertCan(actor, "hmo.request");
  const proc = required(procedure, "Procedure");
  await fakeLatency(); // stands in for the HMO API round trip

  const db = getDb();
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) throw new Error("Patient not found.");
  if (!patient.hmoVerified) throw new Error("This patient's HMO membership is not verified.");

  mutate((draft) => {
    draft.authorizations.push({
      id: newId("au"), patientId, hmoId: patient.hmoId, requestedBy: actor.id,
      procedure: proc, status: "verified", verifiedAt: nowIso(),
    });
    logAudit(draft, actor, "hmo.request", `${patientId}: ${proc}`);
  });
}

export function respondAuthorization(
  actor: Actor,
  authId: string,
  decision: "approved" | "denied",
  input: { coveredAmount?: string; remarks?: string },
) {
  assertCan(actor, "hmo.respond");
  mutate((db) => {
    const a = db.authorizations.find((x) => x.id === authId);
    if (!a) throw new Error("Authorization not found.");
    if (a.hmoId !== actor.id) throw new Error("This request belongs to a different HMO.");
    if (a.status !== "verified") throw new Error("This request already has a decision.");
    const amount = input.coveredAmount?.trim() ? Number(input.coveredAmount) : undefined;
    if (amount !== undefined && !Number.isFinite(amount)) throw new Error("Covered amount must be a number.");
    a.status = decision;
    a.respondedAt = nowIso();
    a.coveredAmount = decision === "approved" ? amount : undefined;
    a.remarks = input.remarks?.trim() || undefined;
    logAudit(db, actor, "hmo.respond", `${a.patientId}: ${a.procedure} ${decision}`);
  });
}
