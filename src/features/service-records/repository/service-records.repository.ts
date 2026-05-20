import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type { ServiceRecordEntryInput } from "@/features/service-records/schemas/service-record.schema";
import type {
    ServiceRecordEmployeeDetail,
    ServiceRecordEmployeeSummary,
    ServiceRecordEntry,
    ServiceRecordListResult,
    ServiceRecordQualityWarning,
} from "@/features/service-records/types";

type EmployeeStatus = "active" | "on_leave" | "separated" | "retired";

type EmployeeRow = {
    id: string;
    employee_no: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    campus_id: string;
    office_id: string | null;
    position_title: string | null;
    employment_status: EmployeeStatus;
    date_hired: string | null;
    employment_type: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
    service_records?: ServiceRecordRow[] | null;
};

type ServiceRecordRow = {
    id: string;
    employee_id: string;
    campus_id: string;
    office_id: string | null;
    date_from: string;
    date_to: string | null;
    is_current: boolean;
    position_title: string;
    appointment_status: string | null;
    employment_type: string | null;
    station_place: string | null;
    branch: string | null;
    monthly_salary: number | null;
    salary_grade_step: string | null;
    movement_type: string | null;
    separation_date: string | null;
    separation_cause: string | null;
    leave_without_pay: string | null;
    remarks: string | null;
    archived_at: string | null;
    updated_at: string;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
    if (!input) return null;
    return Array.isArray(input) ? input[0]?.name ?? null : input.name;
}

function fullName(input: { first_name: string; middle_name: string | null; last_name: string; suffix: string | null }) {
    return [input.first_name, input.middle_name, input.last_name, input.suffix].filter(Boolean).join(" ");
}

function mapServiceRecord(row: ServiceRecordRow): ServiceRecordEntry {
    return {
        id: row.id,
        employeeId: row.employee_id,
        campusId: row.campus_id,
        officeId: row.office_id,
        dateFrom: row.date_from,
        dateTo: row.date_to,
        isCurrent: row.is_current,
        positionTitle: row.position_title,
        appointmentStatus: row.appointment_status,
        employmentType: row.employment_type,
        stationPlace: row.station_place,
        branch: row.branch,
        monthlySalary: row.monthly_salary,
        salaryGradeStep: row.salary_grade_step,
        movementType: row.movement_type,
        separationDate: row.separation_date,
        separationCause: row.separation_cause,
        leaveWithoutPay: row.leave_without_pay,
        remarks: row.remarks,
        archivedAt: row.archived_at,
        updatedAt: row.updated_at,
    };
}

function overlaps(left: ServiceRecordEntry, right: ServiceRecordEntry) {
    const leftEnd = left.dateTo ?? "9999-12-31";
    const rightEnd = right.dateTo ?? "9999-12-31";
    return left.dateFrom <= rightEnd && right.dateFrom <= leftEnd;
}

function safeDateLiteral(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid service record date filter.");
    return value;
}

function qualityWarnings(entries: ServiceRecordEntry[]): ServiceRecordQualityWarning[] {
    const warnings: ServiceRecordQualityWarning[] = [];
    const activeEntries = entries.filter((entry) => !entry.archivedAt);

    for (const entry of activeEntries) {
        if (!entry.appointmentStatus) {
            warnings.push({ key: `${entry.id}-appointment`, label: "Missing appointment status", description: `${entry.positionTitle} has no appointment status.`, severity: "warning" });
        }
        if (!entry.stationPlace) {
            warnings.push({ key: `${entry.id}-station`, label: "Missing station/place", description: `${entry.positionTitle} has no station or place of assignment.`, severity: "warning" });
        }
    }

    const currentCount = activeEntries.filter((entry) => entry.isCurrent).length;
    if (currentCount > 1) {
        warnings.push({ key: "multiple-current", label: "Multiple current records", description: "This employee has more than one current service record.", severity: "error" });
    }

    for (let i = 0; i < activeEntries.length; i++) {
        for (let j = i + 1; j < activeEntries.length; j++) {
            if (overlaps(activeEntries[i], activeEntries[j])) {
                warnings.push({ key: `overlap-${activeEntries[i].id}-${activeEntries[j].id}`, label: "Overlapping dates", description: "Two service periods overlap. Please review the date ranges.", severity: "warning" });
            }
        }
    }

    return warnings;
}

function mapEmployeeSummary(row: EmployeeRow): ServiceRecordEmployeeSummary {
    const records = (row.service_records ?? []).filter((record) => !record.archived_at).map(mapServiceRecord);
    const sorted = [...records].sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
    const latest = sorted[0] ?? null;
    const warnings = qualityWarnings(records);
    return {
        employeeId: row.id,
        employeeNo: row.employee_no,
        fullName: fullName(row),
        campusId: row.campus_id,
        campusName: resolveName(row.campus) ?? "Unknown",
        officeId: row.office_id,
        officeName: resolveName(row.office),
        currentPosition: row.position_title,
        employmentStatus: row.employment_status,
        dateHired: row.date_hired,
        entriesCount: records.length,
        latestServiceDate: latest?.dateFrom ?? null,
        lastUpdated: records.reduce<string | null>((latestUpdate, record) => {
            if (!latestUpdate || record.updatedAt > latestUpdate) return record.updatedAt;
            return latestUpdate;
        }, null),
        needsReview: warnings.length > 0 || records.length === 0,
        hasCurrentRecord: records.some((record) => record.isCurrent),
    };
}

export async function listServiceRecordEmployees(_context?: AuthorizationContext): Promise<ServiceRecordListResult> {
    const supabase = await createSupabaseServerClient();
    const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const PAGE_SIZE = 1000;
    const COLS = "id, employee_no, first_name, middle_name, last_name, suffix, campus_id, office_id, position_title, employment_status, date_hired, employment_type, campus:campuses(name), office:offices(name), service_records:employee_service_records(id, employee_id, campus_id, office_id, date_from, date_to, is_current, position_title, appointment_status, employment_type, station_place, branch, monthly_salary, salary_grade_step, movement_type, separation_date, separation_cause, leave_without_pay, remarks, archived_at, updated_at)";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const allRows: EmployeeRow[] = [];
    let page = 0;

    while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await db
            .from("employees")
            .select(COLS)
            .is("deleted_at", null)
            .order("last_name", { ascending: true })
            .range(from, to);

        if (error || !data || data.length === 0) break;
        allRows.push(...(data as EmployeeRow[]));
        if (data.length < PAGE_SIZE) break;
        page += 1;
    }

    const rows = allRows.map(mapEmployeeSummary);
    return {
        rows,
        summary: {
            totalEmployeesWithRecords: rows.filter((row) => row.entriesCount > 0).length,
            activeEmployees: rows.filter((row) => row.employmentStatus === "active").length,
            recordsUpdatedThisMonth: rows.filter((row) => row.lastUpdated && row.lastUpdated >= startOfMonth).length,
            employeesMissingServiceRecords: rows.filter((row) => row.entriesCount === 0).length,
            recordsNeedingReview: rows.filter((row) => row.needsReview).length,
        },
    };
}

export async function getEmployeeServiceRecordDetail(employeeId: string): Promise<ServiceRecordEmployeeDetail | null> {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const { data, error } = await db
        .from("employees")
        .select("id, employee_no, first_name, middle_name, last_name, suffix, campus_id, office_id, position_title, employment_status, date_hired, employment_type, campus:campuses(name), office:offices(name), service_records:employee_service_records(id, employee_id, campus_id, office_id, date_from, date_to, is_current, position_title, appointment_status, employment_type, station_place, branch, monthly_salary, salary_grade_step, movement_type, separation_date, separation_cause, leave_without_pay, remarks, archived_at, updated_at)")
        .eq("id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();
    if (error || !data) return null;
    const row = data as EmployeeRow;
    const entries = ((row.service_records ?? []) as ServiceRecordRow[])
        .map(mapServiceRecord)
        .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
    return {
        employee: {
            id: row.id,
            employeeNo: row.employee_no,
            fullName: fullName(row),
            campusId: row.campus_id,
            campusName: resolveName(row.campus) ?? "Unknown",
            officeId: row.office_id,
            officeName: resolveName(row.office),
            positionTitle: row.position_title,
            employmentStatus: row.employment_status,
            dateHired: row.date_hired,
            employmentType: row.employment_type,
        },
        entries,
        currentEntry: entries.find((entry) => entry.isCurrent && !entry.archivedAt) ?? null,
        warnings: qualityWarnings(entries),
    };
}

export async function getMyServiceRecord(appUserId: string): Promise<ServiceRecordEmployeeDetail | null> {
    const supabase = await createSupabaseServerClient();
    const { data: user } = await supabase
        .from("app_users")
        .select("employee_id")
        .eq("id", appUserId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
    const employeeId = (user as { employee_id: string | null } | null)?.employee_id ?? null;
    if (!employeeId) return null;
    return getEmployeeServiceRecordDetail(employeeId);
}

export async function getServiceRecordScopeById(recordId: string): Promise<{ employeeId: string; campusId: string; officeId: string | null } | null> {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const { data, error } = await db
        .from("employee_service_records")
        .select("employee_id, campus_id, office_id")
        .eq("id", recordId)
        .is("deleted_at", null)
        .maybeSingle();
    if (error || !data) return null;
    const row = data as { employee_id: string; campus_id: string; office_id: string | null };
    return { employeeId: row.employee_id, campusId: row.campus_id, officeId: row.office_id };
}

export async function findCurrentServiceRecord(employeeId: string, excludeId?: string | null): Promise<{ id: string } | null> {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    let query = db
        .from("employee_service_records")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("is_current", true)
        .is("archived_at", null)
        .is("deleted_at", null);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    return data ? { id: (data as { id: string }).id } : null;
}

export async function findOverlappingServiceRecords(input: {
    employeeId: string;
    dateFrom: string;
    dateTo: string | null;
    excludeId?: string | null;
}): Promise<Array<{ id: string }>> {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const safeDateFrom = safeDateLiteral(input.dateFrom);
    const safeNewEnd = safeDateLiteral(input.dateTo ?? "9999-12-31");
    let query = db
        .from("employee_service_records")
        .select("id")
        .eq("employee_id", input.employeeId)
        .is("archived_at", null)
        .is("deleted_at", null)
        .lte("date_from", safeNewEnd)
        .or(`date_to.is.null,date_to.gte.${safeDateFrom}`);
    if (input.excludeId) query = query.neq("id", input.excludeId);
    const { data } = await query;
    return (data ?? []) as Array<{ id: string }>;
}

function buildPayload(input: ServiceRecordEntryInput, appUserId: string) {
    return {
        employee_id: input.employeeId,
        campus_id: input.campusId,
        office_id: input.officeId ?? null,
        date_from: input.dateFrom,
        date_to: input.isCurrent ? null : input.dateTo ?? null,
        is_current: input.isCurrent,
        position_title: input.positionTitle.trim(),
        appointment_status: input.appointmentStatus ?? null,
        employment_type: input.employmentType ?? null,
        station_place: input.stationPlace ?? null,
        branch: input.branch ?? null,
        monthly_salary: input.monthlySalary ?? null,
        salary_grade_step: input.salaryGradeStep ?? null,
        movement_type: input.movementType ?? null,
        separation_date: input.separationDate ?? null,
        separation_cause: input.separationCause ?? null,
        leave_without_pay: input.leaveWithoutPay ?? null,
        remarks: input.remarks ?? null,
        updated_by_user_id: appUserId,
    };
}

export async function createServiceRecord(input: ServiceRecordEntryInput, appUserId: string) {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const { data, error } = await db
        .from("employee_service_records")
        .insert({ ...buildPayload(input, appUserId), created_by_user_id: appUserId })
        .select("id")
        .single();
    return { ok: !error, error: error?.message, id: (data as { id: string } | null)?.id ?? null };
}

export async function updateServiceRecord(recordId: string, input: ServiceRecordEntryInput, appUserId: string) {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const { error } = await db
        .from("employee_service_records")
        .update(buildPayload(input, appUserId))
        .eq("id", recordId)
        .is("deleted_at", null);
    return { ok: !error, error: error?.message };
}

export async function archiveServiceRecord(recordId: string, appUserId: string) {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New migration table is not in generated Supabase types yet.
    const db = supabase as any;
    const now = new Date().toISOString();
    const { error } = await db
        .from("employee_service_records")
        .update({ archived_at: now, deleted_at: now, updated_by_user_id: appUserId })
        .eq("id", recordId)
        .is("deleted_at", null);
    return { ok: !error, error: error?.message };
}