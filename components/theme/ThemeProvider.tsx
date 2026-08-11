"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CUSTOM_THEME_ID, DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";
import { generateShades, type ShadeStep } from "@/lib/colorShades";
import { getSiteAppearance } from "@/lib/api/appearance";

const STORAGE_KEY = "byv-theme";
const CUSTOM_STORAGE_KEY = "byv-theme-custom";
const SHADE_STEPS: ShadeStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export interface CustomColors {
  brand: string;
  accent: string;
}

type ThemeContextValue = {
  theme: ThemeId;
  customColors: CustomColors | null;
  setTheme: (theme: ThemeId) => void;
  setCustomTheme: (colors: CustomColors) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

function readStoredCustomColors(): CustomColors | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomColors) : null;
  } catch {
    return null;
  }
}

function applyCustomColors(colors: CustomColors) {
  const brandShades = generateShades(colors.brand);
  const accentShades = generateShades(colors.accent);
  for (const step of SHADE_STEPS) {
    document.documentElement.style.setProperty(`--brand-${step}`, brandShades[step]);
    document.documentElement.style.setProperty(`--accent-${step}`, accentShades[step]);
  }
}

function clearCustomColors() {
  for (const step of SHADE_STEPS) {
    document.documentElement.style.removeProperty(`--brand-${step}`);
    document.documentElement.style.removeProperty(`--accent-${step}`);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);
  const [customColors, setCustomColorsState] = useState<CustomColors | null>(readStoredCustomColors);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === CUSTOM_THEME_ID && customColors) {
      applyCustomColors(customColors);
    } else {
      clearCustomColors();
    }
  }, [theme, customColors]);

  useEffect(() => {
    let cancelled = false;
    // localStorage is only a fast-paint cache; the backend's site-wide theme is the source of truth
    // for every visitor, so reconcile against it once the page has loaded.
    getSiteAppearance()
      .then(({ theme: serverTheme, customBrand, customAccent }) => {
        if (cancelled) return;
        const serverCustomColors = customBrand && customAccent ? { brand: customBrand, accent: customAccent } : null;

        setThemeState((current) => (serverTheme === current ? current : serverTheme));
        window.localStorage.setItem(STORAGE_KEY, serverTheme);

        setCustomColorsState((current) => {
          const same = current && serverCustomColors && current.brand === serverCustomColors.brand && current.accent === serverCustomColors.accent;
          if (same) return current;
          if (serverCustomColors) {
            window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(serverCustomColors));
          } else {
            window.localStorage.removeItem(CUSTOM_STORAGE_KEY);
          }
          return serverCustomColors;
        });
      })
      .catch(() => {
        // Backend unreachable — keep whatever theme is already cached/default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    if (next !== CUSTOM_THEME_ID) {
      setCustomColorsState(null);
      window.localStorage.removeItem(CUSTOM_STORAGE_KEY);
    }
  }, []);

  const setCustomTheme = useCallback((colors: CustomColors) => {
    setThemeState(CUSTOM_THEME_ID);
    setCustomColorsState(colors);
    window.localStorage.setItem(STORAGE_KEY, CUSTOM_THEME_ID);
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(colors));
  }, []);

  const value = useMemo(
    () => ({ theme, customColors, setTheme, setCustomTheme }),
    [theme, customColors, setTheme, setCustomTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
