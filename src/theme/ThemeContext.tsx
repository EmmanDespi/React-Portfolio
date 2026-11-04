import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppPalette } from "./AppTheme";

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const bg = (isDark ? AppPalette.dark : AppPalette.light).background;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside <ThemeProvider>");
  return ctx;
}