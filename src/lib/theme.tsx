import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark";
const STORAGE_KEY = "app-theme";

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadInitialTheme(): ThemePreference {
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

/** Applies the chosen appearance via a `data-theme` attribute on <html> — index.css's `:root` values
 * are the dark palette by default, with `:root[data-theme="light"]` overriding to the light one.
 * This app's default appearance (with no saved preference) is light, so the attribute is set to
 * "light" unless the user has explicitly chosen "dark". main.tsx also sets this attribute
 * synchronously before the first render (reading the same localStorage key) so there's no flash of
 * the wrong theme before this provider's effect runs. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(loadInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
