/**
 * legacy:analyze — produce a quick inventory of the legacy dump.
 *
 * Output: scripts/migration/legacy-hris/reports/
 *   - schema.json     { [tableName]: { columns: string[], rowCount: number } }
 *   - row-counts.json [{ table, count }] sorted desc
 *
 * Read-only. Does not touch the database.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMysqlDumpFile } from "./_shared/sql-parser";
import { createLogger } from "./_shared/logger";

const log = createLogger("analyze");

const SOURCE = resolve(process.cwd(), "public", "hris.sql");
const OUT_DIR = resolve(process.cwd(), "scripts", "migration", "legacy-hris", "reports");

interface TableInfo {
    columns: string[];
    rowCount: number;
}

function main() {
    log.info(`reading ${SOURCE}`);
    const tables: Record<string, TableInfo> = {};
    let totalRows = 0;

    parseMysqlDumpFile(SOURCE, {
        onTableSeen(table, columns) {
            if (!tables[table]) {
                tables[table] = { columns, rowCount: 0 };
                log.debug(`table seen: ${table} (${columns.length} cols)`);
            }
        },
        onRow({ table }) {
            const info = tables[table];
            if (info) info.rowCount++;
            totalRows++;
        },
    });

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(resolve(OUT_DIR, "schema.json"), JSON.stringify(tables, null, 2));

    const counts = Object.entries(tables)
        .map(([table, info]) => ({ table, count: info.rowCount }))
        .sort((a, b) => b.count - a.count);
    writeFileSync(resolve(OUT_DIR, "row-counts.json"), JSON.stringify(counts, null, 2));

    log.ok(`parsed ${Object.keys(tables).length} tables, ${totalRows} rows total`);
    log.ok(`wrote ${OUT_DIR}/schema.json and row-counts.json`);

    // Pretty-print top 20 tables to stdout
    console.log("\nTop tables by row count:");
    for (const { table, count } of counts.slice(0, 20)) {
        console.log(`  ${count.toString().padStart(8)}  ${table}`);
    }
}

try {
    main();
} catch (err) {
    log.error((err as Error).message);
    process.exitCode = 1;
}
