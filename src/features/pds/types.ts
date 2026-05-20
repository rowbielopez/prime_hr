export type PdsProfileStatus =
    | "not_started"
    | "draft"
    | "incomplete"
    | "ready_for_review"
    | "under_hr_review"
    | "returned_for_correction"
    | "verified"
    | "generated";

export type PdsSectionKey =
    | "overview"
    | "personal_information"
    | "family_background"
    | "educational_background"
    | "civil_service_eligibility"
    | "work_experience"
    | "voluntary_work"
    | "learning_development"
    | "other_information"
    | "references"
    | "declaration"
    | "review_generate";

export type PdsIssueSeverity = "info" | "warning" | "error" | "critical";

export type PdsSectionDefinition = {
    key: PdsSectionKey;
    label: string;
    description: string;
    sheet: "C1" | "C2" | "C3" | "C4" | "Workspace";
    repeatable?: boolean;
};

export type PdsValidationIssue = {
    sectionKey: PdsSectionKey;
    recordId?: string | null;
    fieldKey?: string | null;
    label: string;
    severity: PdsIssueSeverity;
    message: string;
    blocking: boolean;
    ruleCode: string;
};

export type PdsSectionCompletion = {
    sectionKey: PdsSectionKey;
    status: "not_started" | "draft" | "complete" | "blocked";
    completedRequired: number;
    totalRequired: number;
    issues: PdsValidationIssue[];
};

export type PdsWorkspaceSummary = {
    profileStatus: PdsProfileStatus;
    completionScore: number;
    sectionCompletions: PdsSectionCompletion[];
    lastSavedAt?: Date | null;
};
