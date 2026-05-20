/**
 * Employee migrator.
 *
 * Source: legacy_staging_employee_profile
 * Target: public.employees + public.employee_pds_profiles + public.employee_personal_information
 *
 * Uses bulk inserts (500-row chunks) to minimise HTTP round-trips against remote Supabase.
 */
import {
    cleanString,
    parseLegacyDate,
    normalizeSex,
    normalizeMobile,
} from "../transformers";
import {
    fetchStagingRows,
    type MigratorContext,
    type MigratorResult,
    type EmployeeRef,
    type EmployeeRefMap,
} from "./_shared";
import type { LegacyIssue } from "../types";

type P = Record<string, unknown>;

const CHUNK = 500;

function normalizeLegacyEmployeeRef(value: unknown): string | null {
    const cleaned = cleanString(value);
    if (!cleaned) return null;
    return cleaned
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function addRefMapping(refMap: EmployeeRefMap, legacyEmployeeNo: string, ref: EmployeeRef) {
    refMap.set(legacyEmployeeNo, ref);
    const normalized = normalizeLegacyEmployeeRef(legacyEmployeeNo);
    if (normalized && normalized !== legacyEmployeeNo) {
        refMap.set(normalized, ref);
    }
}

async function bulkInsert<TInsert extends object, TReturn extends object = TInsert>(
    client: MigratorContext["client"],
    table: string,
    rows: TInsert[],
    select?: string,
): Promise<TReturn[]> {
    const results: TReturn[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const q = client.from(table).insert(chunk);
        const { data } = select ? await q.select(select) : await q;
        if (data) results.push(...(data as unknown as TReturn[]));
    }
    return results;
}

function buildAddressJson(p: P, prefix: "perm" | "res"): Record<string, string | null> {
    const pfx = prefix === "perm" ? "perm_" : "res_";
    return {
        house_no: cleanString(p[`${pfx}house_no`] ?? p["house_no"]),
        street: cleanString(p[`${pfx}street`] ?? p["street"]),
        barangay: cleanString(p[`${pfx}barangay`] ?? p["barangay"]),
        city_municipality: cleanString(p[`${pfx}city`] ?? p[`${pfx}municipality`] ?? p["city"]),
        province: cleanString(p[`${pfx}province`] ?? p["province"]),
        zip_code: cleanString(p[`${pfx}zip`] ?? p["zip_code"]),
        country: cleanString(p[`${pfx}country`]) ?? "Philippines",
    };
}

export async function migrateEmployees(
    ctx: MigratorContext,
    defaultCampusId: string,
    defaultOfficeId: string | null,
): Promise<{ result: MigratorResult; refMap: EmployeeRefMap }> {
    const refMap: EmployeeRefMap = new Map<string, EmployeeRef>();
    const allIssues: LegacyIssue[] = [];
    let inserted = 0;
    let skipped = 0;

    // ── Build legacy campus → public campus UUID lookup ────────────────────
    // The legacy employee_profile.campus column stores the legacy campus_id (numeric string).
    // The legacy campus table was not staged (no campus.ndjson), so we use a hardcoded
    // name map derived from the hris.sql dump, then match against public.campuses by name.
    const LEGACY_CAMPUS_NAMES: Record<string, string> = {
        "1": "Andrews",
        "2": "Aparri",
        "3": "Carig",
        "4": "Gonzaga",
        "5": "Lallo",   // public table has "Lal-lo" — substring match handles this
        "6": "Lasam",
        "7": "Piat",
        "8": "Sanchez Mira",
        "9": "Solana",
        "10": "Central",
    };

    const legacyCampusIdToPublicId = new Map<string, string>();
    try {
        const { data: publicCampuses } = await ctx.client
            .from("campuses")
            .select("id, name")
            .is("deleted_at", null);

        if (publicCampuses) {
            // Build public campus name → UUID map (lowercase key)
            const publicByName = new Map<string, string>();
            for (const c of publicCampuses as Array<{ id: string; name: string }>) {
                publicByName.set(c.name.toLowerCase().trim(), c.id);
            }

            for (const [legacyId, legacyName] of Object.entries(LEGACY_CAMPUS_NAMES)) {
                // Exact match first
                let publicId = publicByName.get(legacyName.toLowerCase());

                // Substring match fallback (e.g. "Lallo" ↔ "Lal-lo")
                if (!publicId) {
                    const lowerName = legacyName.toLowerCase();
                    for (const [pubName, pubId] of publicByName) {
                        if (lowerName.includes(pubName) || pubName.includes(lowerName)) {
                            publicId = pubId;
                            break;
                        }
                    }
                }

                if (publicId) {
                    legacyCampusIdToPublicId.set(legacyId, publicId);
                }
            }
        }
    } catch {
        // Non-fatal — if lookup fails, all employees fall back to defaultCampusId
    }

    const resolveCampusId = (p: P): string => {
        const raw = String(p.campus ?? "").trim();
        return legacyCampusIdToPublicId.get(raw) ?? defaultCampusId;
    };
    // ──────────────────────────────────────────────────────────────────────

    // ── Bulk pre-fetch existing employees ─────────────────────────────────
    const existingMap = new Map<string, { id: string; campus_id: string; office_id: string | null }>();
    const existingNormalizedMap = new Map<string, { id: string; campus_id: string; office_id: string | null }>();
    let pageFrom = 0;
    while (true) {
        const { data: page } = await ctx.client
            .from("employees")
            .select("id, employee_no, campus_id, office_id")
            .is("deleted_at", null)
            .range(pageFrom, pageFrom + CHUNK - 1);
        if (!page || page.length === 0) break;
        for (const row of page) {
            const scope = {
                id: row.id as string,
                campus_id: row.campus_id as string,
                office_id: row.office_id as string | null,
            };
            const employeeNo = row.employee_no as string;
            existingMap.set(employeeNo, scope);
            const normalizedEmployeeNo = normalizeLegacyEmployeeRef(employeeNo);
            if (normalizedEmployeeNo) {
                existingNormalizedMap.set(normalizedEmployeeNo, scope);
            }
        }
        if (page.length < CHUNK) break;
        pageFrom += CHUNK;
    }
    // ──────────────────────────────────────────────────────────────────────

    // ── Collect staging rows ──────────────────────────────────────────────
    type StagingEntry = { _legacy_id: string; employeeNo: string; p: P };
    const newRows: StagingEntry[] = [];

    for await (const { _legacy_id, payload: p } of fetchStagingRows(ctx.client, "employee_profile", ctx.batchId)) {
        const employeeNo =
            cleanString(p.emp_id) ?? cleanString(p.csu_id) ?? cleanString(p.employee_id) ?? cleanString(p.employee_code) ?? `LEGACY-${_legacy_id}`;

        const normalizedEmployeeNo = normalizeLegacyEmployeeRef(employeeNo);

        const existing = existingMap.get(employeeNo) ?? (normalizedEmployeeNo ? existingNormalizedMap.get(normalizedEmployeeNo) : undefined);
        if (existing) {
            addRefMapping(refMap, employeeNo, {
                employeeId: existing.id,
                pdsProfileId: "",
                campusId: existing.campus_id ?? defaultCampusId,
                officeId: existing.office_id ?? defaultOfficeId,
            });
            skipped++;
            continue;
        }

        if (ctx.dryRun) {
            addRefMapping(refMap, employeeNo, {
                employeeId: `dry-${employeeNo}`,
                pdsProfileId: `dry-pds-${employeeNo}`,
                campusId: resolveCampusId(p),
                officeId: defaultOfficeId,
            });
            inserted++;
            continue;
        }

        newRows.push({ _legacy_id, employeeNo, p });
    }

    if (ctx.dryRun) {
        return { result: { inserted, skipped, issues: allIssues }, refMap };
    }

    // ── Bulk insert employees ─────────────────────────────────────────────
    const employeeRows = newRows.map(({ employeeNo, p }) => ({
        employee_no: employeeNo,
        first_name: cleanString(p.fname ?? p.first_name) ?? "UNKNOWN",
        middle_name: cleanString(p.mid_name ?? p.middle_name),
        last_name: cleanString(p.lname ?? p.last_name) ?? "UNKNOWN",
        suffix: cleanString(p.name_ext ?? p.suffix ?? p.name_extension),
        birth_date: parseLegacyDate(p.birth_date),
        sex: normalizeSex(p.sex),
        email: cleanString(p.email),
        mobile_no: normalizeMobile(p.mobile_no ?? p.mobile ?? p.contact_number),
        campus_id: resolveCampusId(p),
        office_id: defaultOfficeId,
        position_title: cleanString(p.pos_des ?? p.position_title ?? p.position),
        employment_status: "active",
        civil_status: cleanString(p.civil_status),
        external_ref: employeeNo,
    }));

    const insertedEmps = await bulkInsert<P, { id: string; employee_no: string }>(
        ctx.client, "employees", employeeRows, "id, employee_no"
    );
    const empNoToId = new Map(insertedEmps.map((r) => [r.employee_no, r.id]));
    inserted = insertedEmps.length;

    // ── Bulk insert pds_profiles ──────────────────────────────────────────
    const now = new Date().toISOString();
    const profileRows = newRows
        .filter(({ employeeNo }) => empNoToId.has(employeeNo))
        .map(({ employeeNo, p }) => ({
            employee_id: empNoToId.get(employeeNo)!,
            campus_id: resolveCampusId(p),
            office_id: defaultOfficeId,
            status: "draft",
            source: "legacy_migration",
            legacy_employee_code: employeeNo,
            migrated_at: now,
            migration_batch_id: ctx.batchId,
        }));

    const insertedProfiles = await bulkInsert<P, { id: string; employee_id: string }>(
        ctx.client, "employee_pds_profiles", profileRows, "id, employee_id"
    );
    const empIdToProfileId = new Map(insertedProfiles.map((r) => [r.employee_id, r.id]));

    // ── Bulk insert personal_information ──────────────────────────────────
    const piRows = newRows
        .map(({ employeeNo, p }) => {
            const empId = empNoToId.get(employeeNo);
            const pdsId = empId ? empIdToProfileId.get(empId) : undefined;
            if (!empId || !pdsId) return null;
            return {
                pds_profile_id: pdsId,
                employee_id: empId,
                campus_id: resolveCampusId(p),
                office_id: defaultOfficeId,
                surname: cleanString(p.lname ?? p.last_name),
                first_name: cleanString(p.fname ?? p.first_name),
                middle_name: cleanString(p.mid_name ?? p.middle_name),
                name_extension: cleanString(p.name_ext ?? p.suffix ?? p.name_extension),
                birth_date: parseLegacyDate(p.birth_date),
                birth_place: cleanString(p.birth_place),
                sex_at_birth: normalizeSex(p.sex),
                civil_status: cleanString(p.civil_status),
                agency_employee_no: employeeNo,
                mobile_no: normalizeMobile(p.mobile_no ?? p.mobile ?? p.contact_number),
                email: cleanString(p.email),
                residential_address: buildAddressJson(p, "res"),
                permanent_address: buildAddressJson(p, "perm"),
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    await bulkInsert(ctx.client, "employee_personal_information", piRows);

    // ── Bulk insert legacy_record_map ─────────────────────────────────────
    const recordMapRows: object[] = [];
    for (const { _legacy_id, employeeNo, p } of newRows) {
        const empId = empNoToId.get(employeeNo);
        const pdsId = empId ? empIdToProfileId.get(empId) : undefined;
        if (!empId) continue;
        addRefMapping(refMap, employeeNo, {
            employeeId: empId,
            pdsProfileId: pdsId ?? "",
            campusId: resolveCampusId(p),
            officeId: defaultOfficeId,
        });
        recordMapRows.push(
            { batch_id: ctx.batchId, legacy_table: "employee_profile", legacy_id: _legacy_id, target_table: "employees", target_id: empId, action: "inserted", warnings: [] },
        );
        if (pdsId) {
            recordMapRows.push(
                { batch_id: ctx.batchId, legacy_table: "employee_profile", legacy_id: _legacy_id, target_table: "employee_pds_profiles", target_id: pdsId, action: "inserted", warnings: [] },
            );
        }
    }
    await bulkInsert(ctx.client, "legacy_record_map", recordMapRows);

    return { result: { inserted, skipped, issues: allIssues }, refMap };
}

