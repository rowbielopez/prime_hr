import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "active" | "pending" | "inactive" | "warning" | "error" | "info";

const statusToneClassName: Record<StatusTone, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
  warning: "bg-orange-100 text-orange-800 border-orange-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

type StatusBadgeProps = {
  tone: StatusTone;
  label: string;
  icon?: ReactNode;
};

export function StatusBadge({ tone, label, icon }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={statusToneClassName[tone]}>
      {icon}
      {label}
    </Badge>
  );
}

