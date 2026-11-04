// Every service action leaves an audit entry (shown in the Hospital view).
// SERVERLESS: write these server-side (cloud function / DB trigger) so they cannot be edited by users.
import type { Actor, HealthDb } from "../types";
import { newId, nowIso } from "../utils";

export function logAudit(db: HealthDb, actor: Actor, action: string, detail: string) {
  db.audit.unshift({ id: newId("aud"), at: nowIso(), actorRole: actor.role, actorId: actor.id, action, detail });
}
