export type ServiceRecordEntry = {
    id: string;
    employeeId: string;
    campusId: string;
    officeId: string | null;
    dateFrom: string;
    dateTo: string | null;
    isCurrent: boolean;
    positionTitle: string;
    appointmentStatus: string | null;
    employmentType: string | null;
    stationPlace: string | null;
    branch: string | null;
    monthlySalary: number | null;
    salaryGradeStep: string | null;
    movementType: string | null;
    separationDate: string | null;
    separationCause: string | null;
    leaveWithoutPay: string | null;
    remarks: string | null;
    archivedAt: string | null;
    updatedAt: string;
};

export type ServiceRecordEmployeeSummary = {
    employeeId: string;
    employeeNo: string;
    fullName: string;
    campusId: string;
    campusName: string;
    officeId: string | null;
    officeName: string | null;
    currentPosition: string | null;
    employmentStatus: "active" | "on_leave" | "separated" | "retired";
    dateHired: string | null;
    entriesCount: number;
    latestServiceDate: string | null;
    lastUpdated: string | null;
    needsReview: boolean;
    hasCurrentRecord: boolean;
};

export type ServiceRecordListSummary = {
    totalEmployeesWithRecords: number;
    activeEmployees: number;
    recordsUpdatedThisMonth: number;
    employeesMissingServiceRecords: number;
    recordsNeedingReview: number;
};

export type ServiceRecordListResult = {
    summary: ServiceRecordListSummary;
    rows: ServiceRecordEmployeeSummary[];
};

export type ServiceRecordQualityWarning = {
    key: string;
    label: string;
    description: string;
    severity: "warning" | "error";
};

export type ServiceRecordEmployeeDetail = {
    employee: {
        id: string;
        employeeNo: string;
        fullName: string;
        campusId: string;
        campusName: string;
        officeId: string | null;
        officeName: string | null;
        positionTitle: string | null;
        employmentStatus: "active" | "on_leave" | "separated" | "retired";
        dateHired: string | null;
        employmentType: string | null;
    };
    entries: ServiceRecordEntry[];
    currentEntry: ServiceRecordEntry | null;
    warnings: ServiceRecordQualityWarning[];
};

export type ServiceRecordArchiveResult = { ok: true } | { ok: false; error: string };
export type ServiceRecordMutationResult = { ok: true; id: string; warning?: string } | { ok: false; error: string };