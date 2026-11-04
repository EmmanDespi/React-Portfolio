// DOCTOR VIEW: full record access plus the decisions only a doctor can make.
import { useState } from "react";
import { NeoButton, NeoEmpty, NeoListItem, NeoSection, AppColors } from "../../../theme/AppTheme";
import { ActionForm, ErrorText, useAction } from "../components/ActionForm";
import { PatientPicker } from "../components/PatientPicker";
import { RecordTabs } from "../components/RecordTabs";
import { selectRecord } from "../selectors";
import { useDb } from "../store";
import { addConsultation, analyzeLabResult, createCertificate, issueCertificate, prescribeMedication, requestLab, stopMedication } from "../services/doctorService";
import type { Actor } from "../types";
import { fmtDate } from "../utils";

export default function DoctorView({ actor, isDark }: { actor: Actor; isDark: boolean }) {
  const db = useDb();
  const [patientId, setPatientId] = useState(db.patients[0]?.id ?? "");
  const { error, run } = useAction();
  const rec = selectRecord(db, patientId);

  return (
    <>
      <PatientPicker patients={db.patients} value={patientId} onChange={setPatientId} isDark={isDark} />
      <ErrorText text={error} />
      <RecordTabs
        key={patientId}
        patientId={patientId}
        isDark={isDark}
        sections={["overview", "consults", "labs", "meds", "certs", "history", "vitals", "hmo"]}
        extras={{
          consults: (
            <NeoSection title="New consultation" isDark={isDark}>
              <ActionForm isDark={isDark} submitLabel="Save consultation" onSubmit={(v) => addConsultation(actor, patientId, { complaint: v.complaint, diagnosis: v.diagnosis, notes: v.notes })}
                fields={[
                  { key: "complaint", label: "Complaint", multiline: true },
                  { key: "diagnosis", label: "Diagnosis (added to sickness history)" },
                  { key: "notes", label: "Analysis and advice", multiline: true },
                ]} />
            </NeoSection>
          ),
          labs: (
            <>
              <NeoSection title="Results to analyze" isDark={isDark}>
                {rec.labResults.filter((r) => !r.analysis).length === 0 && <NeoEmpty text="Nothing waiting for your analysis." isDark={isDark} />}
                {rec.labResults.filter((r) => !r.analysis).map((r) => (
                  <NeoListItem key={r.id} isDark={isDark} title={r.test} meta={fmtDate(r.at)} subtitle={r.values.map((v) => `${v.name}: ${v.value} ${v.unit} (${v.flag})`).join("\n")}
                    actions={<ActionForm isDark={isDark} submitLabel="Save analysis" fields={[{ key: "analysis", label: "Analysis", multiline: true }]} onSubmit={(v) => analyzeLabResult(actor, r.id, v.analysis)} />} />
                ))}
              </NeoSection>
              <NeoSection title="Request a lab test" isDark={isDark}>
                <ActionForm isDark={isDark} submitLabel="Send lab request" onSubmit={(v) => requestLab(actor, patientId, v.test)}
                  fields={[{ key: "test", label: "Test", options: ["Complete Blood Count", "Lipid Profile", "Urinalysis", "Chest X-ray", "ECG"] }]} />
              </NeoSection>
            </>
          ),
          meds: (
            <>
              <NeoSection title="Prescribe" isDark={isDark}>
                <ActionForm isDark={isDark} submitLabel="Prescribe" onSubmit={(v) => prescribeMedication(actor, patientId, { name: v.name, dose: v.dose, frequency: v.frequency })}
                  fields={[{ key: "name", label: "Medication" }, { key: "dose", label: "Dose", placeholder: "10 mg" }, { key: "frequency", label: "Frequency", placeholder: "Once daily" }]} />
              </NeoSection>
              {rec.medications.filter((m) => m.active).length > 0 && (
                <NeoSection title="Stop a medication" isDark={isDark}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {rec.medications.filter((m) => m.active).map((m) => (
                      <NeoButton key={m.id} label={`Stop ${m.name}`} fontSize={12} isDark={isDark} color={AppColors.coral} labelColor={AppColors.ink} onPressed={() => run(() => stopMedication(actor, m.id))} />
                    ))}
                  </div>
                </NeoSection>
              )}
            </>
          ),
          certs: (
            <>
              <NeoSection title="Requests to sign" isDark={isDark}>
                {rec.certificates.filter((c) => c.status === "requested").length === 0 && <NeoEmpty text="No pending certificate requests." isDark={isDark} />}
                {rec.certificates.filter((c) => c.status === "requested").map((c) => (
                  <NeoListItem key={c.id} isDark={isDark} title={c.type} subtitle={c.reason} meta={`Requested ${fmtDate(c.requestedAt)}`}
                    actions={<ActionForm isDark={isDark} submitLabel="Sign and issue" fields={[{ key: "note", label: "Note on the certificate", multiline: true }]} onSubmit={(v) => issueCertificate(actor, c.id, v.note)} />} />
                ))}
              </NeoSection>
              <NeoSection title="Issue a new certificate" isDark={isDark}>
                <ActionForm isDark={isDark} submitLabel="Issue certificate" onSubmit={(v) => createCertificate(actor, patientId, { type: v.type, reason: v.reason, note: v.note })}
                  fields={[{ key: "type", label: "Type", options: ["Medical certificate", "Fit to work", "Lab permission"] }, { key: "reason", label: "Reason" }, { key: "note", label: "Note", multiline: true }]} />
              </NeoSection>
            </>
          ),
        }}
      />
    </>
  );
}
