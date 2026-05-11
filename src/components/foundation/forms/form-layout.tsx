import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function FormLayout({ title, description, children, footer, className }: FormLayoutProps) {
  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {children}
        {footer ? <div className="border-t pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type FormGridProps = {
  columns?: 1 | 2;
  children: ReactNode;
};

export function FormGrid({ columns = 2, children }: FormGridProps) {
  return <div className={cn("grid gap-4", columns === 2 ? "md:grid-cols-2" : "grid-cols-1")}>{children}</div>;
}

