// Tabs + panel for the shared read-only sections, with room for role-specific extra tabs.
import { useState, type ReactNode } from "react";
import { NeoTabs } from "../../../theme/AppTheme";
import { RecordPanel } from "./RecordPanel";
import { SECTION_LABELS, type RecordSection } from "./recordSections";

export function RecordTabs({
  patientId,
  sections,
  isDark,
  extras = {},
}: {
  patientId: string;
  sections: RecordSection[];
  isDark: boolean;
  /** Role-specific content rendered ABOVE the read-only panel of the same section (forms, queues). */
  extras?: Partial<Record<RecordSection, ReactNode>>;
}) {
  const [active, setActive] = useState<RecordSection>(sections[0]);
  const current = sections.includes(active) ? active : sections[0];
  return (
    <>
      <NeoTabs isDark={isDark} active={current} onChange={setActive} tabs={sections.map((s) => ({ id: s, label: SECTION_LABELS[s] }))} />
      {extras[current]}
      <RecordPanel section={current} patientId={patientId} isDark={isDark} />
    </>
  );
}
