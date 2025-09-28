/**
 * Central theme context that mirrors the active theme to the `<html>` element
 * and persists the choice so every route renders with the expected palette.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "classic" | "light";

type Flags = {
  interactive: boolean;
  showStars: boolean;
  showClouds: boolean;
  cloudIntensity: number;
};

// Hook consumers read these flags to toggle ambient effects per theme.
const FLAG_PROFILES: Record<ThemeName, Flags> = {
  classic: { interactive: false, showStars: false, showClouds: false, cloudIntensity: 0 },
  light:   { interactive: false, showStars: false, showClouds: false, cloudIntensity: 0 },
};

type Ctx = {
  name: ThemeName;
  flags: Flags;
  setTheme: (t: ThemeName, persist?: boolean) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [name, setName] = useState<ThemeName>(() => {
    // Rehydrate from storage before the first paint to avoid a flash of the
    // fallback theme.
    const saved = localStorage.getItem("themeName") as ThemeName | null;
    if (saved === "classic" || saved === "light") return saved;

    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "classic";
  });

  useEffect(() => {
    // Drive CSS variables via a data attribute on the root element.
    document.documentElement.setAttribute("data-theme", name);
  }, [name]);

  const setTheme = (t: ThemeName, persist = true) => {
    if (persist) localStorage.setItem("themeName", t);
    setName(t);
  };

  const value = useMemo(() => ({ name, flags: FLAG_PROFILES[name], setTheme }), [name]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
