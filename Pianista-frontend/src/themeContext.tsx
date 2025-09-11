import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "classic" | "light";

type Flags = {
  interactive: boolean;
  showStars: boolean;
  showClouds: boolean;
  cloudIntensity: number;
};

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
    const saved = localStorage.getItem("themeName") as ThemeName | null;
    if (saved === "classic" || saved === "light") return saved;

    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "classic";
  });

  useEffect(() => {
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
