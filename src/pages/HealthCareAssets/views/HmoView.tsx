// HMO VIEW: sees only its own members and their authorization requests.
// SERVERLESS: this screen becomes the HMO's own portal, or a webhook consumer on their side.
import { NeoBadge, NeoEmpty, NeoListItem, NeoSection } from "../../../theme/AppTheme";
import { AppColors } from "../../../theme/tokens";
import { ActionForm, ErrorText } from "../components/ActionForm";
import { useAction } from "../components/actionFormHelpers";
import { useDb } from "../store";
import { staffName } from "../selectors";
import { respondAuthorization } from "../services/hmoService";
import type { Actor } from "../types";
import { fmtDate, fmtMoney } from "../utils";
import { NeoButton } from "../../../theme/AppTheme";

export default function HmoView({ actor, isDark }: { actor: Actor; isDark: boolean }) {
  const db = useDb();
  const { error, run } = useAction();
  const members = db.patients.filter((p) => p.hmoId === actor.id);
  const auths = db.authorizations.filter((a) => a.hmoId === actor.id).sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  const pending = auths.filter((a) => a.status === "verified");
  const done = auths.filter((a) => a.status !== "verified");
  const nameOf = (id: string) => db.patients.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <ErrorText text={error} />
      <NeoSection title={`Needs a decision (${pending.length})`} isDark={isDark}>
        {pending.length === 0 && <NeoEmpty text="No pending requests." isDark={isDark} />}
        {pending.map((a) => (
          <NeoListItem key={a.id} isDark={isDark} title={`${nameOf(a.patientId)}: ${a.procedure}`} meta={`Member verified ${fmtDate(a.verifiedAt)} | requested by ${staffName(db, a.requestedBy)}`} badge={<NeoBadge text="Verified" tone="info" />}
            actions={
              <ActionForm isDark={isDark} submitLabel="Approve" onSubmit={(v) => respondAuthorization(actor, a.id, "approved", { coveredAmount: v.amount, remarks: v.remarks })}
                fields={[{ key: "amount", label: "Covered amount (PHP)" }, { key: "remarks", label: "Remarks" }]} />
            }
          />
        ))}
        {pending.map((a) => (
          <div key={`deny-${a.id}`} style={{ marginBottom: 8 }}>
            <NeoButton label={`Deny: ${a.procedure} (${nameOf(a.patientId)})`} fontSize={12} isDark={isDark} color={AppColors.coral} labelColor={AppColors.ink} onPressed={() => run(() => respondAuthorization(actor, a.id, "denied", { remarks: "Not covered by plan." }))} />
          </div>
        ))}
      </NeoSection>

      <NeoSection title="Decided" isDark={isDark}>
        {done.length === 0 && <NeoEmpty text="No decisions yet." isDark={isDark} />}
        {done.map((a) => (
          <NeoListItem key={a.id} isDark={isDark} title={`${nameOf(a.patientId)}: ${a.procedure}`} subtitle={a.status === "approved" ? `Covered ${fmtMoney(a.coveredAmount)}` : undefined} meta={a.remarks} badge={<NeoBadge text={a.status} tone={a.status === "approved" ? "ok" : "bad"} />} />
        ))}
      </NeoSection>

      <NeoSection title="Members" isDark={isDark}>
        {members.map((m) => (
          <NeoListItem key={m.id} isDark={isDark} title={m.name} subtitle={`Policy ${m.policyNum} | ${m.policyLevel}`} badge={<NeoBadge text={m.hmoVerified ? "Verified" : "Unverified"} tone={m.hmoVerified ? "ok" : "bad"} />} />
        ))}
      </NeoSection>
    </>
  );
}
