import type { ComponentType } from "react";
import {
    BarChart3,
    Building2,
    BriefcaseBusiness,
    CalendarDays,
    FileSearch,
    FileText,
    GraduationCap,
    HeartHandshake,
    Inbox,
    LayoutDashboard,
    LineChart,
    Settings,
    ShieldCheck,
    UserRound,
    Users,
    Wallet,
} from "lucide-react";
import type {
    AppModuleColor,
    AppNavIconKey,
} from "@/components/foundation/routing/route-registry";

export const navIconMap: Record<
    AppNavIconKey,
    ComponentType<{ className?: string }>
> = {
    "layout-dashboard": LayoutDashboard,
    users: Users,
    "building-2": Building2,
    "shield-check": ShieldCheck,
    "file-search": FileSearch,
    "bar-chart-3": BarChart3,
    "user-round": UserRound,
    "briefcase-business": BriefcaseBusiness,
    "line-chart": LineChart,
    "graduation-cap": GraduationCap,
    wallet: Wallet,
    "heart-handshake": HeartHandshake,
    settings: Settings,
    "calendar-days": CalendarDays,
    "file-text": FileText,
    inbox: Inbox,
};

export const moduleAccentClass: Record<AppModuleColor, string> = {
    people: "text-module-people bg-module-people/12 border-module-people/20",
    compliance:
        "text-module-compliance bg-module-compliance/12 border-module-compliance/20",
    recruitment:
        "text-module-recruitment bg-module-recruitment/12 border-module-recruitment/20",
    learning:
        "text-module-learning bg-module-learning/12 border-module-learning/20",
    performance:
        "text-module-performance bg-module-performance/12 border-module-performance/20",
    rewards: "text-module-rewards bg-module-rewards/12 border-module-rewards/20",
    platform: "text-primary bg-primary/10 border-primary/20",
};

export const moduleRailClass: Record<AppModuleColor, string> = {
    people: "bg-module-people",
    compliance: "bg-module-compliance",
    recruitment: "bg-module-recruitment",
    learning: "bg-module-learning",
    performance: "bg-module-performance",
    rewards: "bg-module-rewards",
    platform: "bg-primary",
};

export const moduleSoftBgClass: Record<AppModuleColor, string> = {
    people: "bg-module-people/8",
    compliance: "bg-module-compliance/8",
    recruitment: "bg-module-recruitment/8",
    learning: "bg-module-learning/8",
    performance: "bg-module-performance/8",
    rewards: "bg-module-rewards/8",
    platform: "bg-primary/8",
};

export function resolveModuleColor(
    href: string,
    current?: AppModuleColor,
): AppModuleColor {
    if (current) return current;
    if (
        href.startsWith("/employees") ||
        href.startsWith("/pds") ||
        href.includes("offices") ||
        href.includes("campus")
    )
        return "people";
    if (href.startsWith("/compliance") || href.startsWith("/audit"))
        return "compliance";
    if (href.startsWith("/recruitment")) return "recruitment";
    if (href.startsWith("/learning")) return "learning";
    if (href.startsWith("/performance")) return "performance";
    if (href.startsWith("/rewards")) return "rewards";
    return "platform";
}
