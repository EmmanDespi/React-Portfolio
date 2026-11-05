// HOSPITAL ADMIN VIEW: staff access and the audit trail. No patient records here.
import { NeoBadge, NeoButton, NeoListItem, NeoRows, NeoSection } from "../../../theme/AppTheme";
import { AppColors } from "../../../theme/tokens";
import { ErrorText } from "../components/ActionForm";
import { useAction } from "../components/actionFormHelpers";
import { useDb } from "../store";
import { setStaffActive } from "../services/adminService";
import type { Actor } from "../types";

export default function HospitalAdminView({ actor, isDark }: { actor: Actor; isDark: boolean }) {
  const db = useDb();
  const { error, run } = useAction();
  const staff = db.staff.filter((s) => s.role !== "admin");

  return (
    <>
      <ErrorText text={error} />
      <NeoSection title="Overview" isDark={isDark}>
        <NeoRows isDark={isDark} rows={[
          ["Doctors", db.staff.filter((s) => s.role === "doctor" && s.active).length],
          ["Nurses", db.staff.filter((s) => s.role === "nurse" && s.active).length],
          ["Patients", db.patients.length],
          ["HMO partners", db.hmos.length],
        ]} />
      </NeoSection>

      <NeoSection title="Staff access" isDark={isDark}>
        {staff.map((s) => (
          <NeoListItem key={s.id} isDark={isDark} title={s.name} subtitle={`${s.role} | ${s.department}`} meta={s.license} badge={<NeoBadge text={s.active ? "Active" : "Disabled"} tone={s.active ? "ok" : "bad"} />}
            actions={<NeoButton label={s.active ? "Disable access" : "Enable access"} fontSize={12} isDark={isDark} color={s.active ? AppColors.coral : AppColors.lime} labelColor={AppColors.ink} onPressed={() => run(() => setStaffActive(actor, s.id, !s.active))} />} />
        ))}
      </NeoSection>

      <NeoSection title="Audit trail" isDark={isDark}>
        {db.audit.length === 0 && <div style={{ fontWeight: 600 }}>Actions by doctors, nurses and the HMO will appear here.</div>}
        {db.audit.slice(0, 30).map((a) => (
          <NeoListItem key={a.id} isDark={isDark} title={a.action} subtitle={a.detail} meta={`${new Date(a.at).toLocaleString()} | ${a.actorRole} ${a.actorId}`} />
        ))}
      </NeoSection>
    </>
  );
}
