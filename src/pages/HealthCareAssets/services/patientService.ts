// ============================================================
// PATIENT PROCESSES
// - Reading the own record is done through selectors (selectRecord).
// - Patients can only request things; clinicians decide.
//
// SERVERLESS: POST /certificates/requests  { type, reason }
//             (patient id comes from the auth token, never from the body)
// ============================================================
import type { Actor } from "../types";
import { mutate } from "../store";
import { assertCan } from "../permissions";
import { logAudit } from "./audit";
import { newId, nowIso, required } from "../utils";

export function requestCertificate(actor: Actor, input: { type: string; reason: string }) {
  assertCan(actor, "cert.request");
  const type = required(input.type, "Certificate type");
  const reason = required(input.reason, "Reason");
  mutate((db) => {
    db.certificates.push({ id: newId("ce"), patientId: actor.id, type, reason, status: "requested", requestedAt: nowIso() });
    logAudit(db, actor, "cert.request", `${type}: ${reason}`);
  });
}
