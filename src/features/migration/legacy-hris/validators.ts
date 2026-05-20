/**
 * Validators for legacy HRIS migration.
 *
 * Each validator inspects a transformed record and emits zero or more
 * `LegacyIssue` objects. Blocking issues skip the target write; non-blocking
 * issues land in the HR review report.
 */
import type { LegacyIssue, LegacyTable } from "./types";

interface ValidationContext {
    legacyTable: LegacyTable;
    legacyId: string;
    recordRef?: string;
}

export function ruleRequiredString(
    ctx: ValidationContext,
    field: string,
    value: unknown,
    opts?: { blocking?: boolean },
): LegacyIssue[] {
    if (value !== null && value !== undefined && String(value).trim().length > 0) {
        return [];
    }
    return [
        {
            code: "REQUIRED_MISSING",
            severity: "error",
            legacyTable: ctx.legacyTable,
            legacyId: ctx.legacyId,
            recordRef: ctx.recordRef,
            message: `${field} is required but missing`,
            blocking: opts?.blocking ?? true,
            context: { field },
        },
    ];
}

export function ruleDateParsed(
    ctx: ValidationContext,
    field: string,
    raw: unknown,
    parsed: string | null,
    opts?: { blocking?: boolean; required?: boolean },
): LegacyIssue[] {
    if (raw === null || raw === undefined || String(raw).trim().length === 0) {
        if (opts?.required) {
            return [
                {
                    code: "DATE_REQUIRED",
                    severity: "error",
                    legacyTable: ctx.legacyTable,
                    legacyId: ctx.legacyId,
                    recordRef: ctx.recordRef,
                    message: `${field} date is required`,
                    blocking: opts.blocking ?? true,
                    context: { field },
                },
            ];
        }
        return [];
    }
    if (parsed === null) {
        return [
            {
                code: "DATE_UNPARSEABLE",
                severity: "warning",
                legacyTable: ctx.legacyTable,
                legacyId: ctx.legacyId,
                recordRef: ctx.recordRef,
                message: `${field} could not be parsed: "${String(raw)}"`,
                blocking: opts?.blocking ?? false,
                context: { field, raw },
            },
        ];
    }
    return [];
}

export function ruleMobileFormat(
    ctx: ValidationContext,
    field: string,
    value: string | null,
): LegacyIssue[] {
    if (!value) return [];
    if (/^\+63\d{10}$/.test(value)) return [];
    return [
        {
            code: "MOBILE_NONSTANDARD",
            severity: "warning",
            legacyTable: ctx.legacyTable,
            legacyId: ctx.legacyId,
            recordRef: ctx.recordRef,
            message: `${field} is not in +63XXXXXXXXXX format: "${value}"`,
            blocking: false,
            context: { field, value },
        },
    ];
}

export function ruleForbiddenColumn(
    ctx: ValidationContext,
    forbidden: readonly string[],
    payload: Record<string, unknown>,
): LegacyIssue[] {
    const issues: LegacyIssue[] = [];
    for (const col of forbidden) {
        if (payload[col] !== undefined && payload[col] !== null && payload[col] !== "") {
            issues.push({
                code: "FORBIDDEN_COLUMN_PRESENT",
                severity: "info",
                legacyTable: ctx.legacyTable,
                legacyId: ctx.legacyId,
                recordRef: ctx.recordRef,
                message: `column "${col}" present in legacy data — will NOT be migrated`,
                blocking: false,
                context: { column: col },
            });
        }
    }
    return issues;
}

export function combineIssues(...issueLists: LegacyIssue[][]): LegacyIssue[] {
    return issueLists.flat();
}

export function isBlocking(issues: readonly LegacyIssue[]): boolean {
    return issues.some((i) => i.blocking);
}
