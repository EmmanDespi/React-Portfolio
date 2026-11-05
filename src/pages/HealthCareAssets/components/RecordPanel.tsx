// Read-only panels of a patient record. Patient, doctor and nurse views reuse them,
// each view decides which sections to show (that is the role separation for reading).
import { NeoBadge, NeoEmpty, NeoListItem, NeoRows, NeoSection } from "../../../theme/AppTheme";
// import type { NeoTone } from "../../../theme/AppTheme";
import { useDb } from "../store";
import { selectRecord, staffName } from "../selectors";
import { fmtDate, fmtMoney } from "../utils";
import type { RecordSection } from "./recordSections";

export function RecordPanel({ section, patientId, isDark }: { section: RecordSection; patientId: string; isDark: boolean }) {
  const db = useDb();
  const r = selectRecord(db, patientId);
  const hmo = db.hmos.find((h) => h.id === r.patient?.hmoId);
  if (!r.patient) return <NeoEmpty text="Patient not found." isDark={isDark} />;

  switch (section) {
    case "overview":
      return (
        <NeoSection title="Summary" isDark={isDark}>
          <NeoRows
            isDark={isDark}
            rows={[
              ["Birth date", fmtDate(r.patient.birthDate)],
              ["Blood type", r.patient.bloodType],
              ["Allergies", r.patient.allergies.join(", ") || "None recorded"],
              ["HMO", `${hmo?.name ?? "-"} (${r.patient.policyLevel})`],
              ["Active conditions", r.conditions.filter((c) => c.status === "active").length],
              ["Active medications", r.medications.filter((m) => m.active).length],
            ]}
          />
        </NeoSection>
      );

    case "vitals":
      return (
        <NeoSection title="Vitals" isDark={isDark}>
          {r.vitals.length === 0 && <NeoEmpty text="No vitals recorded yet." isDark={isDark} />}
          {r.vitals.map((v) => (
            <NeoListItem key={v.id} isDark={isDark} title={`BP ${v.bp}  |  HR ${v.hr}`} subtitle={`Temp ${v.tempC} C  |  SpO2 ${v.spo2}%`} meta={`${fmtDate(v.at)} by ${staffName(db, v.takenBy)}`} />
          ))}
        </NeoSection>
      );

    case "labs":
      return (
        <>
          <NeoSection title="Lab results" isDark={isDark}>
            {r.labResults.length === 0 && <NeoEmpty text="No results yet." isDark={isDark} />}
            {r.labResults.map((res) => (
              <NeoListItem
                key={res.id}
                isDark={isDark}
                title={res.test}
                subtitle={res.values.map((v) => `${v.name}: ${v.value} ${v.unit} (${v.flag})`).join("\n")}
                meta={`${fmtDate(res.at)}${res.analysis ? ` | ${staffName(db, res.analyzedBy ?? "")}: ${res.analysis}` : ""}`}
                badge={<NeoBadge text={res.analysis ? "Analyzed" : "Awaiting analysis"} tone={res.analysis ? "ok" : "warn"} />}
              />
            ))}
          </NeoSection>
          <NeoSection title="Lab requests" isDark={isDark}>
            {r.labRequests.length === 0 && <NeoEmpty text="No lab requests." isDark={isDark} />}
            {r.labRequests.map((q) => (
              <NeoListItem key={q.id} isDark={isDark} title={q.test} meta={`${fmtDate(q.at)} | requested by ${staffName(db, q.requestedBy)}`} badge={<NeoBadge text={q.status} tone={q.status === "resulted" ? "ok" : "warn"} />} />
            ))}
          </NeoSection>
        </>
      );

    case "meds":
      return (
        <NeoSection title="Medications" isDark={isDark}>
          {r.medications.length === 0 && <NeoEmpty text="No medications." isDark={isDark} />}
          {r.medications.map((m) => (
            <NeoListItem key={m.id} isDark={isDark} title={m.name} subtitle={`${m.dose} | ${m.frequency}`} meta={`Since ${fmtDate(m.startedAt)} | ${staffName(db, m.prescribedBy)}`} badge={<NeoBadge text={m.active ? "Active" : "Stopped"} tone={m.active ? "ok" : "neutral"} />} />
          ))}
        </NeoSection>
      );

    case "history":
      return (
        <NeoSection title="Sickness history" isDark={isDark}>
          {r.conditions.length === 0 && <NeoEmpty text="No conditions recorded." isDark={isDark} />}
          {r.conditions.map((c) => (
            <NeoListItem key={c.id} isDark={isDark} title={c.name} meta={`Since ${fmtDate(c.since)}`} badge={<NeoBadge text={c.status} tone={c.status === "active" ? "warn" : "ok"} />} />
          ))}
        </NeoSection>
      );

    case "consults":
      return (
        <NeoSection title="Consultations" isDark={isDark}>
          {r.consultations.length === 0 && <NeoEmpty text="No consultations yet." isDark={isDark} />}
          {r.consultations.map((c) => (
            <NeoListItem key={c.id} isDark={isDark} title={c.diagnosis || c.complaint} subtitle={`${c.complaint}\n${c.notes}`} meta={`${fmtDate(c.at)} | ${staffName(db, c.doctorId)}`} />
          ))}
        </NeoSection>
      );

    case "certs":
      return (
        <NeoSection title="Certificates and requests" isDark={isDark}>
          {r.certificates.length === 0 && <NeoEmpty text="No certificates yet." isDark={isDark} />}
          {r.certificates.map((c) => (
            <NeoListItem key={c.id} isDark={isDark} title={c.type} subtitle={`${c.reason}${c.note ? `\nDoctor's note: ${c.note}` : ""}`} meta={c.issuedAt ? `Issued ${fmtDate(c.issuedAt)} by ${staffName(db, c.issuedBy ?? "")}` : `Requested ${fmtDate(c.requestedAt)}`} badge={<NeoBadge text={c.status === "issued" ? "Issued" : "Pending"} tone={c.status === "issued" ? "ok" : "warn"} />} />
          ))}
        </NeoSection>
      );

    case "hmo":
      return (
        <NeoSection title={`HMO: ${hmo?.name ?? "-"}`} isDark={isDark}>
          <NeoRows isDark={isDark} rows={[["Policy number", r.patient.policyNum], ["Policy level", r.patient.policyLevel], ["Membership", r.patient.hmoVerified ? "Verified" : "Not verified"]]} />
          <div style={{ height: 12 }} />
          {r.authorizations.length === 0 && <NeoEmpty text="No HMO requests yet." isDark={isDark} />}
          {r.authorizations.map((a) => (
            <NeoListItem key={a.id} isDark={isDark} title={a.procedure} subtitle={a.status === "approved" ? `Covered: ${fmtMoney(a.coveredAmount)}` : a.remarks} meta={`${fmtDate(a.verifiedAt)} | requested by ${staffName(db, a.requestedBy)}`} badge={<NeoBadge text={a.status === "verified" ? "Awaiting HMO" : a.status} tone={a.status === "approved" ? "ok" : a.status === "denied" ? "bad" : "warn"} />} />
          ))}
        </NeoSection>
      );
  }
}
