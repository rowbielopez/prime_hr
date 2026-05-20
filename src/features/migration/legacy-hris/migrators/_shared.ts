/**
 * Shared helpers for domain migrators.
 *
 * A "migrator run" receives:
 *   - a batch_id (rows already in legacy.<table>)
 *   - a map: legacyEmployeeCode → { employeeId, pdsProfileId, campusId, officeId }
 *   - dryRun flag
 *
 * Each migrator writes target rows (when !dryRun), records in legacy_record_map,
 * and appends audit_logs entries (non-blocking).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LegacyIssue, LegacyTable } from "../types";

export interface EmployeeRef {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    officeId: string | null;
}

export type EmployeeRefMap = Map<string, EmployeeRef>; // key = legacy employee_id/code

export interface MigratorContext {
    client: SupabaseClient;
    batchId: string;
    employeeRefMap: EmployeeRefMap;
    dryRun: boolean;
}

export interface MigratorResult {
    inserted: number;
    skipped: number;
    issues: LegacyIssue[];
}

export async function recordMap(
    ctx: MigratorContext,
    legacyTable: LegacyTable,
    legacyId: string,
    targetTable: string,
    targetId: string | null,
    warnings: LegacyIssue[],
) {
    if (ctx.dryRun) return;
    await ctx.client
        .from("legacy_record_map")
        .upsert(
            {
                batch_id: ctx.batchId,
                legacy_table: legacyTable,
                legacy_id: legacyId,
                target_table: targetTable,
                target_id: targetId,
                action: targetId ? "inserted" : "skipped",
                warnings: warnings.map((w) => ({ code: w.code, message: w.message })),
            },
            { onConflict: "legacy_table,legacy_id,target_table", ignoreDuplicates: false },
        );
}

export async function writeAuditEntry(
    client: SupabaseClient,
    entityType: string,
    entityId: string,
    batchId: string,
) {
    // Fire-and-forget; never blocks the migrator.
    void client.from("audit_logs").insert({
        event_type: "legacy_migration",
        action: "insert",
        entity_type: entityType,
        entity_id: entityId,
        metadata: { migration_batch_id: batchId, source: "legacy_hris" },
    });
}

const BATCH_FETCH = 500;

export async function* fetchStagingRows(
    client: SupabaseClient,
    table: LegacyTable,
    batchId: string,
): AsyncGenerator<{ _legacy_id: string; payload: Record<string, unknown> }> {
    let from = 0;
    while (true) {
        const { data, error } = await client
            .from(`legacy_staging_${table}`)
            .select("_legacy_id, payload")
            .eq("_batch_id", batchId)
            .range(from, from + BATCH_FETCH - 1);
        if (error) throw new Error(`fetch legacy_staging_${table}: ${error.message}`);

        if (!data || data.length === 0) break;
        for (const row of data) {
            yield row as { _legacy_id: string; payload: Record<string, unknown> };
        }
        if (data.length < BATCH_FETCH) break;
        from += BATCH_FETCH;
    }
}
