/**
 * PDS section migrators — bulk insert edition.
 *
 * All sections collect matching rows into an array then bulk-insert in
 * 500-row chunks, replacing per-row HTTP calls with chunked batch requests.
 *
 * Field names are mapped from actual NDJSON inspection:
 *   children       → child_name
 *   skills         → skill_hobby
 *   recognition    → recog_name
 *   organizations  → org_name
 *   educational_bg → d_from / d_to / yr_grad
 *   eligibility    → type / date_taken / valid_date
 *   service_record → sr_position / pos_des / is_gov
 */
import {
    cleanString,
    parseLegacyDate,
} from "../transformers";
import {
    fetchStagingRows,
    type MigratorContext,
    type MigratorResult,
    type EmployeeRefMap,
} from "./_shared";

type P = Record<string, unknown>;

const CHUNK = 500;

async function bulkInsert(
    client: MigratorContext["client"],
    table: string,
    rows: object[],
): Promise<number> {
    let count = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await client.from(table).insert(rows.slice(i, i + CHUNK));
        if (!error) count += Math.min(CHUNK, rows.length - i);
    }
    return count;
}

function empKey(p: P): string | null {
    return cleanString(p.employee_id) ?? cleanString(p.employee_code) ?? null;
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

function resolveEmployeeRef(refMap: EmployeeRefMap, p: P) {
    const rawKey = empKey(p);
    if (!rawKey) return null;
    const normalizedKey = normalizeLegacyEmployeeRef(rawKey);
    return refMap.get(rawKey) ?? (normalizedKey ? refMap.get(normalizedKey) : null) ?? null;
}

// ── Family background ──────────────────────────────────────────────────────
export async function migrateFamilyBackground(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "family", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        if (!ref) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            spouse_surname: cleanString(p.spouse_last_name ?? p.spouse_surname),
            spouse_first_name: cleanString(p.spouse_first_name),
            spouse_middle_name: cleanString(p.spouse_middle_name),
            spouse_name_extension: cleanString(p.spouse_suffix ?? p.spouse_name_extension),
            spouse_occupation: cleanString(p.spouse_occupation),
            spouse_employer_business_name: cleanString(p.spouse_employer ?? p.spouse_business),
            spouse_business_address: cleanString(p.spouse_business_address),
            spouse_telephone_no: cleanString(p.spouse_telephone ?? p.spouse_contact),
            father_surname: cleanString(p.father_last_name ?? p.father_surname),
            father_first_name: cleanString(p.father_first_name),
            father_middle_name: cleanString(p.father_middle_name),
            father_name_extension: cleanString(p.father_suffix),
            mother_maiden_surname: cleanString(p.mother_last_name ?? p.mother_maiden_surname),
            mother_first_name: cleanString(p.mother_first_name),
            mother_middle_name: cleanString(p.mother_middle_name),
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_family_background", rows);
    return { inserted, skipped, issues: [] };
}

// ── Children ──────────────────────────────────────────────────────────────
export async function migrateChildren(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "children", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        if (!ref) { skipped++; continue; }
        // Actual field: child_name
        const fullName = cleanString(p.child_name ?? p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim());
        if (!fullName) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            full_name: fullName,
            birth_date: parseLegacyDate(p.birth_date),
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_children", rows);
    return { inserted, skipped, issues: [] };
}

// ── Education ─────────────────────────────────────────────────────────────
const EDU_LEVEL_MAP: Record<string, string> = {
    elementary: "Elementary",
    secondary: "Secondary",
    "high school": "Secondary",
    vocational: "Vocational/Trade",
    college: "College",
    "graduate studies": "Graduate Studies",
    masters: "Graduate Studies",
    doctorate: "Graduate Studies",
    phd: "Graduate Studies",
};

function mapEduLevel(raw: unknown): string {
    const s = cleanString(raw)?.toLowerCase() ?? "";
    for (const [k, v] of Object.entries(EDU_LEVEL_MAP)) {
        if (s.includes(k)) return v;
    }
    return cleanString(raw) ?? "College";
}

function parseYear(raw: unknown): number | null {
    const s = cleanString(raw);
    if (!s) return null;
    const n = parseInt(s, 10);
    if (Number.isNaN(n) || n < 1900 || n > 2200) return null;
    return n;
}

export async function migrateEducation(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "educational_bg", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        if (!ref) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            level: mapEduLevel(p.level ?? p.education_level),
            school_name: cleanString(p.school_name ?? p.school),
            degree_course: cleanString(p.degree ?? p.course),
            period_from_year: parseYear(p.d_from ?? p.year_from ?? p.from_year),
            period_to_year: parseYear(p.d_to ?? p.year_to ?? p.to_year),
            year_graduated: parseYear(p.yr_grad ?? p.year_graduated ?? p.grad_year),
            scholarship_honors: cleanString(p.honors ?? p.scholarship),
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_education", rows);
    return { inserted, skipped, issues: [] };
}

// ── Eligibilities ─────────────────────────────────────────────────────────
export async function migrateEligibilities(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "eligibility", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        const name = cleanString(p.type ?? p.eligibility_name ?? p.name ?? p.title);
        if (!ref || !name) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            eligibility_name: name,
            rating: cleanString(p.rating),
            examination_date: parseLegacyDate(p.date_taken ?? p.exam_date ?? p.date_exam),
            examination_place: cleanString(p.exam_place ?? p.place),
            license_number: cleanString(p.license_no ?? p.license_number),
            license_valid_until: parseLegacyDate(p.valid_date ?? p.license_valid ?? p.license_expiry),
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_eligibilities", rows);
    return { inserted, skipped, issues: [] };
}

// ── Work experience (service_record) ──────────────────────────────────────
export async function migrateWorkExperience(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "service_record", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        const posTitle = cleanString(p.sr_position) ?? cleanString(p.pos_des ?? p.position ?? p.position_title ?? p.designation);
        if (!ref || !posTitle) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        const dateFrom = parseLegacyDate(p.date_from ?? p.from_date);
        const dateTo = parseLegacyDate(p.date_to ?? p.to_date ?? p.to);
        const salaryRaw = cleanString(p.monthly_salary ?? p.salary);
        const salary = salaryRaw ? parseFloat(salaryRaw.replace(/[^\d.]/g, "")) : null;
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            date_from: dateFrom,
            date_to: dateTo,
            is_current: !dateTo,
            position_title: posTitle,
            department_agency_office_company: cleanString(p.office ?? p.organization ?? p.department ?? p.agency ?? p.company ?? p.employer),
            monthly_salary: Number.isFinite(salary) && salary !== null && salary >= 0 ? salary : null,
            salary_grade_step: cleanString(p.salary_grade ?? p.sg_step),
            appointment_status: cleanString(p.appointment_status ?? p.status ?? p.employment_type),
            is_government_service: p.is_gov === "Y" || p.is_gov === true ? true : p.is_gov === "N" || p.is_gov === false ? false : null,
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_work_experiences", rows);
    return { inserted, skipped, issues: [] };
}

type OfficialServiceRecordInsert = {
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
    _legacyOpenEnded: boolean;
};

// ── Official service records (service_record -> employee_service_records) ──
export async function migrateOfficialServiceRecords(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: OfficialServiceRecordInsert[] = [];
    let skipped = 0;

    for await (const { payload: p } of fetchStagingRows(ctx.client, "service_record", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        const posTitle = cleanString(p.sr_position) ?? cleanString(p.pos_des ?? p.position ?? p.position_title ?? p.designation);
        const dateFrom = parseLegacyDate(p.date_from ?? p.from_date);
        if (!ref || !posTitle || !dateFrom) {
            skipped++;
            continue;
        }

        const rawDateTo = cleanString(p.date_to ?? p.to_date ?? p.to);
        let dateTo = parseLegacyDate(p.date_to ?? p.to_date ?? p.to);
        if (dateTo && dateTo < dateFrom) {
            dateTo = null;
        }

        const salaryRaw = cleanString(p.monthly_salary ?? p.salary);
        const salary = salaryRaw ? parseFloat(salaryRaw.replace(/[^\d.]/g, "")) : null;

        rows.push({
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            date_from: dateFrom,
            date_to: dateTo,
            is_current: false,
            position_title: posTitle,
            appointment_status: cleanString(p.appointment_status ?? p.status),
            employment_type: cleanString(p.category ?? p.employment_type),
            station_place: cleanString(p.station_place ?? p.station ?? p.place ?? p.office),
            branch: cleanString(p.branch ?? p.organization),
            monthly_salary: Number.isFinite(salary) && salary !== null && salary >= 0 ? salary : null,
            salary_grade_step: cleanString(p.salary_grade ?? p.sg_step),
            movement_type: cleanString(p.movement_type ?? p.nature_of_movement),
            separation_date: parseLegacyDate(p.separation_date),
            separation_cause: cleanString(p.separation_cause),
            leave_without_pay: cleanString(p.leave_without_pay),
            remarks: cleanString(p.remarks),
            _legacyOpenEnded: !rawDateTo,
        });
    }

    const latestCurrentIndexByEmployee = new Map<string, number>();
    rows.forEach((row, index) => {
        if (!row._legacyOpenEnded || row.date_to !== null) return;
        const existingIndex = latestCurrentIndexByEmployee.get(row.employee_id);
        if (existingIndex === undefined || row.date_from > rows[existingIndex].date_from) {
            latestCurrentIndexByEmployee.set(row.employee_id, index);
        }
    });
    for (const index of latestCurrentIndexByEmployee.values()) {
        rows[index].is_current = true;
    }

    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const officialRows = rows.map(({ _legacyOpenEnded, ...row }) => row);
    const inserted = await bulkInsert(ctx.client, "employee_service_records", officialRows);
    return { inserted, skipped, issues: [] };
}

// ── Learning & Development ─────────────────────────────────────────────────
export async function migrateLearningDevelopment(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;

    // Build training details map first
    const trainingDetails = new Map<string, P>();
    for await (const { _legacy_id, payload: p } of fetchStagingRows(ctx.client, "trainings", ctx.batchId)) {
        trainingDetails.set(String(p.id ?? _legacy_id), p);
    }

    for await (const { payload: p } of fetchStagingRows(ctx.client, "training_participants", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        if (!ref) { skipped++; continue; }
        const td = trainingDetails.get(String(p.training_id ?? "")) ?? p;
        const title = cleanString(td.title ?? td.training_title ?? td.name ?? p.title);
        if (!title) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            title,
            date_from: parseLegacyDate(td.date_from ?? td.start_date ?? p.date_from),
            date_to: parseLegacyDate(td.date_to ?? td.end_date ?? p.date_to),
            hours_count: cleanString(td.hours ?? p.hours) ? parseFloat(String(td.hours ?? p.hours)) : null,
            learning_type: cleanString(td.type ?? td.training_type),
            conducted_by: cleanString(td.conducted_by ?? td.organizer ?? td.institution),
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_learning_development", rows);
    return { inserted, skipped, issues: [] };
}

// ── Skills ────────────────────────────────────────────────────────────────
export async function migrateSkills(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "skills", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        // Actual field: skill_hobby
        const skillName = cleanString(p.skill_hobby ?? p.skill ?? p.skill_name ?? p.name);
        if (!ref || !skillName) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            skill_name: skillName,
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_other_skills", rows);
    return { inserted, skipped, issues: [] };
}

// ── Recognitions ──────────────────────────────────────────────────────────
export async function migrateRecognitions(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "recognition", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        // Actual field: recog_name
        const title = cleanString(p.recog_name ?? p.recognition_title ?? p.award ?? p.title ?? p.name);
        if (!ref || !title) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            recognition_title: title,
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_recognitions", rows);
    return { inserted, skipped, issues: [] };
}

// ── Memberships / Organizations ────────────────────────────────────────────
export async function migrateMemberships(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    let sortIdx = 0;
    for await (const { payload: p } of fetchStagingRows(ctx.client, "organizations", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        // Actual field: org_name
        const orgName = cleanString(p.org_name ?? p.organization_name ?? p.name ?? p.org);
        if (!ref || !orgName) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        rows.push({
            pds_profile_id: ref.pdsProfileId,
            employee_id: ref.employeeId,
            campus_id: ref.campusId,
            office_id: ref.officeId,
            organization_name: orgName,
            sort_order: sortIdx++,
        });
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_memberships", rows);
    return { inserted, skipped, issues: [] };
}

// ── Government IDs ────────────────────────────────────────────────────────
export async function migrateGovernmentIds(
    ctx: MigratorContext,
    refMap: EmployeeRefMap,
): Promise<MigratorResult> {
    const rows: object[] = [];
    let skipped = 0;
    const ID_FIELDS: Array<{ col: string; idType: string }> = [
        { col: "gsis", idType: "GSIS" },
        { col: "pagibig", idType: "PAG-IBIG" },
        { col: "philhealth", idType: "PhilHealth" },
        { col: "sss", idType: "SSS" },
        { col: "tin", idType: "TIN" },
    ];
    for await (const { payload: p } of fetchStagingRows(ctx.client, "government_id", ctx.batchId)) {
        const ref = resolveEmployeeRef(refMap, p);
        if (!ref) { skipped++; continue; }
        if (ctx.dryRun) { rows.push({}); continue; }
        for (const { col, idType } of ID_FIELDS) {
            const num = cleanString(p[col] ?? p[`${col}_no`] ?? p[`${col}_number`]);
            if (!num) continue;
            rows.push({
                pds_profile_id: ref.pdsProfileId,
                employee_id: ref.employeeId,
                campus_id: ref.campusId,
                office_id: ref.officeId,
                id_type: idType,
                id_number: num,
                is_primary: false,
            });
        }
    }
    if (ctx.dryRun) return { inserted: rows.length, skipped, issues: [] };
    const inserted = await bulkInsert(ctx.client, "employee_government_ids", rows);
    return { inserted, skipped, issues: [] };
}
