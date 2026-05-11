import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
  className?: string;
};

export function DashboardMetricCard({ label, value, trend, icon, className }: DashboardMetricCardProps) {
  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {trend ? <p className="mt-1 text-xs text-muted-foreground">{trend}</p> : null}
      </CardContent>
    </Card>
  );
}

