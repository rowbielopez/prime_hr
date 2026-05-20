/**
 * Domain types for the legacy HRIS migration pipeline.
 */

export type LegacyTable =
    | "employee_profile"
    | "address"
    | "contacts"
    | "family"
    | "children"
    | "educational_bg"
    | "eligibility"
    | "service_record"
    | "government_id"
    | "skills"
    | "organizations"
    | "recognition"
    | "trainings"
    | "training_participants"
    | "training_post"
    | "users"
    | "logs_tbl";

export const LEGACY_TABLES: readonly LegacyTable[] = [
    "employee_profile",
    "address",
    "contacts",
    "family",
    "children",
    "educational_bg",
    "eligibility",
    "service_record",
    "government_id",
    "skills",
    "organizations",
    "recognition",
    "trainings",
    "training_participants",
    "training_post",
    "users",
    "logs_tbl",
];

/** Issue severity surfaced to HR reviewers. */
export type LegacyIssueSeverity = "info" | "warning" | "error";

/** A single validation finding produced by a validator. */
export interface LegacyIssue {
    code: string;
    severity: LegacyIssueSeverity;
    legacyTable: LegacyTable;
    legacyId: string;
    /** Optional human reference for HR (e.g. employee code). */
    recordRef?: string;
    message: string;
    /** When true, target write is skipped and the row is queued for review. */
    blocking: boolean;
    /** Optional structured context for the report UI. */
    context?: Record<string, unknown>;
}

/** Result emitted from a per-row transformer. */
export interface TransformResult<T> {
    value: T | null;
    issues: LegacyIssue[];
}

/** Per-table mapping descriptor used by the migrate orchestrator. */
export interface LegacyTableMapping {
    legacyTable: LegacyTable;
    /** Target table in `public.*`. May be null for staging-only tables. */
    targetTable: string | null;
    /** Whether records of this table can be migrated independently. */
    standalone: boolean;
    /** Tables that must be migrated first. */
    dependsOn: readonly LegacyTable[];
    /** Sensitive columns that must NEVER leave the staging schema. */
    forbiddenColumns: readonly string[];
}
