import { createContext } from "react";

export type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
