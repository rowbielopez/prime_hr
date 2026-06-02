"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: "light" | "dark" | undefined;
    setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: "system",
    resolvedTheme: undefined,
    setTheme: () => { },
});

/** Drop-in replacement for next-themes useTheme, compatible with React 19. */
export function useTheme() {
    return useContext(ThemeContext);
}

const STORAGE_KEY = "prime-hr-theme";
const VALID_THEMES: Theme[] = ["light", "dark", "system"];
const noopSubscribe = () => () => { };

function getSystemPreference(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): "light" | "dark" {
    return theme === "system" ? getSystemPreference() : theme;
}

function readStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";
    try {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && VALID_THEMES.includes(stored)) return stored;
    } catch {
        // localStorage unavailable
    }
    return "system";
}

type ThemeProviderProps = { children: ReactNode };

export function ThemeProvider({ children }: ThemeProviderProps) {
    // Read localStorage synchronously on first client render via lazy initializer — no effect needed.
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    // useSyncExternalStore gives false on server, true on client (same pattern as theme-toggle.tsx).
    const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

    // Apply dark/light class to <html> whenever theme changes on the client.
    useEffect(() => {
        const resolved = resolve(theme);
        document.documentElement.classList.toggle("dark", resolved === "dark");
    }, [theme]);

    // Track OS preference while theme === "system".
    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            document.documentElement.classList.toggle("dark", e.matches);
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    function setTheme(next: Theme) {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme: mounted ? resolve(theme) : undefined, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}