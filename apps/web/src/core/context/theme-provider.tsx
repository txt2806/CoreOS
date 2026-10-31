"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";
export type Density = "comfortable" | "compact";

interface ThemeValue {
  mode: ThemeMode;
  density: Density;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = "oneops.appearance";

const ThemeContext = createContext<ThemeValue | null>(null);

/** Reads the stored preference once; the markup itself stays theme-agnostic. */
function storedPreference(): { mode: ThemeMode; density: Density } {
  if (typeof window === "undefined")
    return { mode: "light", density: "comfortable" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "light", density: "comfortable" };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return { mode: "light", density: "comfortable" };
    const value = parsed as Partial<{ mode: ThemeMode; density: Density }>;
    return {
      mode: value.mode === "dark" ? "dark" : "light",
      density: value.density === "compact" ? "compact" : "comfortable",
    };
  } catch {
    return { mode: "light", density: "comfortable" };
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    const stored = storedPreference();
    setModeState(stored.mode);
    setDensityState(stored.density);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.density = density;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, density }));
    } catch {
      /* Private mode: the session keeps working with the in-memory value. */
    }
  }, [mode, density]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const setDensity = useCallback(
    (next: Density) => setDensityState(next),
    [],
  );
  const toggleMode = useCallback(
    () => setModeState((current) => (current === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo<ThemeValue>(
    () => ({ mode, density, setMode, setDensity, toggleMode }),
    [mode, density, setMode, setDensity, toggleMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
