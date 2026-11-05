import { useEffect, useState } from "react";

const BREAKPOINTS = {
  mobile: 800,
  tablet: 1100,
};

export function useColorScheme(): "dark" | "light" {
  const [colorScheme, setColorScheme] = useState<"dark" | "light">(() =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return colorScheme;
}

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { width, height } = windowSize;
  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;

  const dashboardWidth = () => {
    if (isMobile) return width * 0.97;
    if (isTablet) return width * 0.95;
    if (isDesktop) return width * 0.6;
    return width * 0.7;
  };

  const pagePadding = () => {
    if (isMobile) return 12;
    if (isTablet) return 20;
    return 12;
  };

  const dialogWidth = (maxWidth: number) => Math.min(width * 0.95, maxWidth);
  const gridColumns = () => (isMobile ? 1 : isTablet ? 2 : 3);

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    dashboardWidth: dashboardWidth(),
    pagePadding: pagePadding(),
    dialogWidth,
    gridColumns: gridColumns(),
    titleSize: isMobile ? 26 : isTablet ? 30 : 34,
    dialogHeight: (factor: number) => height * factor,
    contentWidth: Math.min(width, 1600),
  };
}
