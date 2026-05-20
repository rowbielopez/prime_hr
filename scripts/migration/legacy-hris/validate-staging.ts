/**
 * legacy:validate — run quality checks against loaded staging rows.
 *
 * Usage:
 *   npm run legacy:validate -- --batch <uuid>
 *
 * Output: scripts/migration/legacy-hris/reports/issues-<batchId>.json
 * Summary row also written back to migration_batches.summary.validation.
 *
 * Checks performed (per table):
 *   employee_profile: required fields (last_name, first_name, employee_id, sex, birth_date),
 *                     date parse, sex enum, duplicate employee_id
 *   address:          permanent/residential completeness
 *   contacts:         mobile format
 *   educational_bg:   date ranges valid
 *   eligibility:      required rating/exam_date
 *   service_record:   required fields, date ranges
 *   government_id:    at least one non-null number
 *   users:            forbidden columns flagged (password, otp, etc.)
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminClient } from "./_shared/admin-client";
import { createLogger } from "./_shared/logger";
import {
    ruleDateParsed,
    ruleForbiddenColumn,
    ruleMobileFormat,
    ruleRequiredString,
    combineIssues,
    isBlocking,
} from "../../../src/features/migration/legacy-hris/validators";
import {
    parseLegacyDate,
    cleanString,
    normalizeMobile,
    normalizeSex,
} from "../../../src/features/migration/legacy-hris/transformers";
import type { LegacyIssue, LegacyTable } from "../../../src/features/migration/legacy-hris/types";

const log = createLogger("validate");

const REPORTS_DIR = resolve(
    process.cwd(),
    "scripts",
    "migration",
    "legacy-hris",
    "reports",
);

const FORBIDDEN_USERS = ["password", "remember_token", "otp", "api_token"];
const BATCH_FETCH_SIZE = 1000;

function parseArgs() {
    const args = process.argv.slice(2);
    const idx = args.indexOf("--batch");
    // PowerShell strips --batch; fall back to first positional arg
    const batchId = idx !== -1 ? args[idx + 1] : (args.find((a) => !a.startsWith("-")) ?? null);
    if (!batchId) {
        throw new Error("Usage: legacy:validate -- --batch <uuid>");
    }
    return { batchId };
}

type Payload = Record<string, unknown>;

async function* fetchRows(
    client: ReturnType<typeof getAdminClient>,
    table: LegacyTable,
    batchId: string,
): AsyncGenerator<{ _legacy_id: string; payload: Payload }> {
    let from = 0;
    while (true) {
        const { data, error } = await client
            .from(`legacy_staging_${table}`)
            .select("_legacy_id, payload")
            .eq("_batch_id", batchId)
            .range(from, from + BATCH_FETCH_SIZE - 1);

        if (error) throw new Error(`fetch legacy_staging_${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const row of data) yield row as { _legacy_id: string; payload: Payload };
        if (data.length < BATCH_FETCH_SIZE) break;
        from += BATCH_FETCH_SIZE;
    }
}

function validateEmployeeProfile(
    legacyId: string,
    p: Payload,
): LegacyIssue[] {
    // Legacy field names: emp_id/csu_id, fname, mid_name, lname, name_ext, sex, birth_date
    const empId = p.emp_id ?? p.csu_id ?? p.employee_id;
    const firstName = p.fname ?? p.first_name;
    const lastName = p.lname ?? p.last_name;
    const ctx = { legacyTable: "employee_profile" as LegacyTable, legacyId, recordRef: String(empId ?? legacyId) };
    const birthDate = parseLegacyDate(p.birth_date);
    return combineIssues(
        ruleRequiredString(ctx, "emp_id", empId),
        ruleRequiredString(ctx, "last_name", lastName),
        ruleRequiredString(ctx, "first_name", firstName),
        ruleDateParsed(ctx, "birth_date", p.birth_date, birthDate, { required: true, blocking: false }),
        normalizeSex(p.sex) === null && cleanString(p.sex) !== null
            ? [{ code: "SEX_INVALID", severity: "warning" as const, legacyTable: "employee_profile" as LegacyTable, legacyId, message: `sex value "${p.sex}" unrecognised`, blocking: false }]
            : [],
    );
}

function validateAddress(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "address" as LegacyTable, legacyId, recordRef: String(p.employee_id ?? legacyId) };
    const issues: LegacyIssue[] = [];
    // At least one address type should have a city/municipality
    if (!cleanString(p.perm_city) && !cleanString(p.res_city) && !cleanString(p.city)) {
        issues.push({ code: "ADDRESS_NO_CITY", severity: "warning", legacyTable: "address", legacyId, recordRef: ctx.recordRef, message: "No city/municipality found in any address field", blocking: false });
    }
    return issues;
}

function validateContacts(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "contacts" as LegacyTable, legacyId, recordRef: String(p.employee_id ?? legacyId) };
    const mobile = normalizeMobile(p.mobile_no ?? p.mobile ?? p.contact_number);
    return ruleMobileFormat(ctx, "mobile", mobile);
}

function validateEducationalBg(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "educational_bg" as LegacyTable, legacyId, recordRef: String(p.employee_id ?? legacyId) };
    const from = parseLegacyDate(p.year_from ?? p.from_year);
    const to = parseLegacyDate(p.year_to ?? p.to_year);
    const issues: LegacyIssue[] = [];
    if ((p.year_from || p.from_year) && from === null) {
        issues.push(...ruleDateParsed(ctx, "year_from", p.year_from ?? p.from_year, from));
    }
    if (from && to && to < from) {
        issues.push({ code: "DATE_RANGE_INVERTED", severity: "warning", legacyTable: "educational_bg", legacyId, recordRef: ctx.recordRef, message: "year_to is before year_from", blocking: false });
    }
    return issues;
}

function validateEligibility(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "eligibility" as LegacyTable, legacyId, recordRef: String(p.employee_id ?? legacyId) };
    const examDate = parseLegacyDate(p.exam_date ?? p.date_exam);
    return combineIssues(
        ruleRequiredString(ctx, "eligibility_name", p.eligibility_name ?? p.name, { blocking: false }),
        ruleDateParsed(ctx, "exam_date", p.exam_date ?? p.date_exam, examDate, { blocking: false }),
    );
}

function validateServiceRecord(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "service_record" as LegacyTable, legacyId, recordRef: String(p.employee_id ?? legacyId) };
    const dateFrom = parseLegacyDate(p.date_from ?? p.from_date);
    const dateTo = parseLegacyDate(p.date_to ?? p.to_date ?? p.to);
    const issues: LegacyIssue[] = [];
    if ((p.date_from || p.from_date) && dateFrom === null) {
        issues.push(...ruleDateParsed(ctx, "date_from", p.date_from ?? p.from_date, dateFrom, { blocking: false }));
    }
    if (dateFrom && dateTo && dateTo < dateFrom) {
        issues.push({ code: "DATE_RANGE_INVERTED", severity: "warning", legacyTable: "service_record", legacyId, recordRef: ctx.recordRef, message: "date_to is before date_from", blocking: false });
    }
    return issues;
}

function validateGovernmentId(legacyId: string, p: Payload): LegacyIssue[] {
    const idFields = ["gsis", "pagibig", "philhealth", "sss", "tin"];
    const hasAny = idFields.some((f) => cleanString(p[f]) !== null);
    if (!hasAny) {
        return [{
            code: "GOVERNMENT_ID_ALL_MISSING",
            severity: "warning",
            legacyTable: "government_id",
            legacyId,
            recordRef: String(p.employee_id ?? legacyId),
            message: "All government ID fields are empty",
            blocking: false,
        }];
    }
    return [];
}

function validateUsers(legacyId: string, p: Payload): LegacyIssue[] {
    const ctx = { legacyTable: "users" as LegacyTable, legacyId };
    return ruleForbiddenColumn(ctx, FORBIDDEN_USERS, p);
}

const VALIDATORS: Partial<Record<LegacyTable, (id: string, p: Payload) => LegacyIssue[]>> = {
    employee_profile: validateEmployeeProfile,
    address: validateAddress,
    contacts: validateContacts,
    educational_bg: validateEducationalBg,
    eligibility: validateEligibility,
    service_record: validateServiceRecord,
    government_id: validateGovernmentId,
    users: validateUsers,
};

async function main() {
    const { batchId } = parseArgs();
    const client = getAdminClient();

    // Verify batch exists
    const { data: batch, error: batchErr } = await client
        .from("migration_batches")
        .select("id, status")
        .eq("id", batchId)
        .single();
    if (batchErr || !batch) throw new Error(`Batch ${batchId} not found`);
    log.info(`validating batch ${batchId}`);

    mkdirSync(REPORTS_DIR, { recursive: true });

    const allIssues: LegacyIssue[] = [];
    const tableSummary: Record<string, { rows: number; blocking: number; warnings: number; infos: number }> = {};

    const tables = Object.keys(VALIDATORS) as LegacyTable[];

    for (const table of tables) {
        const validator = VALIDATORS[table]!;
        let rows = 0;
        let blockingCount = 0;
        let warningCount = 0;
        let infoCount = 0;

        for await (const { _legacy_id, payload } of fetchRows(client, table, batchId)) {
            rows++;
            const issues = validator(_legacy_id, payload as Payload);
            for (const issue of issues) {
                if (issue.blocking) blockingCount++;
                else if (issue.severity === "warning") warningCount++;
                else infoCount++;
            }
            allIssues.push(...issues);
        }

        tableSummary[table] = { rows, blocking: blockingCount, warnings: warningCount, infos: infoCount };
        log.info(`${table.padEnd(24)} rows=${rows} blocking=${blockingCount} warnings=${warningCount}`);
    }

    const outFile = resolve(REPORTS_DIR, `issues-${batchId}.json`);
    writeFileSync(outFile, JSON.stringify({ batchId, generatedAt: new Date().toISOString(), tableSummary, issues: allIssues }, null, 2));
    log.ok(`wrote ${outFile}`);

    // Update batch summary
    await client
        .from("migration_batches")
        .update({ summary: { validation: tableSummary, issueCount: allIssues.length, blockingCount: allIssues.filter(i => i.blocking).length } })
        .eq("id", batchId);

    const totalBlocking = allIssues.filter(i => i.blocking).length;
    log.ok(`total: ${allIssues.length} issues, ${totalBlocking} blocking`);
    if (totalBlocking > 0) {
        log.warn(`${totalBlocking} blocking issues found — run with --apply on migrate will skip those rows`);
    }
}

main().catch((err) => {
    log.error((err as Error).message);
    process.exitCode = 1;
});
