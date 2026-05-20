/**
 * Read-only analyzer for legacy HRIS employee/service-record mismatches.
 *
 * This script parses public/hris.sql as text. It never connects to Supabase,
 * never executes SQL, and never imports data. Outputs are masked review reports.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMysqlDumpFile } from "./migration/legacy-hris/_shared/sql-parser";
import { createLogger } from "./migration/legacy-hris/_shared/logger";

type SqlValue = string | number | null;
type LegacyRow = Record<string, SqlValue>;

interface EmployeeRow extends LegacyRow {
    id: SqlValue;
    emp_id: SqlValue;
    csu_id: SqlValue;
    fname: SqlValue;
    mid_name: SqlValue;
    lname: SqlValue;
    name_ext: SqlValue;
    birth_date: SqlValue;
    campus: SqlValue;
    department: SqlValue;
    position: SqlValue;
    employment_status: SqlValue;
    classification: SqlValue;
    Active_Status: SqlValue;
}

interface ServiceRecordRow extends LegacyRow {
    sr_id: SqlValue;
    employee_id: SqlValue;
    date_from: SqlValue;
    date_to: SqlValue;
    sr_position: SqlValue;
    pos_des: SqlValue;
    appointment_status: SqlValue;
    office: SqlValue;
    category: SqlValue;
    organization: SqlValue;
}

interface ContactRow extends LegacyRow {
    email: SqlValue;
    mobile: SqlValue;
    employee_id: SqlValue;
}

interface GovernmentIdRow extends LegacyRow {
    gsis: SqlValue;
    tin: SqlValue;
    pagibig: SqlValue;
    philhealth: SqlValue;
    sss: SqlValue;
    National_ID: SqlValue;
    employee_id: SqlValue;
}

interface TableInfo {
    columns: string[];
    rowCount: number;
}

interface IssueRow {
    category: string;
    risk: RiskLevel;
    reference: string;
    details: string;
    recommendedAction: string;
}

interface EmployeePreviewRow {
    legacyEmployeeNo: string;
    normalizedEmployeeNo: string;
    campusRef: string;
    departmentRef: string;
    positionRef: string;
    employmentStatus: string;
    classification: string;
    serviceRecordCount: number;
    matchStatus: string;
    issueCount: number;
}

interface ServicePreviewRow {
    legacyServiceRecordId: string;
    legacyEmployeeRef: string;
    normalizedEmployeeRef: string;
    matchConfidence: "High" | "Unknown";
    dateFrom: string;
    dateTo: string;
    position: string;
    office: string;
    appointmentStatus: string;
    issueCount: number;
}

type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk" | "Needs Manual Review";

const log = createLogger("legacy-mismatch");

const SOURCE = resolve(process.cwd(), "public", "hris.sql");
const DOCS_OUT = resolve(process.cwd(), "docs", "generated");
const CSV_OUT = resolve(process.cwd(), "scripts", "output");

const TARGET_TABLES = new Set([
    "employee_profile",
    "service_record",
    "contacts",
    "government_id",
]);

const NULL_SENTINELS = new Set(["", "N/A", "NA", "NONE", "NULL", "-", "N.A."]);

function valueToString(value: SqlValue | undefined): string {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
}

function cleanNullable(value: SqlValue | undefined): string {
    const cleaned = valueToString(value);
    return NULL_SENTINELS.has(cleaned.toUpperCase()) ? "" : cleaned;
}

function normalizeEmployeeRef(value: SqlValue | undefined): string {
    return cleanNullable(value)
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function looseEmployeeRef(value: SqlValue | undefined): string {
    return normalizeEmployeeRef(value).replace(/[\s-]+/g, "");
}

function normalizeNamePart(value: SqlValue | undefined): string {
    return cleanNullable(value).toUpperCase();
}

function employeeFullNameKey(row: EmployeeRow): string {
    return [row.lname, row.fname, row.mid_name, row.name_ext]
        .map(normalizeNamePart)
        .filter(Boolean)
        .join("|");
}

function employeeFullNameBirthKey(row: EmployeeRow): string {
    return `${employeeFullNameKey(row)}|${cleanNullable(row.birth_date)}`;
}

function normalizeGovernmentId(value: SqlValue | undefined): string {
    return cleanNullable(value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeEmail(value: SqlValue | undefined): string {
    return cleanNullable(value).toLowerCase();
}

function normalizeServiceComposite(row: ServiceRecordRow): string {
    return [
        normalizeEmployeeRef(row.employee_id),
        cleanNullable(row.date_from),
        cleanNullable(row.date_to),
        cleanNullable(row.sr_position) || cleanNullable(row.pos_des),
        cleanNullable(row.office),
        cleanNullable(row.appointment_status),
    ]
        .map((part) => part.toUpperCase())
        .join("|");
}

function parseLegacyDate(value: SqlValue | undefined): string | null {
    const raw = cleanNullable(value);
    if (!raw || raw.toUpperCase() === "PRESENT") return null;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
    if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw);
    if (slash) {
        let year = Number(slash[3]);
        if (year < 100) year += year < 50 ? 2000 : 1900;
        return toIsoDate(year, Number(slash[1]), Number(slash[2]));
    }
    return null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isProblemDate(value: SqlValue | undefined, parsed: string | null, required: boolean): boolean {
    const raw = cleanNullable(value);
    if (!raw) return required;
    if (raw === "0000-00-00") return true;
    if (raw.toUpperCase() === "PRESENT") return false;
    if (!parsed) return true;
    const year = Number(parsed.slice(0, 4));
    return year < 1900;
}

function maskEmployeeRef(value: SqlValue | undefined): string {
    const raw = cleanNullable(value);
    if (!raw) return "[blank]";
    if (raw.length <= 4) return `${raw[0] ?? ""}***`;
    return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

function maskEmail(value: SqlValue | undefined): string {
    const raw = cleanNullable(value);
    if (!raw) return "";
    const at = raw.indexOf("@");
    if (at <= 0) return "[masked-email]";
    return `${raw[0]}***${raw.slice(at)}`;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
        const key = keyFn(item);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = keyFn(item);
        if (!key) continue;
        const existing = groups.get(key) ?? [];
        existing.push(item);
        groups.set(key, existing);
    }
    return groups;
}

function duplicatesFrom(counts: Map<string, number>): Array<[string, number]> {
    return [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);
}

function rowFrom(columns: string[], row: SqlValue[]): LegacyRow {
    const out: LegacyRow = {};
    columns.forEach((column, index) => {
        out[column] = row[index] ?? null;
    });
    return out;
}

function csvEscape(value: string | number): string {
    const raw = String(value);
    if (!/[",\n\r]/.test(raw)) return raw;
    return `"${raw.replace(/"/g, '""')}"`;
}

function writeCsv(path: string, rows: Array<Record<string, string | number>>) {
    const headers = rows[0] ? Object.keys(rows[0]) : ["empty"];
    const lines = [
        headers.map(csvEscape).join(","),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
    ];
    writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function table(headers: string[], rows: Array<Array<string | number>>): string {
    return [
        `| ${headers.join(" | ")} |`,
        `| ${headers.map(() => "---").join(" | ")} |`,
        ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "/")).join(" | ")} |`),
    ].join("\n");
}

function orphanCauseLine(orphanCount: number): string {
    if (orphanCount === 0) {
        return "3. In this run, every `service_record.employee_id` matched an `employee_profile.emp_id` after primary normalization; orphan handling remains part of the safety plan for future dump versions or stricter matching rules.";
    }
    return "3. Some `service_record` rows reference historical employee numbers that do not exist in `employee_profile`, likely because master records were deleted, renamed, or never migrated.";
}

function sample<T>(items: T[], limit = 8): T[] {
    return items.slice(0, limit);
}

function main() {
    const fileInfo = statSync(SOURCE);
    const tables: Record<string, TableInfo> = {};
    const employees: EmployeeRow[] = [];
    const serviceRecords: ServiceRecordRow[] = [];
    const contacts: ContactRow[] = [];
    const governmentIds: GovernmentIdRow[] = [];

    log.info(`reading ${SOURCE}`);
    parseMysqlDumpFile(SOURCE, {
        onTableSeen(tableName, columns) {
            tables[tableName] = { columns, rowCount: 0 };
        },
        onRow({ table: tableName, columns, row }) {
            const info = tables[tableName];
            if (info) info.rowCount++;
            if (!TARGET_TABLES.has(tableName)) return;
            const obj = rowFrom(columns, row);
            if (tableName === "employee_profile") employees.push(obj as EmployeeRow);
            if (tableName === "service_record") serviceRecords.push(obj as ServiceRecordRow);
            if (tableName === "contacts") contacts.push(obj as ContactRow);
            if (tableName === "government_id") governmentIds.push(obj as GovernmentIdRow);
        },
    });

    mkdirSync(DOCS_OUT, { recursive: true });
    mkdirSync(CSV_OUT, { recursive: true });

    const employeeKeyCounts = countBy(employees, (row) => normalizeEmployeeRef(row.emp_id));
    const serviceRefCounts = countBy(serviceRecords, (row) => normalizeEmployeeRef(row.employee_id));
    const employeeKeys = new Set(employeeKeyCounts.keys());
    const serviceKeys = new Set(serviceRefCounts.keys());
    const exactEmployeeRefs = new Set(employees.map((row) => cleanNullable(row.emp_id)).filter(Boolean));
    const exactServiceRefs = new Set(serviceRecords.map((row) => cleanNullable(row.employee_id)).filter(Boolean));
    const looseEmployeeKeys = new Set(employees.map((row) => looseEmployeeRef(row.emp_id)).filter(Boolean));
    const normalizedOnlyMatches = [...serviceKeys].filter(
        (key) => employeeKeys.has(key) && !exactEmployeeRefs.has(key),
    ).length;
    const looseOnlyMatches = [...serviceKeys].filter(
        (key) => !employeeKeys.has(key) && looseEmployeeKeys.has(key.replace(/[\s-]+/g, "")),
    ).length;

    const employeesWithService = [...employeeKeys].filter((key) => serviceKeys.has(key));
    const employeesWithoutService = employees.filter((row) => !serviceKeys.has(normalizeEmployeeRef(row.emp_id)));
    const orphanServiceRecords = serviceRecords.filter((row) => !employeeKeys.has(normalizeEmployeeRef(row.employee_id)));
    const orphanServiceRefs = [...serviceKeys].filter((key) => !employeeKeys.has(key));
    const matchingServiceRecords = serviceRecords.length - orphanServiceRecords.length;

    const duplicateEmployeeRefs = duplicatesFrom(employeeKeyCounts);
    const duplicateServiceRefs = duplicatesFrom(serviceRefCounts);
    const duplicateEmployeeFullNames = duplicatesFrom(countBy(employees, employeeFullNameKey));
    const duplicateEmployeeFullNameBirth = duplicatesFrom(countBy(employees, employeeFullNameBirthKey));
    const duplicateEmails = duplicatesFrom(countBy(contacts, (row) => normalizeEmail(row.email)));
    const duplicateTin = duplicatesFrom(countBy(governmentIds, (row) => normalizeGovernmentId(row.tin)));
    const duplicateGsis = duplicatesFrom(countBy(governmentIds, (row) => normalizeGovernmentId(row.gsis)));
    const duplicateServiceComposite = duplicatesFrom(countBy(serviceRecords, normalizeServiceComposite));

    const serviceByEmployee = groupBy(serviceRecords, (row) => normalizeEmployeeRef(row.employee_id));
    const multipleServiceEmployees = [...serviceByEmployee.entries()].filter(([, rows]) => rows.length > 1);

    let missingDateFrom = 0;
    let missingDateTo = 0;
    let invalidDateFrom = 0;
    let invalidDateTo = 0;
    let reversedDateRanges = 0;
    const dateIssueRows: ServiceRecordRow[] = [];

    for (const row of serviceRecords) {
        const from = parseLegacyDate(row.date_from);
        const to = parseLegacyDate(row.date_to);
        const rawFrom = cleanNullable(row.date_from);
        const rawTo = cleanNullable(row.date_to);
        const fromProblem = isProblemDate(row.date_from, from, true);
        const toProblem = isProblemDate(row.date_to, to, false);
        if (!rawFrom) missingDateFrom++;
        if (!rawTo) missingDateTo++;
        if (fromProblem && rawFrom) invalidDateFrom++;
        if (toProblem && rawTo) invalidDateTo++;
        if (from && to && to < from) reversedDateRanges++;
        if (fromProblem || toProblem || (from && to && to < from)) dateIssueRows.push(row);
    }

    const overlapSamples: Array<{ employeeRef: string; first: ServiceRecordRow; second: ServiceRecordRow }> = [];
    let employeesWithOverlaps = 0;
    let overlapPairCount = 0;
    for (const [employeeRef, rows] of serviceByEmployee.entries()) {
        const dated = rows
            .map((row) => ({
                row,
                from: parseLegacyDate(row.date_from),
                to: parseLegacyDate(row.date_to) ?? "9999-12-31",
            }))
            .filter((entry): entry is { row: ServiceRecordRow; from: string; to: string } => Boolean(entry.from))
            .sort((a, b) => a.from.localeCompare(b.from));
        let employeeHasOverlap = false;
        for (let index = 1; index < dated.length; index++) {
            const previous = dated[index - 1];
            const current = dated[index];
            if (current.from <= previous.to) {
                overlapPairCount++;
                employeeHasOverlap = true;
                if (overlapSamples.length < 8) {
                    overlapSamples.push({ employeeRef, first: previous.row, second: current.row });
                }
            }
        }
        if (employeeHasOverlap) employeesWithOverlaps++;
    }

    const campusGapCounts = countBy(employeesWithoutService, (row) => cleanNullable(row.campus) || "[blank]");
    const officeGapCounts = countBy(employeesWithoutService, (row) => cleanNullable(row.department) || "[blank]");

    const issueRows: IssueRow[] = [];
    for (const row of sample(employeesWithoutService)) {
        issueRows.push({
            category: "Employees without service records",
            risk: "Medium Risk",
            reference: maskEmployeeRef(row.emp_id),
            details: `campus=${cleanNullable(row.campus) || "[blank]"}; department=${cleanNullable(row.department) || "[blank]"}; status=${cleanNullable(row.employment_status) || cleanNullable(row.Active_Status) || "[blank]"}`,
            recommendedAction: "Preview employee import, but flag missing service history for HR review.",
        });
    }
    for (const row of sample(orphanServiceRecords)) {
        issueRows.push({
            category: "Orphan service records",
            risk: "High Risk",
            reference: `${maskEmployeeRef(row.employee_id)} / SR ${cleanNullable(row.sr_id)}`,
            details: `date_from=${cleanNullable(row.date_from) || "[blank]"}; date_to=${cleanNullable(row.date_to) || "[blank]"}; position=${cleanNullable(row.sr_position) || cleanNullable(row.pos_des) || "[blank]"}`,
            recommendedAction: "Do not import until an employee is manually matched or created as a reviewed candidate.",
        });
    }
    for (const [ref, count] of sample(multipleServiceEmployees.sort((a, b) => b[1].length - a[1].length)).map(([ref, rows]) => [ref, rows.length] as const)) {
        issueRows.push({
            category: "Multiple service records per employee",
            risk: "Low Risk",
            reference: maskEmployeeRef(ref),
            details: `${count} service record entries found for this employee reference.`,
            recommendedAction: "Import as chronological history after employee match and date validation.",
        });
    }
    for (const [key, count] of sample(duplicateServiceComposite)) {
        const [employeeRef, dateFrom, dateTo, position, office, status] = key.split("|");
        issueRows.push({
            category: "Duplicate service records",
            risk: "Medium Risk",
            reference: maskEmployeeRef(employeeRef),
            details: `${count} duplicate rows for ${dateFrom || "[blank]"} to ${dateTo || "[blank]"}; ${position || "[blank]"}; ${office || "[blank]"}; ${status || "[blank]"}`,
            recommendedAction: "Deduplicate or confirm intentional repeated records before import.",
        });
    }
    for (const row of sample(dateIssueRows)) {
        issueRows.push({
            category: "Invalid or missing dates",
            risk: "High Risk",
            reference: `${maskEmployeeRef(row.employee_id)} / SR ${cleanNullable(row.sr_id)}`,
            details: `date_from=${cleanNullable(row.date_from) || "[blank]"}; date_to=${cleanNullable(row.date_to) || "[blank]"}`,
            recommendedAction: "Block or queue for manual date correction before import.",
        });
    }

    const employeePreview: EmployeePreviewRow[] = employees.map((row) => {
        const key = normalizeEmployeeRef(row.emp_id);
        const issues = [
            !key,
            !serviceKeys.has(key),
            (employeeKeyCounts.get(key) ?? 0) > 1,
        ].filter(Boolean).length;
        return {
            legacyEmployeeNo: maskEmployeeRef(row.emp_id),
            normalizedEmployeeNo: maskEmployeeRef(key),
            campusRef: cleanNullable(row.campus) || "",
            departmentRef: cleanNullable(row.department) || "",
            positionRef: cleanNullable(row.position) || cleanNullable(row.pos_des) || "",
            employmentStatus: cleanNullable(row.employment_status) || cleanNullable(row.Active_Status) || "",
            classification: cleanNullable(row.classification),
            serviceRecordCount: serviceRefCounts.get(key) ?? 0,
            matchStatus: serviceKeys.has(key) ? "has_service_records" : "no_service_records",
            issueCount: issues,
        };
    });

    const servicePreview: ServicePreviewRow[] = serviceRecords.map((row) => {
        const key = normalizeEmployeeRef(row.employee_id);
        const from = parseLegacyDate(row.date_from);
        const to = parseLegacyDate(row.date_to);
        const issueCount = [
            !employeeKeys.has(key),
            isProblemDate(row.date_from, from, true),
            isProblemDate(row.date_to, to, false),
            Boolean(from && to && to < from),
        ].filter(Boolean).length;
        return {
            legacyServiceRecordId: cleanNullable(row.sr_id),
            legacyEmployeeRef: maskEmployeeRef(row.employee_id),
            normalizedEmployeeRef: maskEmployeeRef(key),
            matchConfidence: employeeKeys.has(key) ? "High" : "Unknown",
            dateFrom: cleanNullable(row.date_from),
            dateTo: cleanNullable(row.date_to),
            position: cleanNullable(row.sr_position) || cleanNullable(row.pos_des),
            office: cleanNullable(row.office),
            appointmentStatus: cleanNullable(row.appointment_status),
            issueCount,
        };
    });

    writeCsv(resolve(CSV_OUT, "legacy-employee-preview.csv"), employeePreview);
    writeCsv(resolve(CSV_OUT, "legacy-service-record-preview.csv"), servicePreview);
    writeCsv(resolve(CSV_OUT, "legacy-mismatch-report.csv"), issueRows);
    writeCsv(resolve(CSV_OUT, "legacy-import-issues.csv"), issueRows);

    const topTables = Object.entries(tables)
        .map(([tableName, info]) => ({ tableName, ...info }))
        .sort((a, b) => b.rowCount - a.rowCount);

    const tableInventory = `# Legacy HRIS Table Inventory\n\nGenerated by \`npm run legacy:mismatch\`. This is read-only output from parsing \`public/hris.sql\` as text.\n\n${table(
        ["Table", "Rows", "Columns"],
        topTables.map((info) => [info.tableName, info.rowCount, info.columns.join(", ")]),
    )}\n`;
    writeFileSync(resolve(DOCS_OUT, "hris-table-inventory.md"), tableInventory, "utf8");

    const summaryRows: Array<Array<string | number>> = [
        ["Total old employee records", employees.length],
        ["Distinct employee refs, exact", exactEmployeeRefs.size],
        ["Distinct employee refs, normalized", employeeKeys.size],
        ["Total old service record entries", serviceRecords.length],
        ["Distinct service employee refs, exact", exactServiceRefs.size],
        ["Distinct service employee refs, normalized", serviceKeys.size],
        ["Employees with at least one service record", employeesWithService.length],
        ["Employees without service records", employeesWithoutService.length],
        ["Service records with matching employee", matchingServiceRecords],
        ["Service records without matching employee", orphanServiceRecords.length],
        ["Distinct orphan service employee refs", orphanServiceRefs.length],
        ["Duplicate employee references", duplicateEmployeeRefs.length],
        ["Duplicate service employee references", duplicateServiceRefs.length],
        ["Duplicate service record composite groups", duplicateServiceComposite.length],
        ["Employees with multiple service records", multipleServiceEmployees.length],
        ["Missing Date From", missingDateFrom],
        ["Missing Date To", missingDateTo],
        ["Invalid/sentinel Date From", invalidDateFrom],
        ["Invalid/sentinel Date To", invalidDateTo],
        ["Date To earlier than Date From", reversedDateRanges],
        ["Employees with overlapping service periods", employeesWithOverlaps],
        ["Overlapping service period pairs", overlapPairCount],
        ["Normalized-only employee/service ref matches", normalizedOnlyMatches],
        ["Loose diagnostic employee/service ref matches", looseOnlyMatches],
    ];

    const mismatchReport = `# HRIS Employee vs Service Record Mismatch Report\n\nGenerated by \`npm run legacy:mismatch\` on ${new Date().toISOString()}.\n\nThis report is non-destructive. The analyzer parsed \`public/hris.sql\` as text and did not execute SQL, connect to Supabase, import data, create migrations, or modify live Prime-HR data. Samples are masked.\n\n## Source\n\n| Item | Value |\n|---|---|\n| SQL dump found | Yes |\n| File | \`public/hris.sql\` |\n| File size | ${fileInfo.size.toLocaleString()} bytes |\n| Primary employee table | \`employee_profile\` |\n| Primary service-record table | \`service_record\` |\n\n## Summary Counts\n\n${table(["Metric", "Count"], summaryRows)}\n\n## Matching Method Used\n\nPrimary match: normalized \`employee_profile.emp_id\` equals normalized \`service_record.employee_id\`. Normalization trims whitespace, preserves leading zeros, standardizes Unicode dash variants to \`-\`, collapses repeated spaces, and compares uppercase text.\n\nDiagnostic loose match: removes spaces and hyphens after primary normalization. This is reported only for review and must not be used for automatic import.\n\nNo reliable name field exists in \`service_record\`, so fallback name + birth date matching cannot be applied directly to service rows without another linkage table. Email and government ID checks are used for duplicate employee risk only.\n\n## Mismatch Categories\n\n${table(
        ["Category", "Count", "Risk", "Recommended Action"],
        [
            ["Employees without service records", employeesWithoutService.length, "Medium Risk", "Import employee candidate only after duplicate review; flag missing service history."],
            ["Orphan service records", orphanServiceRecords.length, "High Risk", "Do not import until HR manually matches or creates an employee candidate."],
            ["Multiple service records per employee", multipleServiceEmployees.length, "Low Risk", "Expected historical ledger behavior; import as chronological entries after validation."],
            ["Duplicate employee refs", duplicateEmployeeRefs.length, "High Risk", "Resolve duplicate employee numbers before import."],
            ["Duplicate employee full names", duplicateEmployeeFullNames.length, "Needs Manual Review", "Review likely duplicate people; do not merge automatically."],
            ["Duplicate employee full name + birth date", duplicateEmployeeFullNameBirth.length, "High Risk", "Block automatic import for affected records until HR review."],
            ["Duplicate contact emails", duplicateEmails.length, "High Risk", "Normalize and resolve email ownership before account linkage."],
            ["Duplicate TIN values", duplicateTin.length, "High Risk", "Resolve masked statutory ID conflicts manually."],
            ["Duplicate GSIS values", duplicateGsis.length, "High Risk", "Resolve masked statutory ID conflicts manually."],
            ["Duplicate service record composites", duplicateServiceComposite.length, "Medium Risk", "Deduplicate exact repeated service periods before import."],
            ["Invalid or missing dates", dateIssueRows.length, "High Risk", "Correct or exclude affected service records before import."],
            ["Employees with overlapping service periods", employeesWithOverlaps, "Needs Manual Review", "Review whether overlaps are valid concurrent appointments or data errors."],
            ["Campus-specific employee gaps", campusGapCounts.size, "Medium Risk", "Review campuses with high counts of employees without service records."],
            ["Office-specific employee gaps", officeGapCounts.size, "Medium Risk", "Review departments/offices with high counts of employees without service records."],
        ],
    )}\n\n## Sample Mismatch Records\n\n${table(["Category", "Risk", "Reference", "Details", "Recommended Action"], issueRows.map((row) => [row.category, row.risk, row.reference, row.details, row.recommendedAction]))}\n\n## Campus/Office Gap Summary\n\n### Employees Without Service Records by Legacy Campus Ref\n\n${table(["Legacy Campus Ref", "Employees Without Service Records"], [...campusGapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20))}\n\n### Employees Without Service Records by Legacy Department Ref\n\n${table(["Legacy Department Ref", "Employees Without Service Records"], [...officeGapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20))}\n\n## Overlap Samples\n\n${table(
        ["Employee Ref", "First Service Record", "Second Service Record"],
        overlapSamples.map((entry) => [
            maskEmployeeRef(entry.employeeRef),
            `SR ${cleanNullable(entry.first.sr_id)}: ${cleanNullable(entry.first.date_from)} to ${cleanNullable(entry.first.date_to) || "[blank]"}`,
            `SR ${cleanNullable(entry.second.sr_id)}: ${cleanNullable(entry.second.date_from)} to ${cleanNullable(entry.second.date_to) || "[blank]"}`,
        ]),
    )}\n\n## Likely Causes\n\n1. \`service_record\` is a movement/history ledger, so multiple rows per employee are expected.\n2. Some \`employee_profile\` rows represent recent, temporary, COS, JO, or incompletely encoded employees that never received service-record history.\n${orphanCauseLine(orphanServiceRecords.length)}\n4. Employee number formatting varies across old tables; normalization helps, but loose matches must be reviewed manually.\n5. Service dates include blanks, sentinel-like values, or overlaps that require HR judgment before import.\n6. Campus and department references may have been encoded inconsistently by unit.\n\n## Import Guidance\n\n- Do not expect one employee row to equal one service record row.\n- Import multiple service records per employee as official service-history entries only after confident employee matching.\n- Do not import orphan service records automatically if any appear in future runs or stricter matching passes.\n- Do not import low-confidence or loose diagnostic matches automatically.\n- Do not overwrite current Prime-HR employee or service-record data automatically.\n- Preserve legacy IDs in internal mapping fields/tables, not as primary UI labels.\n`;
    writeFileSync(resolve(DOCS_OUT, "hris-employee-service-record-mismatch-report.md"), mismatchReport, "utf8");

    const importPlan = `# HRIS Safe Import Implementation Plan\n\nGenerated by \`npm run legacy:mismatch\`. This plan is based on the mismatch analysis and remains non-destructive.\n\n## Import Order\n\n1. Map master data first: legacy \`campus\`, \`departments\`, \`positions\`, \`salary_grade\`, employment classifications, and appointment statuses.\n2. Preview employee master records from \`employee_profile\`, enriched by \`contacts\`, \`address\`, and \`government_id\`.\n3. Import employee master records only after duplicate review and only through an approved future migration path.\n4. Preview \`service_record\` rows and import only high-confidence employee matches first.\n5. Queue orphan, low-confidence, duplicate, overlapping, and date-problem service records for manual review.\n6. Import PDS-related sections only after employee identity is confirmed.\n7. Leave/service credits, payroll, loans, and document/file references should wait until target schemas and file locations are approved.\n\n## Direct Employee Field Candidates\n\n| Legacy Source | Prime-HR Target | Notes |\n|---|---|---|\n| \`employee_profile.emp_id\` | \`employees.employee_no\` | Treat as text and preserve leading zeros. |\n| \`employee_profile.fname/mid_name/lname/name_ext\` | employee name fields | Trim and normalize case. |\n| \`employee_profile.birth_date\` | \`employees.birth_date\` | Mask in reports; validate dates. |\n| \`employee_profile.sex\` | \`employees.sex\` | Normalize values. |\n| \`employee_profile.civil_status\` | \`employees.civil_status\` | Normalize values. |\n| \`contacts.email/mobile\` | \`employees.email/mobile_no\` | Validate and duplicate-check. |\n| \`government_id.tin/gsis/pagibig/philhealth\` | statutory ID fields | Mask in reports and check duplicates. |\n| \`employee_profile.campus/department\` | \`employees.campus_id/office_id\` | Requires master-data mapping to UUIDs. |\n| \`employee_profile.position/pos_des\` | \`employees.position_title\` | Resolve through positions when possible. |\n\n## Direct Service Record Field Candidates\n\n| Legacy Source | Prime-HR Target | Notes |\n|---|---|---|\n| \`service_record.employee_id\` | matched \`employees.id\` | Match through normalized legacy employee number first. |\n| \`service_record.date_from/date_to\` | \`employee_service_records.date_from/date_to\` | Required date validation before import. |\n| \`service_record.sr_position/pos_des\` | \`position_title\` | Position title is required in Prime-HR service records. |\n| \`service_record.appointment_status\` | \`appointment_status\` | Normalize appointment status labels. |\n| \`service_record.category\` | \`employment_type\` | Normalize values. |\n| \`service_record.office\` | \`station_place\` or mapped \`office_id\` | Do not force ambiguous office text into UUIDs. |\n| \`service_record.branch\` | \`branch\` | Direct text mapping. |\n| \`service_record.lv_wpay\` | \`leave_without_pay\` | Direct text mapping after cleanup. |\n| \`service_record.sp_date/sp_cause\` | separation fields | Validate and compare with employee status. |\n| \`service_record.salary\` | \`monthly_salary\` | Parse numeric; flag malformed salary text. |\n\n## Staging and Preview\n\n- Keep CSV previews under \`scripts/output/\`; this folder is gitignored.\n- Keep safe generated markdown summaries under \`docs/generated/\`.\n- Use existing migration tracking tables later: \`migration_batches\` and \`legacy_record_map\`.\n- Add normalized staging tables only in a future migration after HR approves the preview workflow.\n\n## Rollback and Safety\n\n- Every future import must use a batch ID.\n- Store source table and source row ID for every imported row.\n- Import only high-confidence matches first.\n- Do not overwrite current Prime-HR data automatically.\n- Do not delete current data.\n- Keep all rejected, orphaned, duplicate, and date-problem rows in an issue report.\n- Make rollback possible by deleting or archiving rows associated with a specific import batch.\n\n## Next Step\n\nReview \`docs/generated/hris-employee-service-record-mismatch-report.md\` with HR before implementing any database import command.\n`;
    writeFileSync(resolve(DOCS_OUT, "hris-import-plan.md"), importPlan, "utf8");

    log.ok(`employee rows: ${employees.length}`);
    log.ok(`service record rows: ${serviceRecords.length}`);
    log.ok(`employees without service records: ${employeesWithoutService.length}`);
    log.ok(`orphan service records: ${orphanServiceRecords.length}`);
    log.ok(`wrote reports to ${DOCS_OUT}`);
    log.ok(`wrote masked CSV previews to ${CSV_OUT}`);
}

try {
    main();
} catch (error) {
    log.error((error as Error).message);
    process.exitCode = 1;
}