import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeader } from "@/components/foundation/page/section-header";

type DataTableWrapperProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function DataTableWrapper({ title, description, actions, toolbar, children }: DataTableWrapperProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-surface-panel shadow-premium-sm">
      <CardHeader className="space-y-4 border-b premium-border bg-surface-glass/60 p-5 supports-backdrop-filter:backdrop-blur-xl">
        <SectionHeader title={title} description={description} actions={actions} />
        {toolbar ? <div>{toolbar}</div> : null}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

