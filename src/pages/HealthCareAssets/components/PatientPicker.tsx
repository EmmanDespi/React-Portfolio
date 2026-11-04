// Lets clinicians choose which patient they are working with.
// SERVERLESS: replace `patients` with a searchable, paginated API query (GET /patients?search=).
import { AppColors, NeoChip, NeoSection } from "../../../theme/AppTheme";
import type { Patient } from "../types";

export function PatientPicker({ patients, value, onChange, isDark }: { patients: Patient[]; value: string; onChange: (id: string) => void; isDark: boolean }) {
  return (
    <NeoSection title="Patients" isDark={isDark}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {patients.map((p) => (
          <NeoChip key={p.id} label={p.name} active={p.id === value} activeColor={AppColors.lime} isDark={isDark} onPressed={() => onChange(p.id)} />
        ))}
      </div>
    </NeoSection>
  );
}
