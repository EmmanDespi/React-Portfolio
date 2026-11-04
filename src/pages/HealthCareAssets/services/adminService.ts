// ============================================================
// HOSPITAL ADMIN PROCESSES (access and oversight, no clinical data)
// SERVERLESS: PATCH /staff/:id { active }  (also revoke the user's tokens)
//             GET   /audit?limit=100       (read-only, server-written)
// ============================================================
import type { Actor } from "../types";
import { mutate } from "../store";
import { assertCan } from "../permissions";
import { logAudit } from "./audit";

export function setStaffActive(actor: Actor, staffId: string, active: boolean) {
  assertCan(actor, "staff.manage");
  mutate((db) => {
    const s = db.staff.find((x) => x.id === staffId);
    if (!s) throw new Error("Staff member not found.");
    if (s.role === "admin") throw new Error("Admin accounts cannot be disabled here.");
    s.active = active;
    logAudit(db, actor, "staff.manage", `${s.name} ${active ? "enabled" : "disabled"}`);
  });
}
