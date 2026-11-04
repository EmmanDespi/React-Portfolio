export const nowIso = () => new Date().toISOString();
export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : "-");
export const fmtMoney = (n?: number) => (n === undefined ? "-" : `PHP ${n.toLocaleString()}`);

export function required(value: string | undefined, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${label} is required.`);
  return v;
}
