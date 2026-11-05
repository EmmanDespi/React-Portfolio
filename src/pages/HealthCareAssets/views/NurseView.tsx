// NURSE VIEW: observe, collect, enter raw results, request HMO access.
// No diagnosing, prescribing, analyzing or signing (see permissions.ts).
import { useState } from "react";
import { NeoBadge, NeoButton, NeoEmpty, NeoListItem, NeoSection } from "../../../theme/AppTheme";
import { AppColors } from "../../../theme/tokens";
import { ActionForm, ErrorText } from "../components/ActionForm";
import { useAction } from "../components/actionFormHelpers";
import { PatientPicker } from "../components/PatientPicker";
import { RecordTabs } from "../components/RecordTabs";
import { selectRecord } from "../selectors";
import { useDb } from "../store";
import { enterLabResult, markSampleCollected, recordVitals } from "../services/nurseService";
import { requestAuthorization } from "../services/hmoService";
import type { Actor } from "../types";
import { fmtDate } from "../utils";

export default function NurseView({ actor, isDark }: { actor: Actor; isDark: boolean }) {
  const db = useDb();
  const [patientId, setPatientId] = useState(db.patients[0]?.id ?? "");
  const { error, run } = useAction();
  const rec = selectRecord(db, patientId);
  const hmo = db.hmos.find((h) => h.id === rec.patient?.hmoId);
  const open = rec.labRequests.filter((q) => q.status !== "resulted");

  return (
    <>
      <PatientPicker patients={db.patients} value={patientId} onChange={setPatientId} isDark={isDark} />
      <ErrorText text={error} />
      <RecordTabs
        key={patientId}
        patientId={patientId}
        isDark={isDark}
        sections={["overview", "vitals", "labs", "meds", "hmo"]}
        extras={{
          vitals: (
            <NeoSection title="Record vitals" isDark={isDark}>
              <ActionForm isDark={isDark} submitLabel="Save vitals" onSubmit={(v) => recordVitals(actor, patientId, { bp: v.bp, hr: v.hr, tempC: v.tempC, spo2: v.spo2 })}
                fields={[{ key: "bp", label: "Blood pressure", placeholder: "120/80" }, { key: "hr", label: "Heart rate (bpm)" }, { key: "tempC", label: "Temperature (C)" }, { key: "spo2", label: "SpO2 (%)" }]} />
            </NeoSection>
          ),
          labs: (
            <NeoSection title="Lab queue" isDark={isDark}>
              {open.length === 0 && <NeoEmpty text="No open lab requests for this patient." isDark={isDark} />}
              {open.map((q) => (
                <NeoListItem key={q.id} isDark={isDark} title={q.test} meta={`Requested ${fmtDate(q.at)}`} badge={<NeoBadge text={q.status} tone="warn" />}
                  actions={
                    q.status === "requested" ? (
                      <NeoButton label="Mark sample collected" fontSize={12} isDark={isDark} color={AppColors.lime} labelColor={AppColors.ink} onPressed={() => run(() => markSampleCollected(actor, q.id))} />
                    ) : (
                      <ActionForm isDark={isDark} submitLabel="Save results" onSubmit={(v) => enterLabResult(actor, q.id, v.values)}
                        fields={[{ key: "values", label: "One per line: name | value | unit | low-high", multiline: true, placeholder: "Hemoglobin | 13.4 | g/dL | 12-16" }]} />
                    )
                  } />
              ))}
            </NeoSection>
          ),
          hmo: (
            <NeoSection title="Request HMO access" isDark={isDark}>
              <ActionForm isDark={isDark} submitLabel="Send to HMO" onSubmit={(v) => requestAuthorization(actor, patientId, v.procedure)}
                fields={[{ key: "procedure", label: `Procedure (${hmo?.name ?? "HMO"} covers these)`, options: hmo?.coveredProcedures ?? [] }]} />
            </NeoSection>
          ),
        }}
      />
    </>
  );
}
