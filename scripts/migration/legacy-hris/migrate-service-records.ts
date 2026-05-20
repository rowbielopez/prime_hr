/**
 * legacy:migrate:service-records
 *
 * Backfills official HR service records from legacy staging into
 * public.employee_service_records only.
 *
 * Why this exists:
 * - legacy:migrate currently loads service_record into PDS work experience
 *   (employee_work_experiences), but the Service Record feature reads from
 *   employee_service_records.
 * - Re-running legacy:migrate --apply would also duplicate other PDS sections.
 *
 * Usage:
 *   npm run legacy:migrate:service-records -- --batch <uuid>        # dry-run
 *   npm run legacy:migrate:service-records -- --batch <uuid> --apply
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminClient } from "./_shared/admin-client";
import { createLogger } from "./_shared/logger";
import { cleanString, parseLegacyDate } from "../../../src/features/migration/legacy-hris/transformers";

type ServicePayload = Record<string, unknown>;

type EmployeeRef = {
    employeeId: string;
    campusId: string;
    officeId: string | null;
};

type ServiceRecordInsert = {
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
};

type CandidateRecord = {
    legacyId: string;
    row: ServiceRecordInsert;
    legacyOpenEnded: boolean;
};

type Summary = {
    batchId: string;
    dryRun: boolean;
    scanned: number;
    queued: number;
    inserted: number;
    skippedAlreadyMapped: number;
    skippedNoEmployeeMatch: number;
    skippedMissingPosition: number;
    skippedInvalidDateFrom: number;
    skippedDuplicateComposite: number;
    markedCurrent: number;
    failedInserts: number;
};

const CHUNK = 500;
const REPORTS_DIR = resolve(process.cwd(), "scripts", "migration", "legacy-hris", "reports");
const log = createLogger("migrate-service-records");

function parseArgs() {
    const args = process.argv.slice(2);
    const idx = args.indexOf("--batch");
    const batchId = idx !== -1 ? args[idx + 1] : (args.find((a) => !a.startsWith("-")) ?? null);
    if (!batchId) {
        throw new Error("Usage: legacy:migrate:service-records -- --batch <uuid> [--apply]");
    }
    return {
        batchId,
        dryRun: !args.includes("--apply"),
    };
}

function normalizeLegacyEmployeeRef(value: unknown): string | null {
    const cleaned = cleanString(value);
    if (!cleaned) return null;
    return cleaned
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function parseMoney(value: unknown): number | null {
    const cleaned = cleanString(value);
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    if (parsed > 9999999999.99) return null;
    return parsed;
}

function normText(value: string | null): string {
    return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function compositeKey(row: ServiceRecordInsert): string {
    return [
        row.employee_id,
        row.date_from,
        row.date_to ?? "",
        normText(row.position_title),
        normText(row.appointment_status),
        normText(row.employment_type),
        normText(row.station_place),
        normText(row.branch),
        row.monthly_salary === null ? "" : row.monthly_salary.toFixed(2),
        normText(row.salary_grade_step),
        normText(row.movement_type),
        row.separation_date ?? "",
        normText(row.separation_cause),
        normText(row.leave_without_pay),
    ].join("|");
}

async function* fetchStagingServiceRows(client: ReturnType<typeof getAdminClient>, batchId: string) {
    let from = 0;
    while (true) {
        const { data, error } = await client
            .from("legacy_staging_service_record")
            .select("_legacy_id, payload")
            .eq("_batch_id", batchId)
            .range(from, from + CHUNK - 1);

        if (error) throw new Error(`fetch legacy_staging_service_record: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const row of data as Array<{ _legacy_id: string; payload: ServicePayload }>) {
            yield row;
        }
        if (data.length < CHUNK) break;
        from += CHUNK;
    }
}

async function loadEmployeeRefMap(client: ReturnType<typeof getAdminClient>) {
    const byRaw = new Map<string, EmployeeRef>();
    const byNormalized = new Map<string, EmployeeRef>();
    let from = 0;

    while (true) {
        const { data, error } = await client
            .from("employees")
            .select("id, employee_no, campus_id, office_id")
            .is("deleted_at", null)
            .range(from, from + CHUNK - 1);

        if (error) throw new Error(`fetch employees: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const row of data as Array<{ id: string; employee_no: string; campus_id: string; office_id: string | null }>) {
            const employeeNo = cleanString(row.employee_no);
            if (!employeeNo) continue;

            const ref: EmployeeRef = {
                employeeId: row.id,
                campusId: row.campus_id,
                officeId: row.office_id,
            };
            byRaw.set(employeeNo, ref);

            const normalized = normalizeLegacyEmployeeRef(employeeNo);
            if (normalized) byNormalized.set(normalized, ref);
        }

        if (data.length < CHUNK) break;
        from += CHUNK;
    }

    return { byRaw, byNormalized };
}

async function loadAlreadyMappedLegacyIds(client: ReturnType<typeof getAdminClient>) {
    const mapped = new Set<string>();
    let from = 0;

    while (true) {
        const { data, error } = await client
            .from("legacy_record_map")
            .select("legacy_id")
            .eq("legacy_table", "service_record")
            .eq("target_table", "employee_service_records")
            .range(from, from + CHUNK - 1);

        if (error) throw new Error(`fetch legacy_record_map: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const row of data as Array<{ legacy_id: string }>) {
            mapped.add(row.legacy_id);
        }

        if (data.length < CHUNK) break;
        from += CHUNK;
    }

    return mapped;
}

async function loadExistingCompositeKeys(client: ReturnType<typeof getAdminClient>) {
    const keys = new Set<string>();
    let from = 0;

    while (true) {
        const { data, error } = await client
            .from("employee_service_records")
            .select("employee_id, date_from, date_to, position_title, appointment_status, employment_type, station_place, branch, monthly_salary, salary_grade_step, movement_type, separation_date, separation_cause, leave_without_pay")
            .is("deleted_at", null)
            .range(from, from + CHUNK - 1);

        if (error) throw new Error(`fetch employee_service_records: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const row of data as Array<ServiceRecordInsert>) {
            keys.add(compositeKey(row));
        }

        if (data.length < CHUNK) break;
        from += CHUNK;
    }

    return keys;
}

function resolveEmployeeRef(
    payload: ServicePayload,
    byRaw: Map<string, EmployeeRef>,
    byNormalized: Map<string, EmployeeRef>,
) {
    const rawKey = cleanString(payload.employee_id) ?? cleanString(payload.employee_code);
    if (!rawKey) return null;
    const normalizedKey = normalizeLegacyEmployeeRef(rawKey);
    return byRaw.get(rawKey) ?? (normalizedKey ? byNormalized.get(normalizedKey) : null) ?? null;
}

async function main() {
    const { batchId, dryRun } = parseArgs();
    const client = getAdminClient();

    const { data: batch, error: batchError } = await client
        .from("migration_batches")
        .select("id, status, summary")
        .eq("id", batchId)
        .single();
    if (batchError || !batch) throw new Error(`Batch ${batchId} not found.`);

    if (dryRun) {
        log.warn("DRY-RUN mode — no writes to employee_service_records.");
    } else {
        log.ok("APPLY mode — writing to employee_service_records.");
    }

    const { byRaw, byNormalized } = await loadEmployeeRefMap(client);
    const alreadyMappedLegacyIds = await loadAlreadyMappedLegacyIds(client);
    const existingComposites = await loadExistingCompositeKeys(client);

    const candidates: CandidateRecord[] = [];
    const summary: Summary = {
        batchId,
        dryRun,
        scanned: 0,
        queued: 0,
        inserted: 0,
        skippedAlreadyMapped: 0,
        skippedNoEmployeeMatch: 0,
        skippedMissingPosition: 0,
        skippedInvalidDateFrom: 0,
        skippedDuplicateComposite: 0,
        markedCurrent: 0,
        failedInserts: 0,
    };

    for await (const { _legacy_id: legacyId, payload } of fetchStagingServiceRows(client, batchId)) {
        summary.scanned++;

        if (alreadyMappedLegacyIds.has(legacyId)) {
            summary.skippedAlreadyMapped++;
            continue;
        }

        const ref = resolveEmployeeRef(payload, byRaw, byNormalized);
        if (!ref) {
            summary.skippedNoEmployeeMatch++;
            continue;
        }

        const positionTitle = cleanString(payload.sr_position) ?? cleanString(payload.pos_des ?? payload.position ?? payload.position_title ?? payload.designation);
        if (!positionTitle) {
            summary.skippedMissingPosition++;
            continue;
        }

        const dateFrom = parseLegacyDate(payload.date_from ?? payload.from_date);
        if (!dateFrom) {
            summary.skippedInvalidDateFrom++;
            continue;
        }

        const rawDateTo = cleanString(payload.date_to ?? payload.to_date ?? payload.to);
        let dateTo = parseLegacyDate(payload.date_to ?? payload.to_date ?? payload.to);
        if (dateTo && dateTo < dateFrom) dateTo = null;

        let separationDate = parseLegacyDate(payload.separation_date);
        if (separationDate && separationDate < dateFrom) separationDate = null;

        const row: ServiceRecordInsert = {
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            date_from: dateFrom,
            date_to: dateTo,
            is_current: false,
            position_title: positionTitle,
            appointment_status: cleanString(payload.appointment_status ?? payload.status),
            employment_type: cleanString(payload.category ?? payload.employment_type),
            station_place: cleanString(payload.station_place ?? payload.station ?? payload.place ?? payload.office),
            branch: cleanString(payload.branch ?? payload.organization),
            monthly_salary: parseMoney(payload.monthly_salary ?? payload.salary),
            salary_grade_step: cleanString(payload.salary_grade ?? payload.sg_step),
            movement_type: cleanString(payload.movement_type ?? payload.nature_of_movement),
            separation_date: separationDate,
            separation_cause: cleanString(payload.separation_cause),
            leave_without_pay: cleanString(payload.leave_without_pay),
            remarks: cleanString(payload.remarks),
        };

        const key = compositeKey(row);
        if (existingComposites.has(key)) {
            summary.skippedDuplicateComposite++;
            continue;
        }
        existingComposites.add(key);

        candidates.push({
            legacyId,
            row,
            legacyOpenEnded: !rawDateTo,
        });
    }

    const latestCurrentIndexByEmployee = new Map<string, number>();
    candidates.forEach((candidate, index) => {
        if (!candidate.legacyOpenEnded || candidate.row.date_to !== null) return;
        const existingIndex = latestCurrentIndexByEmployee.get(candidate.row.employee_id);
        if (
            existingIndex === undefined
            || candidate.row.date_from > candidates[existingIndex].row.date_from
        ) {
            latestCurrentIndexByEmployee.set(candidate.row.employee_id, index);
        }
    });
    for (const index of latestCurrentIndexByEmployee.values()) {
        candidates[index].row.is_current = true;
        summary.markedCurrent++;
    }

    summary.queued = candidates.length;

    if (!dryRun) {
        for (let i = 0; i < candidates.length; i += CHUNK) {
            const chunk = candidates.slice(i, i + CHUNK);
            const rows = chunk.map((item) => item.row);

            const { error } = await client.from("employee_service_records").insert(rows);
            if (error) {
                log.warn(`insert chunk ${i}-${i + chunk.length - 1} failed (${error.message}); retrying row-by-row.`);

                const fallbackMapRows: Array<{
                    batch_id: string;
                    legacy_table: string;
                    legacy_id: string;
                    target_table: string;
                    target_id: null;
                    action: string;
                    warnings: never[];
                }> = [];

                for (const item of chunk) {
                    const { error: rowError } = await client.from("employee_service_records").insert(item.row);
                    if (rowError) {
                        summary.failedInserts += 1;
                        log.warn(`row ${item.legacyId} skipped: ${rowError.message}`);
                        continue;
                    }

                    summary.inserted += 1;
                    fallbackMapRows.push({
                        batch_id: batchId,
                        legacy_table: "service_record",
                        legacy_id: item.legacyId,
                        target_table: "employee_service_records",
                        target_id: null,
                        action: "inserted",
                        warnings: [],
                    });
                }

                if (fallbackMapRows.length > 0) {
                    const { error: mapError } = await client
                        .from("legacy_record_map")
                        .upsert(fallbackMapRows, { onConflict: "legacy_table,legacy_id,target_table", ignoreDuplicates: true });
                    if (mapError) {
                        log.warn(`legacy_record_map upsert warning: ${mapError.message}`);
                    }
                }

                continue;
            }

            summary.inserted += chunk.length;

            const mapRows = chunk.map((item) => ({
                batch_id: batchId,
                legacy_table: "service_record",
                legacy_id: item.legacyId,
                target_table: "employee_service_records",
                target_id: null,
                action: "inserted",
                warnings: [],
            }));

            const { error: mapError } = await client
                .from("legacy_record_map")
                .upsert(mapRows, { onConflict: "legacy_table,legacy_id,target_table", ignoreDuplicates: true });
            if (mapError) {
                log.warn(`legacy_record_map upsert warning: ${mapError.message}`);
            }
        }

        const currentSummary = ((batch as { summary?: unknown }).summary ?? {}) as Record<string, unknown>;
        await client
            .from("migration_batches")
            .update({
                summary: {
                    ...currentSummary,
                    official_service_records_backfill: {
                        queued: summary.queued,
                        inserted: summary.inserted,
                        skippedAlreadyMapped: summary.skippedAlreadyMapped,
                        skippedNoEmployeeMatch: summary.skippedNoEmployeeMatch,
                        skippedMissingPosition: summary.skippedMissingPosition,
                        skippedInvalidDateFrom: summary.skippedInvalidDateFrom,
                        skippedDuplicateComposite: summary.skippedDuplicateComposite,
                        markedCurrent: summary.markedCurrent,
                        failedInserts: summary.failedInserts,
                        appliedAt: new Date().toISOString(),
                    },
                },
            })
            .eq("id", batchId);
    }

    mkdirSync(REPORTS_DIR, { recursive: true });
    const mode = dryRun ? "dry" : "apply";
    const reportPath = resolve(REPORTS_DIR, `migrate-service-records-${mode}-${batchId}.json`);
    writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2));

    log.ok(`wrote ${reportPath}`);
    console.log("\n─── Official Service Record Backfill Summary ─────────");
    console.log(`  scanned=${summary.scanned}`);
    console.log(`  queued=${summary.queued}`);
    console.log(`  inserted=${summary.inserted}`);
    console.log(`  skipped_already_mapped=${summary.skippedAlreadyMapped}`);
    console.log(`  skipped_no_employee_match=${summary.skippedNoEmployeeMatch}`);
    console.log(`  skipped_missing_position=${summary.skippedMissingPosition}`);
    console.log(`  skipped_invalid_date_from=${summary.skippedInvalidDateFrom}`);
    console.log(`  skipped_duplicate_composite=${summary.skippedDuplicateComposite}`);
    console.log(`  marked_current=${summary.markedCurrent}`);
    console.log(`  failed_inserts=${summary.failedInserts}`);
    if (dryRun) {
        console.log("\n[dry-run] No database writes were applied.");
    }
}

main().catch((err) => {
    log.error((err as Error).message);
    process.exitCode = 1;
});
