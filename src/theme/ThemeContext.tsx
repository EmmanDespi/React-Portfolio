import { useEffect, useState, type ReactNode } from "react";
import { AppPalette } from "./tokens";
import { ThemeContext } from "./themeContext";

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