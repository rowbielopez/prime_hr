"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { VacancyCard } from "@/components/features/careers/vacancy-card";
import { VacancyTable } from "@/components/features/careers/vacancy-table";
import {
  getVacancyState,
  daysUntilClose,
} from "@/components/features/careers/vacancy-badges";
import type { PublicVacancySummary } from "@/features/recruitment/public/types";

type Props = {
  vacancies: PublicVacancySummary[];
};

type ViewMode = "grid" | "table";
type DeadlineFilter = "all" | "week" | "month" | "closing_soon";

const VIEW_STORAGE_KEY = "csu_careers_view_mode";

export function PublicCareersShell({ vacancies }: Props) {
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState<string>("all");
  const [office, setOffice] = useState<string>("all");
  const [employmentType, setEmploymentType] = useState<string>("all");
  const [deadline, setDeadline] = useState<DeadlineFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");

  // Restore persisted view preference.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "grid" || saved === "table") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage which is unavailable during SSR
        setView(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const campuses = useMemo(() => {
    const s = new Set<string>();
    for (const v of vacancies) s.add(v.campusName);
    return Array.from(s).sort();
  }, [vacancies]);

  const offices = useMemo(() => {
    const s = new Set<string>();
    for (const v of vacancies) {
      if (campus !== "all" && v.campusName !== campus) continue;
      if (v.officeName) s.add(v.officeName);
    }
    return Array.from(s).sort();
  }, [vacancies, campus]);

  const employmentTypes = useMemo(() => {
    const s = new Set<string>();
    for (const v of vacancies) if (v.employmentType) s.add(v.employmentType);
    return Array.from(s).sort();
  }, [vacancies]);

  // Reset dependent office filter when campus changes and current office is no longer available.
  useEffect(() => {
    if (office !== "all" && !offices.includes(office)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dependent filter reset; office list is derived from campus selection
      setOffice("all");
    }
  }, [office, offices]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vacancies.filter((v) => {
      if (campus !== "all" && v.campusName !== campus) return false;
      if (office !== "all" && v.officeName !== office) return false;
      if (employmentType !== "all" && v.employmentType !== employmentType)
        return false;

      if (deadline !== "all") {
        const days = daysUntilClose(v.closingAt);
        if (deadline === "closing_soon") {
          if (days === null || days < 0 || days > 7) return false;
        } else if (deadline === "week") {
          if (days === null || days < 0 || days > 7) return false;
        } else if (deadline === "month") {
          if (days === null || days < 0 || days > 30) return false;
        }
      }

      if (!term) return true;
      return (
        v.title.toLowerCase().includes(term) ||
        v.campusName.toLowerCase().includes(term) ||
        (v.officeName ?? "").toLowerCase().includes(term) ||
        (v.employmentType ?? "").toLowerCase().includes(term)
      );
    });
  }, [vacancies, search, campus, office, employmentType, deadline]);

  // Sort: open/new first, closing soon next, deadline_passed last.
  const sorted = useMemo(() => {
    const rank = (v: PublicVacancySummary) => {
      const s = getVacancyState(v.postedAt, v.closingAt);
      if (s === "closing_soon") return 0;
      if (s === "new") return 1;
      if (s === "open") return 2;
      return 3;
    };
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [filtered]);

  const hasFilters =
    search.trim() !== "" ||
    campus !== "all" ||
    office !== "all" ||
    employmentType !== "all" ||
    deadline !== "all";

  function clearFilters() {
    setSearch("");
    setCampus("all");
    setOffice("all");
    setEmploymentType("all");
    setDeadline("all");
  }

  return (
    <section id="positions" className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Open Positions
        </h2>
        <p className="text-sm text-muted-foreground">
          {vacancies.length === 0
            ? "No job vacancies are currently open. Please check again later."
            : `${vacancies.length} ${vacancies.length === 1 ? "vacancy" : "vacancies"} available across all campuses.`}
        </p>
      </div>

      {/* Search row */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search by position, office, or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search vacancies"
            className="bg-surface-raised border-border/70"
          />
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-surface-raised p-1 self-start sm:self-auto">
            <Button
              type="button"
              size="sm"
              variant={view === "grid" ? "default" : "ghost"}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className="h-8 px-3"
            >
              Grid
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className="h-8 px-3"
            >
              Table
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* Each filter wraps a label + select in a labelled box */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
              Campus
            </p>
            <Select value={campus} onValueChange={(v) => setCampus(v ?? "all")}>
              <SelectTrigger
                aria-label="Filter by campus"
                className="w-full bg-surface-raised border-border/70"
              >
                <SelectValue>
                  {campus === "all" ? "All campuses" : campus}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campuses</SelectItem>
                {campuses.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
              Office
            </p>
            <Select
              value={office}
              onValueChange={(v) => setOffice(v ?? "all")}
              disabled={offices.length === 0}
            >
              <SelectTrigger
                aria-label="Filter by office"
                className="w-full bg-surface-raised border-border/70"
              >
                <SelectValue>
                  {office === "all" ? "All offices" : office}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
              Employment type
            </p>
            <Select
              value={employmentType}
              onValueChange={(v) => setEmploymentType(v ?? "all")}
              disabled={employmentTypes.length === 0}
            >
              <SelectTrigger
                aria-label="Filter by employment type"
                className="w-full bg-surface-raised border-border/70"
              >
                <SelectValue>
                  {employmentType === "all" ? "All types" : employmentType}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employment types</SelectItem>
                {employmentTypes.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
              Deadline
            </p>
            <Select
              value={deadline}
              onValueChange={(v) => setDeadline((v as DeadlineFilter) ?? "all")}
            >
              <SelectTrigger
                aria-label="Filter by deadline"
                className="w-full bg-surface-raised border-border/70"
              >
                <SelectValue>
                  {deadline === "all"
                    ? "Any deadline"
                    : deadline === "closing_soon"
                      ? "Closing soon"
                      : deadline === "week"
                        ? "This week"
                        : "This month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any deadline</SelectItem>
                <SelectItem value="closing_soon">
                  Closing soon (≤7 days)
                </SelectItem>
                <SelectItem value="week">Open this week</SelectItem>
                <SelectItem value="month">Open this month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5 select-none">
              &nbsp;
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="w-full"
            >
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      {/* Result count */}
      {vacancies.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{sorted.length}</span>{" "}
          of {vacancies.length}{" "}
          {vacancies.length === 1 ? "vacancy" : "vacancies"}.
        </p>
      )}

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-surface-raised/50 p-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-inset border border-border">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5 text-muted-foreground"
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13.5 13.5L17 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="font-medium text-foreground">
            {vacancies.length === 0
              ? "No open vacancies"
              : "No vacancies match your search or filters."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vacancies.length === 0
              ? "Please check again later."
              : "Try adjusting your filters, or check back soon."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((vacancy) => (
            <VacancyCard key={vacancy.slug} vacancy={vacancy} />
          ))}
        </div>
      ) : (
        <VacancyTable vacancies={sorted} />
      )}
    </section>
  );
}
