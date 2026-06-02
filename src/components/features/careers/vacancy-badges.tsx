import { Badge } from "@/components/ui/badge";

/**
 * Public-facing vacancy status badges derived purely from public fields
 * (`postedAt`, `closingAt`). Private/internal statuses are never surfaced.
 */
export type VacancyState = "new" | "closing_soon" | "deadline_passed" | "open";

export function getVacancyState(
  postedAt: string | null,
  closingAt: string | null,
): VacancyState {
  const now = Date.now();
  if (closingAt) {
    const close = new Date(closingAt).getTime();
    if (!Number.isNaN(close) && close < now) return "deadline_passed";
    if (!Number.isNaN(close)) {
      const days = Math.ceil((close - now) / 86_400_000);
      if (days <= 7 && days >= 0) return "closing_soon";
    }
  }
  if (postedAt) {
    const posted = new Date(postedAt).getTime();
    if (!Number.isNaN(posted) && now - posted <= 7 * 86_400_000) return "new";
  }
  return "open";
}

export function daysUntilClose(closingAt: string | null): number | null {
  if (!closingAt) return null;
  const t = new Date(closingAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export function VacancyStateBadge({
  state,
  size = "default",
}: {
  state: VacancyState;
  size?: "default" | "sm";
}) {
  const cls = size === "sm" ? "text-[10px] px-2 py-0" : "text-[11px]";
  if (state === "deadline_passed") {
    return (
      <Badge
        variant="outline"
        className={`${cls} border-muted-foreground/30 text-muted-foreground`}
      >
        Deadline passed
      </Badge>
    );
  }
  if (state === "closing_soon") {
    return (
      <Badge
        className={`${cls} bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15`}
      >
        Closing soon
      </Badge>
    );
  }
  if (state === "new") {
    return (
      <Badge
        className={`${cls} bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15`}
      >
        New
      </Badge>
    );
  }
  return (
    <Badge
      className={`${cls} bg-primary/10 text-primary border-primary/20 hover:bg-primary/10`}
    >
      Open
    </Badge>
  );
}

export function formatDateShort(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
