/**
 * legacy:dump — read public/hris.sql and emit one NDJSON file per legacy table.
 *
 * Each NDJSON line is a JSON object keyed by legacy column names. The output
 * sits in scripts/migration/legacy-hris/out/<table>.ndjson and is gitignored.
 *
 * This is intentionally separate from load-staging.ts so the loader can
 * resume / chunk independently. Output files are tiny compared to the dump
 * because they exclude SQL syntax.
 */
import {
    mkdirSync,
    writeFileSync,
    openSync,
    writeSync,
    closeSync,
} from "node:fs";
import { resolve } from "node:path";
import { parseMysqlDumpFile } from "./_shared/sql-parser";
import { createLogger } from "./_shared/logger";

const log = createLogger("dump-ndjson");

const SOURCE = resolve(process.cwd(), "public", "hris.sql");
const OUT_DIR = resolve(process.cwd(), "scripts", "migration", "legacy-hris", "out");

/** Whitelist of tables we actually want to migrate. */
const WHITELIST = new Set([
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
]);

function main() {
    mkdirSync(OUT_DIR, { recursive: true });
    log.info(`reading ${SOURCE}`);

    const handles = new Map<string, number>();
    const counts = new Map<string, number>();

    function getHandle(table: string): number {
        let fd = handles.get(table);
        if (fd === undefined) {
            const out = resolve(OUT_DIR, `${table}.ndjson`);
            fd = openSync(out, "w");
            handles.set(table, fd);
            log.info(`writing ${out}`);
        }
        return fd;
    }

    parseMysqlDumpFile(SOURCE, {
        onRow({ table, columns, row }) {
            if (!WHITELIST.has(table)) return;
            const obj: Record<string, string | number | null> = {};
            for (let i = 0; i < columns.length; i++) {
                obj[columns[i]] = row[i] ?? null;
            }
            const fd = getHandle(table);
            writeSync(fd, JSON.stringify(obj) + "\n");
            counts.set(table, (counts.get(table) ?? 0) + 1);
        },
    });

    for (const fd of handles.values()) closeSync(fd);

    const summary = Object.fromEntries(counts.entries());
    writeFileSync(
        resolve(OUT_DIR, "_summary.json"),
        JSON.stringify(summary, null, 2),
    );

    log.ok(
        `done — ${counts.size} tables emitted, ${[...counts.values()].reduce(
            (a, b) => a + b,
            0,
        )} rows`,
    );
    for (const [t, c] of counts) log.ok(`  ${t.padEnd(24)} ${c}`);
}

try {
    main();
} catch (err) {
    log.error((err as Error).message);
    process.exitCode = 1;
}
