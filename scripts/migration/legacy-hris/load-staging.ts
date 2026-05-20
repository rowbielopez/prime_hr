/**
 * legacy:load — insert NDJSON rows from out/<table>.ndjson into legacy.<table>
 *
 * Usage:
 *   npm run legacy:load                          # creates a new batch, loads all tables
 *   npm run legacy:load -- --tables employee_profile,address
 *   npm run legacy:load -- --batch <uuid>        # resume/retry existing batch
 *
 * Idempotency: the primary key on legacy.<table> is (batch_id, _legacy_id).
 * Re-running with the same batch_id is safe — duplicates are skipped via
 * ON CONFLICT DO NOTHING.
 *
 * Primary key in each legacy table:
 *   employee_profile → id column
 *   all others       → id column
 * (If a table has no `id` column we fall back to the row index.)
 */
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { getAdminClient } from "./_shared/admin-client";
import { createLogger } from "./_shared/logger";
import { LEGACY_TABLES, type LegacyTable } from "../../../src/features/migration/legacy-hris/types";

const log = createLogger("load-staging");

const OUT_DIR = resolve(process.cwd(), "scripts", "migration", "legacy-hris", "out");

const BATCH_SIZE = 500;

// Legacy primary-key column per table (fallback: row index).
const PK_COL: Partial<Record<LegacyTable, string>> = {
    employee_profile: "id",
    address: "id",
    contacts: "id",
    family: "id",
    children: "id",
    educational_bg: "id",
    eligibility: "id",
    service_record: "id",
    government_id: "id",
    skills: "id",
    organizations: "id",
    recognition: "id",
    trainings: "id",
    training_participants: "id",
    training_post: "id",
    users: "id",
    logs_tbl: "id",
};

function parseArgs(): { tables: LegacyTable[]; batchId: string | null } {
    const args = process.argv.slice(2);
    const tablesIdx = args.indexOf("--tables");
    const batchIdx = args.indexOf("--batch");

    const tables: LegacyTable[] =
        tablesIdx !== -1
            ? (args[tablesIdx + 1].split(",") as LegacyTable[])
            : [...LEGACY_TABLES];

    // PowerShell strips --batch; fall back to first positional arg that looks like a UUID
    const batchId = batchIdx !== -1
        ? args[batchIdx + 1]
        : (args.find((a) => !a.startsWith("-") && /^[0-9a-f-]{36}$/i.test(a)) ?? null);
    return { tables, batchId };
}

async function readNdjsonFile(
    path: string,
): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = [];
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed) rows.push(JSON.parse(trimmed) as Record<string, unknown>);
    }
    return rows;
}

async function ensureBatch(
    client: ReturnType<typeof getAdminClient>,
    existingId: string | null,
): Promise<string> {
    if (existingId) {
        // Verify it exists
        const { data, error } = await client
            .from("migration_batches")
            .select("id, status")
            .eq("id", existingId)
            .single();
        if (error || !data) throw new Error(`Batch ${existingId} not found: ${error?.message}`);
        log.info(`resuming batch ${existingId} (status: ${data.status})`);
        return existingId;
    }

    const { data, error } = await client
        .from("migration_batches")
        .insert({ source: "legacy_hris_ndjson", status: "running", dry_run: false, started_at: new Date().toISOString() })
        .select("id")
        .single();
    if (error || !data) throw new Error(`Failed to create batch: ${error?.message}`);
    log.ok(`created batch ${data.id}`);
    return data.id as string;
}

async function loadTable(
    client: ReturnType<typeof getAdminClient>,
    table: LegacyTable,
    batchId: string,
): Promise<{ loaded: number; skipped: number }> {
    const filePath = resolve(OUT_DIR, `${table}.ndjson`);
    log.info(`loading ${table} from ${filePath}`);

    let rows: Array<Record<string, unknown>>;
    try {
        rows = await readNdjsonFile(filePath);
    } catch {
        log.warn(`${table}.ndjson not found — skipping`);
        return { loaded: 0, skipped: 0 };
    }

    const pkCol = PK_COL[table];
    let loaded = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const records = chunk.map((row, idx) => {
            const legacyId =
                pkCol && row[pkCol] !== null && row[pkCol] !== undefined
                    ? String(row[pkCol])
                    : `row_${i + idx}`;
            return { _batch_id: batchId, _legacy_id: legacyId, payload: row };
        });

        const { error, count } = await client
            .from(`legacy_staging_${table}`)
            .upsert(records, { onConflict: "_batch_id,_legacy_id", ignoreDuplicates: true, count: "exact" });

        if (error) {
            log.error(`${table} chunk ${i}–${i + BATCH_SIZE}: ${error.message}`);
            skipped += chunk.length;
        } else {
            loaded += count ?? chunk.length;
        }
    }

    log.ok(`${table.padEnd(24)} loaded ${loaded}, skipped ${skipped}`);
    return { loaded, skipped };
}

async function main() {
    const { tables, batchId: existingBatchId } = parseArgs();
    const client = getAdminClient();

    const batchId = await ensureBatch(client, existingBatchId);

    const summary: Record<string, { loaded: number; skipped: number }> = {};
    for (const table of tables) {
        summary[table] = await loadTable(client, table, batchId);
    }

    const totalLoaded = Object.values(summary).reduce((s, r) => s + r.loaded, 0);
    const totalSkipped = Object.values(summary).reduce((s, r) => s + r.skipped, 0);

    await client
        .from("migration_batches")
        .update({ status: "completed", finished_at: new Date().toISOString(), summary })
        .eq("id", batchId);

    log.ok(`batch ${batchId} complete — ${totalLoaded} loaded, ${totalSkipped} skipped`);
    console.log("\nBatch ID (use with --batch flag):", batchId);
}

main().catch((err) => {
    log.error((err as Error).message);
    process.exitCode = 1;
});
