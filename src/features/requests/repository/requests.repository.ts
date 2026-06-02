import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmployeeRequestFormInput } from "@/features/requests/schemas/request.schema";
import type {
    EmployeeRequestHistoryItem,
    EmployeeRequestListItem,
    EmployeeRequestReviewDetail,
    EmployeeRequestReviewListItem,
    EmployeeRequestStatus,
    EmployeeRequestType,
} from "@/features/requests/types";
import { ACTIVE_DUPLICATE_STATUSES } from "@/features/requests/types";

type EmployeeRequestRow = {
    id: string;
    employee_id?: string;
    campus_id?: string;
    office_id?: string | null;
    request_type: EmployeeRequestType;
    subject: string;
    description: string;
    field_to_correct: string | null;
    current_value: string | null;
    requested_value: string | null;
    related_module: string | null;
    status: EmployeeRequestStatus;
    hr_remarks: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewed_by_user_id?: string | null;
    completed_at?: string | null;
    internal_notes?: string | null;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
};

type RelatedName = { name: string } | Array<{ name: string }> | null;
type ReviewerRow = { first_name: string | null; middle_name: string | null; last_name: string | null; email: string } | Array<{ first_name: string | null; middle_name: string | null; last_name: string | null; email: string }> | null;

type ReviewEmployeeRow = {
    id: string;
    employee_no: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    email: string | null;
    mobile_no: string | null;
    position_title: string | null;
    employment_status: string;
};

type EmployeeRequestReviewRow = EmployeeRequestRow & {
    employee_id: string;
    campus_id: string;
    office_id: string | null;
    completed_at: string | null;
    internal_notes: string | null;
    employee: ReviewEmployeeRow | ReviewEmployeeRow[] | null;
    campus: RelatedName;
    office: RelatedName;
    reviewer: ReviewerRow;
};

type EmployeeRequestHistoryRow = {
    id: string;
    from_status: EmployeeRequestStatus | null;
    to_status: EmployeeRequestStatus;
    remarks: string | null;
    actor: ReviewerRow;
    created_at: string;
};

const requestSelect = [
    "id",
    "request_type",
    "subject",
    "description",
    "field_to_correct",
    "current_value",
    "requested_value",
    "related_module",
    "status",
    "hr_remarks",
    "submitted_at",
    "reviewed_at",
    "cancelled_at",
    "created_at",
    "updated_at",
].join(", ");

const reviewRequestSelect = [
    requestSelect,
    "employee_id",
    "campus_id",
    "office_id",
    "completed_at",
    "internal_notes",
    "employee:employees(id, employee_no, first_name, middle_name, last_name, suffix, email, mobile_no, position_title, employment_status)",
    "campus:campuses(name)",
    "office:offices(name)",
    "reviewer:app_users!employee_requests_reviewed_by_user_id_fkey(first_name, middle_name, last_name, email)",
].join(", ");

function resolveRelatedName(input: RelatedName) {
    if (!input) return null;
    return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function formatPersonName(input: { first_name: string | null; middle_name?: string | null; last_name: string | null; suffix?: string | null; email?: string | null }) {
    const name = [input.first_name, input.middle_name, input.last_name, input.suffix].filter(Boolean).join(" ").trim();
    return name || input.email || null;
}

function resolveReviewerName(input: ReviewerRow) {
    if (!input) return null;
    const row = Array.isArray(input) ? input[0] : input;
    if (!row) return null;
    return formatPersonName(row);
}

function resolveEmployee(input: ReviewEmployeeRow | ReviewEmployeeRow[] | null) {
    return Array.isArray(input) ? (input[0] ?? null) : input;
}

function mapRow(row: EmployeeRequestRow): EmployeeRequestListItem {
    return {
        id: row.id,
        requestType: row.request_type,
        subject: row.subject,
        description: row.description,
        fieldToCorrect: row.field_to_correct,
        currentValue: row.current_value,
        requestedValue: row.requested_value,
        relatedModule: row.related_module,
        status: row.status,
        hrRemarks: row.hr_remarks,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        cancelledAt: row.cancelled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapReviewRow(row: EmployeeRequestReviewRow): EmployeeRequestReviewListItem {
    const employee = resolveEmployee(row.employee);
    return {
        ...mapRow(row),
        employeeId: row.employee_id,
        employeeNo: employee?.employee_no ?? "-",
        employeeName: employee ? formatPersonName(employee) ?? "Unknown employee" : "Unknown employee",
        campusId: row.campus_id,
        campusName: resolveRelatedName(row.campus) ?? "Unknown campus",
        officeId: row.office_id,
        officeName: resolveRelatedName(row.office),
        positionTitle: employee?.position_title ?? null,
        employmentStatus: employee?.employment_status ?? "unknown",
        reviewedByName: resolveReviewerName(row.reviewer),
        completedAt: row.completed_at,
    };
}

function mapHistoryRow(row: EmployeeRequestHistoryRow): EmployeeRequestHistoryItem {
    return {
        id: row.id,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        remarks: row.remarks,
        actorName: resolveReviewerName(row.actor),
        createdAt: row.created_at,
    };
}

export async function listMyEmployeeRequests(employeeId: string): Promise<EmployeeRequestListItem[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select(requestSelect)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

    if (error || !data) return [];
    return (data as EmployeeRequestRow[]).map(mapRow);
}

export async function getMyEmployeeRequestById(employeeId: string, requestId: string): Promise<EmployeeRequestListItem | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select(requestSelect)
        .eq("id", requestId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error || !data) return null;
    return mapRow(data as EmployeeRequestRow);
}

export async function findSimilarActiveRequest(
    employeeId: string,
    input: EmployeeRequestFormInput,
    excludeRequestId?: string
): Promise<EmployeeRequestListItem | null> {
    const supabase = await createSupabaseServerClient();
    let query = supabase
        .from("employee_requests")
        .select(requestSelect)
        .eq("employee_id", employeeId)
        .eq("request_type", input.requestType)
        .in("status", ACTIVE_DUPLICATE_STATUSES)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1);

    if (input.fieldToCorrect) {
        query = query.eq("field_to_correct", input.fieldToCorrect);
    } else {
        query = query.is("field_to_correct", null);
    }

    if (input.relatedModule) {
        query = query.eq("related_module", input.relatedModule);
    } else {
        query = query.is("related_module", null);
    }

    if (excludeRequestId) {
        query = query.neq("id", excludeRequestId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return mapRow(data as EmployeeRequestRow);
}

export async function getEditableRequestScope(
    employeeId: string,
    requestId: string
): Promise<{ id: string; status: EmployeeRequestStatus; campusId: string } | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select("id, status, campus_id")
        .eq("id", requestId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error || !data) return null;
    const row = data as { id: string; status: EmployeeRequestStatus; campus_id: string };
    return { id: row.id, status: row.status, campusId: row.campus_id };
}

export async function listEmployeeRequestsForReview(): Promise<EmployeeRequestReviewListItem[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select(reviewRequestSelect)
        .neq("status", "draft")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

    if (error || !data) return [];
    return (data as EmployeeRequestReviewRow[]).map(mapReviewRow);
}

export async function getEmployeeRequestReviewDetail(requestId: string): Promise<EmployeeRequestReviewDetail | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select(reviewRequestSelect)
        .eq("id", requestId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error || !data) return null;
    const row = data as EmployeeRequestReviewRow;
    const employee = resolveEmployee(row.employee);
    const { data: history } = await supabase
        .from("employee_request_status_history")
        .select("id, from_status, to_status, remarks, actor:app_users!employee_request_status_history_actor_user_id_fkey(first_name, middle_name, last_name, email), created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

    return {
        ...mapReviewRow(row),
        employeeEmail: employee?.email ?? null,
        mobileNo: employee?.mobile_no ?? null,
        internalNotes: row.internal_notes,
        history: ((history ?? []) as EmployeeRequestHistoryRow[]).map(mapHistoryRow),
    };
}

export async function getEmployeeRequestReviewScope(requestId: string): Promise<{
    id: string;
    employeeId: string;
    campusId: string;
    officeId: string | null;
    status: EmployeeRequestStatus;
    requestType: EmployeeRequestType;
} | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .select("id, employee_id, campus_id, office_id, status, request_type")
        .eq("id", requestId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error || !data) return null;
    const row = data as {
        id: string;
        employee_id: string;
        campus_id: string;
        office_id: string | null;
        status: EmployeeRequestStatus;
        request_type: EmployeeRequestType;
    };
    return {
        id: row.id,
        employeeId: row.employee_id,
        campusId: row.campus_id,
        officeId: row.office_id,
        status: row.status,
        requestType: row.request_type,
    };
}
