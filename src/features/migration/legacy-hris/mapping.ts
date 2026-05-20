/**
 * Source → target table mapping for the legacy HRIS migration.
 *
 * Used by both the orchestrator (to decide migration order) and the
 * compliance/audit reviewer (to understand provenance).
 */
import type { LegacyTable, LegacyTableMapping } from "./types";

export const LEGACY_TABLE_MAPPINGS: Readonly<Record<LegacyTable, LegacyTableMapping>> =
    Object.freeze({
        employee_profile: {
            legacyTable: "employee_profile",
            targetTable: "public.employees",
            standalone: true,
            dependsOn: [],
            forbiddenColumns: [],
        },
        address: {
            legacyTable: "address",
            // Address fields are stored as JSON columns in employee_personal_information.
            // There is no standalone employee_pds_addresses table in the current schema.
            targetTable: null,
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        contacts: {
            legacyTable: "contacts",
            // Contact fields are stored as columns in employee_personal_information.
            // There is no standalone employee_pds_contacts table in the current schema.
            targetTable: null,
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        family: {
            legacyTable: "family",
            targetTable: "public.employee_pds_family_background",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        children: {
            legacyTable: "children",
            targetTable: "public.employee_pds_children",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        educational_bg: {
            legacyTable: "educational_bg",
            targetTable: "public.employee_pds_education",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        eligibility: {
            legacyTable: "eligibility",
            targetTable: "public.employee_pds_civil_service_eligibility",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        service_record: {
            legacyTable: "service_record",
            targetTable: "public.employee_pds_work_experience",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        government_id: {
            legacyTable: "government_id",
            targetTable: "public.employee_pds_government_ids",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        skills: {
            legacyTable: "skills",
            targetTable: "public.employee_pds_other_info_skills",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        organizations: {
            legacyTable: "organizations",
            targetTable: "public.employee_pds_other_info_memberships",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        recognition: {
            legacyTable: "recognition",
            targetTable: "public.employee_pds_other_info_recognitions",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        trainings: {
            legacyTable: "trainings",
            targetTable: "public.employee_pds_learning_development",
            standalone: false,
            dependsOn: ["employee_profile"],
            forbiddenColumns: [],
        },
        training_participants: {
            legacyTable: "training_participants",
            targetTable: "public.employee_pds_learning_development",
            standalone: false,
            dependsOn: ["employee_profile", "trainings"],
            forbiddenColumns: [],
        },
        training_post: {
            legacyTable: "training_post",
            targetTable: null,
            standalone: false,
            dependsOn: ["trainings"],
            forbiddenColumns: [],
        },
        users: {
            legacyTable: "users",
            // Never migrate users to public.app_users. App auth flows through Supabase Auth.
            targetTable: null,
            standalone: true,
            dependsOn: [],
            forbiddenColumns: ["password", "remember_token", "otp", "api_token"],
        },
        logs_tbl: {
            legacyTable: "logs_tbl",
            // Staging-only — preserved for audit/historical reference, never copied to public.audit_logs.
            targetTable: null,
            standalone: true,
            dependsOn: [],
            forbiddenColumns: [],
        },
    });

/** Topological order respecting `dependsOn`. */
export function getMigrationOrder(): LegacyTable[] {
    const visited = new Set<LegacyTable>();
    const order: LegacyTable[] = [];

    function visit(t: LegacyTable) {
        if (visited.has(t)) return;
        visited.add(t);
        for (const dep of LEGACY_TABLE_MAPPINGS[t].dependsOn) visit(dep);
        order.push(t);
    }

    for (const t of Object.keys(LEGACY_TABLE_MAPPINGS) as LegacyTable[]) visit(t);
    return order;
}
