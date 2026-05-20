import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { StickyPageHeader } from "./sticky-page-header";

export type PageHeaderBreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumb?: PageHeaderBreadcrumbItem[];
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
  /** Wrap in a sticky container that gains a frosted glass border on scroll. Defaults to true. */
  sticky?: boolean;
};

function PageHeaderBreadcrumb({ items }: { items: PageHeaderBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink render={<Link href={item.href} />}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumb,
  actions,
  secondaryActions,
  className,
  sticky = true,
}: PageHeaderProps) {
  const resolvedSubtitle = subtitle ?? description;

  const inner = (
    <header className={cn("space-y-4", sticky ? undefined : className)}>
      {breadcrumb && breadcrumb.length > 0 ? <PageHeaderBreadcrumb items={breadcrumb} /> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-[1.7rem]">{title}</h1>
          {resolvedSubtitle ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{resolvedSubtitle}</p> : null}
        </div>
        {actions || secondaryActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions ? <div className="flex items-center gap-2">{secondaryActions}</div> : null}
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );

  if (sticky) {
    return <StickyPageHeader className={className}>{inner}</StickyPageHeader>;
  }

  return inner;
}


