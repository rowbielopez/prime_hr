import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { maskIdOrPlaceholder } from "@/lib/utils/mask-id";
import type { EmployeeDetail } from "@/features/employees/types";

type Props = {
    employee: EmployeeDetail;
};

function value(input: string | null | undefined) {
    return input && input.length > 0 ? input : "—";
}

function formatDate(input: string | null) {
    if (!input) return "—";
    try {
        return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    } catch {
        return input;
    }
}

const statusVariant: Record<EmployeeDetail["employmentStatus"], { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    on_leave: { label: "On Leave", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    separated: { label: "Separated", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    retired: { label: "Retired", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[170px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{children}</dd>
        </div>
    );
}

export function BasicInfoCard({ employee }: Props) {
    const fullName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix].filter(Boolean).join(" ");
    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                <Row label="Employee number">{value(employee.employeeNo)}</Row>
                <Row label="Full name">{value(fullName)}</Row>
                <Row label="Sex">{value(employee.sex)}</Row>
                <Row label="Civil status">{value(employee.civilStatus)}</Row>
                <Row label="Date of birth">{formatDate(employee.birthDate)}</Row>
                <Row label="Login email">{value(employee.email)}</Row>
            </CardContent>
        </Card>
    );
}

export function EmploymentSnapshotCard({ employee }: Props) {
    const status = statusVariant[employee.employmentStatus];
    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className="text-base">Employment Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                <Row label="Position">{value(employee.positionTitle)}</Row>
                <Row label="Plantilla item">{value(employee.plantillaItemNo)}</Row>
                <Row label="Employment status">
                    <Badge variant="secondary" className={status.className}>
                        {status.label}
                    </Badge>
                </Row>
                <Row label="Employment type">{value(employee.employmentType)}</Row>
                <Row label="Campus">{value(employee.campusName)}</Row>
                <Row label="Office">{value(employee.officeName)}</Row>
                <Row label="Date hired">{formatDate(employee.dateHired)}</Row>
            </CardContent>
        </Card>
    );
}

export function GovernmentIdsCard({ employee }: Props) {
    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className="text-base">Government IDs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                <Row label="TIN">{maskIdOrPlaceholder(employee.tin)}</Row>
                <Row label="GSIS">{maskIdOrPlaceholder(employee.gsisNo)}</Row>
                <Row label="PhilHealth">{maskIdOrPlaceholder(employee.philhealthNo)}</Row>
                <Row label="Pag-IBIG">{maskIdOrPlaceholder(employee.pagibigNo)}</Row>
                <p className="pt-1 text-xs text-muted-foreground">
                    Only the last 4 digits are shown. To update or view full numbers, please contact HR.
                </p>
            </CardContent>
        </Card>
    );
}
