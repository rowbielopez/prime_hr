import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { EmployeeTrainingHistory } from "@/components/features/employees/employee-training-history";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeeTrainingHistoryView } from "@/features/learning/participants/repository/participants.repository";
import type { CompletionStatus } from "@/features/learning/types";

const COMPLETION_VALUES = new Set<CompletionStatus>([
  "not_started",
  "in_progress",
  "completed",
  "waived",
  "not_completed",
]);

function parseCompletion(raw: string | string[] | undefined): CompletionStatus | "all" {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || v === "all") return "all";
  return COMPLETION_VALUES.has(v as CompletionStatus) ? (v as CompletionStatus) : "all";
}

function parseYear(raw: string | string[] | undefined): number | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

type PageProps = {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<{ year?: string; completion?: string }>;
};

export default async function EmployeeTrainingHistoryPage(props: PageProps) {
  const { employeeId } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const selectedYear = parseYear(sp.year);
  const selectedCompletion = parseCompletion(sp.completion);

  const { pageMeta } = await withProtectedPageMeta({
    pathname: "/employees",
    permission: "employee.records.read",
  });

  const employee = await getEmployeeById(employeeId);
  if (!employee) notFound();

  const { years, rows } = await getEmployeeTrainingHistoryView(employeeId, {
    year: selectedYear,
    completion: selectedCompletion,
  });

  const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training history"
        subtitle={`${employeeName || employee.employeeNo} — session participation, attendance, and completion.`}
        breadcrumb={[
          ...pageMeta.breadcrumb,
          { label: employee.employeeNo, href: `/employees/${employeeId}` },
          { label: "Training history" },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <Link href={`/employees/${employeeId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to employee
        </Link>
      </div>
      <EmployeeTrainingHistory
        employeeId={employeeId}
        years={years}
        rows={rows}
        selectedYear={selectedYear}
        selectedCompletion={selectedCompletion}
      />
    </div>
  );
}
