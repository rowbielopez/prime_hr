"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const themeCycle = ["light", "dark", "system"] as const;

export function ThemeToggle() {
    const { setTheme, theme = "system" } = useTheme();

    const currentTheme = themeCycle.includes(theme as (typeof themeCycle)[number]) ? theme : "system";
    const Icon = currentTheme === "system" ? Laptop : currentTheme === "dark" ? Moon : Sun;

    function cycleTheme() {
        const currentIndex = themeCycle.indexOf(currentTheme as (typeof themeCycle)[number]);
        setTheme(themeCycle[(currentIndex + 1) % themeCycle.length]);
    }

    return (
        <Button type="button" variant="ghost" size="icon-sm" onClick={cycleTheme} aria-label="Switch color theme">
            <Icon className="size-4" />
        </Button>
    );
}