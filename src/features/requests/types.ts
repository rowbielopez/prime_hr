import type { StatusTone } from "@/components/foundation/feedback/status-badge";

export type EmployeeRequestType =
    | "profile_correction"
    | "employment_detail_correction"
    | "pds_update"
    | "service_record_correction"
    | "document_request"
    | "certificate_request"
    | "leave_related_request"
    | "account_login_concern"
    | "other_hr_request";

export type EmployeeRequestStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "returned_for_revision"
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled";

export type EmployeeRequestListItem = {
    id: string;
    requestType: EmployeeRequestType;
    subject: string;
    description: string;
    fieldToCorrect: string | null;
    currentValue: string | null;
    requestedValue: string | null;
    relatedModule: string | null;
    status: EmployeeRequestStatus;
    hrRemarks: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type EmployeeRequestHistoryItem = {
    id: string;
    fromStatus: EmployeeRequestStatus | null;
    toStatus: EmployeeRequestStatus;
    remarks: string | null;
    actorName: string | null;
    createdAt: string;
};

export type EmployeeRequestReviewListItem = EmployeeRequestListItem & {
    employeeId: string;
    employeeNo: string;
    employeeName: string;
    campusId: string;
    campusName: string;
    officeId: string | null;
    officeName: string | null;
    positionTitle: string | null;
    employmentStatus: string;
    reviewedByName: string | null;
    completedAt: string | null;
};

export type EmployeeRequestReviewDetail = EmployeeRequestReviewListItem & {
    employeeEmail: string | null;
    mobileNo: string | null;
    internalNotes: string | null;
    history: EmployeeRequestHistoryItem[];
};

export type EmployeeRequestReviewSummary = {
    total: number;
    submitted: number;
    underReview: number;
    returned: number;
    approved: number;
    rejected: number;
    completed: number;
};

export type EmployeeRequestSummary = {
    total: number;
    pending: number;
    underReview: number;
    returned: number;
    approved: number;
    completed: number;
};

export const EMPLOYEE_REQUEST_TYPE_LABELS: Record<EmployeeRequestType, string> = {
    profile_correction: "Profile Correction",
    employment_detail_correction: "Employment Detail Correction",
    pds_update: "PDS Update Request",
    service_record_correction: "Service Record Correction",
    document_request: "Document Request",
    certificate_request: "Certificate Request",
    leave_related_request: "Leave-Related Request",
    account_login_concern: "Account Email / Login Concern",
    other_hr_request: "Other HR Request",
};

export const EMPLOYEE_REQUEST_STATUS_LABELS: Record<EmployeeRequestStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    returned_for_revision: "Returned for Revision",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
};

export const EMPLOYEE_REQUEST_STATUS_TONES: Record<EmployeeRequestStatus, StatusTone> = {
    draft: "inactive",
    submitted: "pending",
    under_review: "info",
    returned_for_revision: "warning",
    approved: "active",
    rejected: "error",
    completed: "active",
    cancelled: "inactive",
};

export const EMPLOYEE_REQUEST_TYPES = Object.entries(EMPLOYEE_REQUEST_TYPE_LABELS).map(([value, label]) => ({
    value: value as EmployeeRequestType,
    label,
}));

export const EMPLOYEE_REQUEST_STATUSES = Object.entries(EMPLOYEE_REQUEST_STATUS_LABELS).map(([value, label]) => ({
    value: value as EmployeeRequestStatus,
    label,
}));

export const CORRECTION_REQUEST_TYPES: EmployeeRequestType[] = [
    "profile_correction",
    "employment_detail_correction",
    "service_record_correction",
    "account_login_concern",
];

export const ACTIVE_DUPLICATE_STATUSES: EmployeeRequestStatus[] = [
    "submitted",
    "under_review",
    "returned_for_revision",
];

export const HR_REVIEWABLE_REQUEST_STATUSES: EmployeeRequestStatus[] = [
    "submitted",
    "under_review",
    "returned_for_revision",
    "approved",
    "rejected",
    "completed",
    "cancelled",
];

export const HR_REQUEST_TRANSITIONS: Record<EmployeeRequestStatus, EmployeeRequestStatus[]> = {
    draft: [],
    submitted: ["under_review", "approved", "rejected", "returned_for_revision"],
    under_review: ["approved", "rejected", "returned_for_revision", "completed"],
    returned_for_revision: [],
    approved: ["completed"],
    rejected: [],
    completed: [],
    cancelled: [],
};

export function getRequestStatusLabel(status: EmployeeRequestStatus) {
    return EMPLOYEE_REQUEST_STATUS_LABELS[status];
}

export function getRequestTypeLabel(type: EmployeeRequestType) {
    return EMPLOYEE_REQUEST_TYPE_LABELS[type];
}
