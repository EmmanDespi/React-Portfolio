// Small form + action helpers shared by every role view.
// Services throw readable errors (permissions, validation); these show them inline.
import { useState } from "react";
import { AppColors, NeoButton, NeoChip, NeoInput } from "../../../theme/AppTheme";

export function useAction() {
  const [error, setError] = useState<string>();
  const run = async (fn: () => unknown): Promise<boolean> => {
    try {
      setError(undefined);
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    }
  };
  return { error, run };
}

export function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <div role="alert" style={{ color: AppColors.coral, fontWeight: 800, fontSize: 14, marginTop: 6 }}>{text}</div>;
}

export interface FormField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  options?: string[]; // shows chips instead of a text box
  defaultValue?: string;
}

export function ActionForm({
  fields,
  submitLabel,
  onSubmit,
  isDark,
}: {
  fields: FormField[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => unknown;
  isDark: boolean;
}) {
  const initial = () => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""]));
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const { error, run } = useAction();
  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((f) =>
        f.options ? (
          <div key={f.key}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {f.options.map((o) => (
                <NeoChip key={o} label={o} fontSize={13} active={vals[f.key] === o} activeColor={AppColors.lime} isDark={isDark} onPressed={() => set(f.key, o)} />
              ))}
            </div>
          </div>
        ) : (
          <NeoInput key={f.key} label={f.label} value={vals[f.key]} placeholder={f.placeholder} multiline={f.multiline} isDark={isDark} onChange={(v) => set(f.key, v)} />
        ),
      )}
      <div>
        <NeoButton
          label={submitLabel}
          fontSize={13}
          color={AppColors.lime}
          labelColor={AppColors.ink}
          isDark={isDark}
          onPressed={async () => { if (await run(() => onSubmit(vals))) setVals(initial()); }}
        />
      </div>
      <ErrorText text={error} />
    </div>
  );
}
