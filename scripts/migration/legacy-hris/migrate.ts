/**
 * legacy:migrate — orchestrates all domain migrators in dependency order.
 *
 * Usage:
 *   npm run legacy:migrate -- --batch <uuid>               # dry-run (safe)
 *   npm run legacy:migrate -- --batch <uuid> --apply       # write to public tables
 *   npm run legacy:migrate -- --batch <uuid> --apply --campus <uuid>
 *
 * Requirements:
 *   --batch  UUID of a completed load batch (from load-staging.ts)
 *   --campus UUID of the target campus (required for new employees)
 *            Defaults to the first campus found in public.campuses if omitted.
 *   --office Optional UUID of the default office for new employees.
 *   --apply  Without this flag the run is always dry-run (no DB writes to public tables).
 *
 * Dry-run output: console summary + scripts/migration/legacy-hris/reports/migrate-dry-<batch>.json
 * Apply output:   same report with actual inserted/skipped counts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminClient } from "./_shared/admin-client";
import { createLogger } from "./_shared/logger";
import { migrateEmployees } from "../../../src/features/migration/legacy-hris/migrators/migrate-employees";
import {
    migrateFamilyBackground,
    migrateChildren,
    migrateEducation,
    migrateEligibilities,
    migrateWorkExperience,
    migrateOfficialServiceRecords,
    migrateLearningDevelopment,
    migrateSkills,
    migrateRecognitions,
    migrateMemberships,
    migrateGovernmentIds,
} from "../../../src/features/migration/legacy-hris/migrators/migrate-pds-sections";

const log = createLogger("migrate");
const REPORTS_DIR = resolve(process.cwd(), "scripts", "migration", "legacy-hris", "reports");

function parseArgs() {
    const args = process.argv.slice(2);
    const get = (flag: string) => {
        const idx = args.indexOf(flag);
        return idx !== -1 ? args[idx + 1] : null;
    };
    // Support both:
    //   npm run legacy:migrate -- --batch <uuid>   (bash)
    //   npm run legacy:migrate -- <uuid>           (PowerShell strips --batch)
    const batchId = get("--batch") ?? (args.find((a) => !a.startsWith("-")) ?? null);
    if (!batchId) throw new Error("Usage: legacy:migrate -- --batch <uuid> [--apply] [--campus <uuid>] [--office <uuid>]");
    return {
        batchId,
        apply: args.includes("--apply"),
        campusId: get("--campus"),
        officeId: get("--office"),
    };
}

async function resolveDefaultCampus(client: ReturnType<typeof getAdminClient>): Promise<string> {
    const { data, error } = await client
        .from("campuses")
        .select("id, name")
        .is("deleted_at", null)
        .order("name")
        .limit(1)
        .single();
    if (error || !data) throw new Error("No campus found. Pass --campus <uuid>.");
    log.info(`defaulting to campus: ${data.name} (${data.id})`);
    return data.id as string;
}

async function main() {
    const { batchId, apply, campusId: argCampusId, officeId } = parseArgs();
    const dryRun = !apply;
    const client = getAdminClient();

    if (dryRun) {
        log.warn("DRY-RUN mode — no writes to public tables. Pass --apply to commit.");
    } else {
        log.ok("APPLY mode — will write to public tables.");
    }

    // Verify batch
    const { data: batch, error: batchErr } = await client
        .from("migration_batches")
        .select("id, status")
        .eq("id", batchId)
        .single();
    if (batchErr || !batch) throw new Error(`Batch ${batchId} not found`);
    log.info(`using batch ${batchId} (status: ${batch.status})`);

    const campusId = argCampusId ?? await resolveDefaultCampus(client);

    const ctx = { client, batchId, employeeRefMap: new Map(), dryRun };

    // Step 1: employees (builds refMap)
    log.info("step 1/10: employees");
    const { result: empResult, refMap } = await migrateEmployees(ctx, campusId, officeId ?? null);
    ctx.employeeRefMap = refMap;
    log.ok(`employees: inserted=${empResult.inserted} skipped=${empResult.skipped} issues=${empResult.issues.length}`);

    // Steps 2+: PDS and official service-record sections
    const steps: Array<{ name: string; fn: typeof migrateFamilyBackground }> = [
        { name: "family_background", fn: migrateFamilyBackground },
        { name: "children", fn: migrateChildren },
        { name: "education", fn: migrateEducation },
        { name: "eligibilities", fn: migrateEligibilities },
        { name: "work_experience", fn: migrateWorkExperience },
        { name: "official_service_records", fn: migrateOfficialServiceRecords },
        { name: "learning_development", fn: migrateLearningDevelopment },
        { name: "skills", fn: migrateSkills },
        { name: "recognitions", fn: migrateRecognitions },
        { name: "memberships", fn: migrateMemberships },
        { name: "government_ids", fn: migrateGovernmentIds },
    ];

    const stepResults: Record<string, { inserted: number; skipped: number }> = {
        employees: { inserted: empResult.inserted, skipped: empResult.skipped },
    };

    for (let i = 0; i < steps.length; i++) {
        const { name, fn } = steps[i];
        log.info(`step ${i + 2}/${steps.length + 1}: ${name}`);
        const result = await fn(ctx, refMap);
        stepResults[name] = { inserted: result.inserted, skipped: result.skipped };
        log.ok(`${name.padEnd(24)}: inserted=${result.inserted} skipped=${result.skipped}`);
    }

    // Update batch status
    if (!dryRun) {
        await client
            .from("migration_batches")
            .update({ status: "completed", finished_at: new Date().toISOString(), summary: { migrate: stepResults } })
            .eq("id", batchId);
    }

    // Write report
    mkdirSync(REPORTS_DIR, { recursive: true });
    const prefix = dryRun ? "migrate-dry" : "migrate-apply";
    const reportPath = resolve(REPORTS_DIR, `${prefix}-${batchId}.json`);
    writeFileSync(reportPath, JSON.stringify({ batchId, dryRun, generatedAt: new Date().toISOString(), campusId, stepResults }, null, 2));
    log.ok(`wrote ${reportPath}`);

    // Summary table
    console.log("\n─── Migration Summary ─────────────────────────────");
    for (const [step, { inserted, skipped }] of Object.entries(stepResults)) {
        console.log(`  ${step.padEnd(26)}  inserted=${inserted}  skipped=${skipped}`);
    }
    if (dryRun) {
        console.log("\n[dry-run] No public tables were modified. Re-run with --apply to commit.");
    }
}

main().catch((err) => {
    log.error((err as Error).message);
    process.exitCode = 1;
});
