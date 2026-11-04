// PATIENT VIEW: sees only their own record and can request certificates.
import { NeoSection } from "../../../theme/AppTheme";
import { ActionForm } from "../components/ActionForm";
import { RecordTabs } from "../components/RecordTabs";
import { requestCertificate } from "../services/patientService";
import type { Actor } from "../types";

export default function PatientView({ actor, isDark }: { actor: Actor; isDark: boolean }) {
  return (
    <RecordTabs
      patientId={actor.id} // always the signed-in patient, never chosen from the UI
      isDark={isDark}
      sections={["overview", "labs", "meds", "history", "consults", "certs", "vitals", "hmo"]}
      extras={{
        certs: (
          <NeoSection title="Request a certificate" isDark={isDark}>
            <ActionForm
              isDark={isDark}
              submitLabel="Send request"
              fields={[
                { key: "type", label: "Type", options: ["Medical certificate", "Fit to work", "Lab permission"] },
                { key: "reason", label: "Reason", placeholder: "Why do you need it?", multiline: true },
              ]}
              onSubmit={(v) => requestCertificate(actor, { type: v.type, reason: v.reason })}
            />
          </NeoSection>
        ),
      }}
    />
  );
}
