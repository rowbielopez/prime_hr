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
    <Card className="border-border/80">
      <CardHeader className="space-y-4">
        <SectionHeader title={title} description={description} actions={actions} />
        {toolbar ? <div>{toolbar}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

