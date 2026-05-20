import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "active" | "pending" | "inactive" | "warning" | "error" | "info";

const statusToneClassName: Record<StatusTone, string> = {
  active: "status-tone-success",
  pending: "status-tone-warning",
  inactive: "status-tone-neutral",
  warning: "status-tone-warning",
  error: "status-tone-danger",
  info: "status-tone-info",
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

