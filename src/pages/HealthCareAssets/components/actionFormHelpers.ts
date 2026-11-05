import { useState } from "react";

export interface FormField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  options?: string[];
  defaultValue?: string;
}

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
