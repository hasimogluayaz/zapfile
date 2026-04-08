"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ─── Theme Context ─────────────────────────────────────────────
type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Read persisted theme after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("zapfile-theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      // Use system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const detected: Theme = prefersDark ? "dark" : "light";
      setTheme(detected);
      document.documentElement.setAttribute("data-theme", detected);
    }
    setMounted(true);
  }, []);

  // Keep the DOM attribute in sync when theme changes after mount
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("zapfile-theme", next);
      return next;
    });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <I18nProvider>{children}</I18nProvider>
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}
