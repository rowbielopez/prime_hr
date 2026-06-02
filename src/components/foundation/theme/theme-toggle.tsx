"use client";

import { useSyncExternalStore } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/foundation/theme/theme-provider";
import { Button } from "@/components/ui/button";

const themeCycle = ["light", "dark", "system"] as const;
const subscribe = () => () => { };

export function ThemeToggle() {
    const { setTheme, theme = "system" } = useTheme();
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);

    const currentTheme = themeCycle.includes(theme as (typeof themeCycle)[number]) ? theme : "system";
    const activeTheme = mounted ? currentTheme : "system";
    const Icon = activeTheme === "system" ? Laptop : activeTheme === "dark" ? Moon : Sun;

    function cycleTheme() {
        const currentIndex = themeCycle.indexOf(activeTheme as (typeof themeCycle)[number]);
        setTheme(themeCycle[(currentIndex + 1) % themeCycle.length]);
    }

    return (
        <Button type="button" variant="ghost" size="icon-sm" onClick={cycleTheme} aria-label="Switch color theme">
            <Icon className="size-4" />
        </Button>
    );
}