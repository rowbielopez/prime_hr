import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PublicVacancySummary } from "@/features/recruitment/public/types";
import {
  getVacancyState,
  VacancyStateBadge,
  formatDateShort,
} from "@/components/features/careers/vacancy-badges";

export function VacancyCard({ vacancy }: { vacancy: PublicVacancySummary }) {
  const state = getVacancyState(vacancy.postedAt, vacancy.closingAt);
  const closed = state === "deadline_passed";
  const posted = formatDateShort(vacancy.postedAt);
  const closes = formatDateShort(vacancy.closingAt);

  return (
    <div className="group flex flex-col h-full rounded-xl border border-border/60 bg-surface-raised p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-premium-sm">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <VacancyStateBadge state={state} size="sm" />
        {vacancy.employmentType && (
          <Badge variant="secondary" className="text-[10px]">
            {vacancy.employmentType}
          </Badge>
        )}
      </div>

      {/* Title */}
      <Link
        href={`/careers/${vacancy.slug}`}
        className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors duration-150 line-clamp-2 mb-1"
      >
        {vacancy.title}
      </Link>

      {/* Location */}
      <p className="text-xs text-muted-foreground mb-4">
        {vacancy.campusName}
        {vacancy.officeName ? ` · ${vacancy.officeName}` : ""}
      </p>

      {/* Meta grid */}
      <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg bg-surface-inset border border-border/50 p-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Positions
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {vacancy.itemCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Posted
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {posted ?? "—"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Deadline
          </p>
          <p
            className={`text-sm font-medium mt-0.5 ${
              state === "closing_soon"
                ? "text-amber-600"
                : closed
                  ? "text-muted-foreground"
                  : "text-foreground"
            }`}
          >
            {closes ?? "Until filled"}
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-2">
        <Link
          href={`/careers/${vacancy.slug}`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "flex-1",
          })}
        >
          View details
        </Link>
        {closed ? (
          <Button size="sm" className="flex-1" disabled>
            Closed
          </Button>
        ) : (
          <Link
            href={`/careers/${vacancy.slug}/apply`}
            className={buttonVariants({ size: "sm", className: "flex-1" })}
          >
            Apply now
          </Link>
        )}
      </div>
    </div>
  );
}
