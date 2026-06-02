import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PublicVacancySummary } from "@/features/recruitment/public/types";
import {
  getVacancyState,
  VacancyStateBadge,
  formatDateShort,
} from "@/components/features/careers/vacancy-badges";

export function VacancyTable({
  vacancies,
}: {
  vacancies: PublicVacancySummary[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-raised overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-inset/50">
              <TableHead className="min-w-[220px]">Position</TableHead>
              <TableHead className="min-w-[140px]">Campus</TableHead>
              <TableHead className="min-w-[160px]">Office</TableHead>
              <TableHead className="min-w-[120px]">Employment</TableHead>
              <TableHead className="text-right w-[80px]">Slots</TableHead>
              <TableHead className="min-w-[130px]">Deadline</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="text-right min-w-[200px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacancies.map((v) => {
              const state = getVacancyState(v.postedAt, v.closingAt);
              const closed = state === "deadline_passed";
              return (
                <TableRow key={v.slug} className="hover:bg-surface-inset/40">
                  <TableCell className="font-medium align-top">
                    <Link
                      href={`/careers/${v.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {v.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground align-top">
                    {v.campusName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground align-top">
                    {v.officeName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground align-top">
                    {v.employmentType ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums align-top">
                    {v.itemCount}
                  </TableCell>
                  <TableCell className="text-sm align-top">
                    {formatDateShort(v.closingAt) ?? (
                      <span className="text-muted-foreground">
                        Until filled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <VacancyStateBadge state={state} size="sm" />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/careers/${v.slug}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        View
                      </Link>
                      {closed ? (
                        <Button size="sm" disabled>
                          Closed
                        </Button>
                      ) : (
                        <Link
                          href={`/careers/${v.slug}/apply`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Apply
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
