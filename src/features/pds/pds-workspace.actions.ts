"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/features/auth/server/require-permission";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import type { AddressInput } from "@/features/employees/pds-edit.actions";

export type WorkspaceActionResult = { ok: true; id?: string } | { ok: false; error: string };

const PDS_SAVE_ERROR = "We could not save this PDS section right now. Please review the entries and try again.";

function pdsSaveFailure(): WorkspaceActionResult {
    return { ok: false, error: PDS_SAVE_ERROR };
}

// â”€â”€ Auth helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function requireSelfWrite() {
    const context = await requirePermission({ permission: "pds.self.write" });
    const employeeId = await getEmployeeIdForAppUser(context.appUserId);
    if (!employeeId) return { context, employeeId: null as never, db: null as never, error: "No employee profile is linked to your account." as string };
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    return { context, employeeId, db, error: null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function touchProfile(db: any, pdsProfileId: string, userId: string) {
    await db.from("employee_pds_profiles").update({ updated_by_user_id: userId }).eq("id", pdsProfileId);
}

function toAddressJson(addr: AddressInput) {
    return {
        house_no: addr.houseNo ?? null,
        street: addr.street ?? null,
        barangay: addr.barangay ?? null,
        city_municipality: addr.cityMunicipality ?? null,
        province: addr.province ?? null,
        zip_code: addr.zipCode ?? null,
        country: addr.country ?? null,
    };
}

// â”€â”€ Ensure PDS profile exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function ensurePdsProfileAction(): Promise<WorkspaceActionResult & { profileId?: string }> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    // Check for existing profile
    const { data: existing } = await db
        .from("employee_pds_profiles")
        .select("id")
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();

    if (existing) return { ok: true, profileId: (existing as { id: string }).id };

    // Get employee campus
    const { data: emp } = await db.from("employees").select("campus_id, office_id").eq("id", employeeId).maybeSingle();
    if (!emp) return { ok: false, error: "Employee record not found." };

    const { data: profile, error: insertError } = await db
        .from("employee_pds_profiles")
        .insert({
            employee_id: employeeId,
            campus_id: (emp as { campus_id: string }).campus_id,
            office_id: (emp as { office_id: string | null }).office_id ?? null,
            status: "draft",
            created_by_user_id: context.appUserId,
            updated_by_user_id: context.appUserId,
        })
        .select("id")
        .single();

    if (insertError) return pdsSaveFailure();
    return { ok: true, profileId: (profile as { id: string }).id };
}

// â”€â”€ Personal Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpdatePersonalInfoInput = {
    pdsProfileId: string;
    personalInfoId: string | null;
    campusId: string;
    surname: string | null;
    firstName: string | null;
    middleName: string | null;
    nameExtension: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    sexAtBirth: string | null;
    civilStatus: string | null;
    heightM: number | null;
    weightKg: number | null;
    bloodType: string | null;
    citizenship: string | null;
    dualCitizenshipType: string | null;
    dualCitizenshipCountry: string | null;
    telephoneNo: string | null;
    mobileNo: string | null;
    email: string | null;
    gsisNo: string | null;
    pagibigNo: string | null;
    philhealthNo: string | null;
    sssNo: string | null;
    tin: string | null;
    philsysNo: string | null;
    agencyEmployeeNo: string | null;
    residentialAddress: AddressInput;
    permanentAddress: AddressInput;
};

export async function wsUpdatePersonalInfoAction(input: WsUpdatePersonalInfoInput): Promise<WorkspaceActionResult> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        surname: input.surname,
        first_name: input.firstName,
        middle_name: input.middleName,
        name_extension: input.nameExtension,
        birth_date: input.birthDate || null,
        birth_place: input.birthPlace,
        sex_at_birth: input.sexAtBirth,
        civil_status: input.civilStatus,
        height_m: input.heightM,
        weight_kg: input.weightKg,
        blood_type: input.bloodType,
        citizenship: input.citizenship,
        dual_citizenship_type: input.dualCitizenshipType || null,
        dual_citizenship_country: input.dualCitizenshipCountry || null,
        telephone_no: input.telephoneNo,
        mobile_no: input.mobileNo,
        email: input.email,
        gsis_no: input.gsisNo,
        pagibig_no: input.pagibigNo,
        philhealth_no: input.philhealthNo,
        sss_no: input.sssNo,
        tin: input.tin,
        philsys_no: input.philsysNo,
        agency_employee_no: input.agencyEmployeeNo,
        residential_address: toAddressJson(input.residentialAddress),
        permanent_address: toAddressJson(input.permanentAddress),
        updated_by_user_id: context.appUserId,
    };

    if (input.personalInfoId) {
        const { error: dbErr } = await db
            .from("employee_personal_information")
            .update(payload)
            .eq("id", input.personalInfoId)
            .eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
    } else {
        const { error: dbErr } = await db
            .from("employee_personal_information")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId });
        if (dbErr) return pdsSaveFailure();
    }

    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Family Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpdateFamilyBackgroundInput = {
    pdsProfileId: string;
    familyId: string | null;
    campusId: string;
    spouseSurname: string | null;
    spouseFirstName: string | null;
    spouseMiddleName: string | null;
    spouseNameExtension: string | null;
    spouseOccupation: string | null;
    spouseEmployerName: string | null;
    spouseBusinessAddress: string | null;
    spouseTelephoneNo: string | null;
    fatherSurname: string | null;
    fatherFirstName: string | null;
    fatherMiddleName: string | null;
    fatherNameExtension: string | null;
    motherMaidenSurname: string | null;
    motherFirstName: string | null;
    motherMiddleName: string | null;
};

export async function wsUpdateFamilyBackgroundAction(input: WsUpdateFamilyBackgroundInput): Promise<WorkspaceActionResult> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        spouse_surname: input.spouseSurname,
        spouse_first_name: input.spouseFirstName,
        spouse_middle_name: input.spouseMiddleName,
        spouse_name_extension: input.spouseNameExtension,
        spouse_occupation: input.spouseOccupation,
        spouse_employer_business_name: input.spouseEmployerName,
        spouse_business_address: input.spouseBusinessAddress,
        spouse_telephone_no: input.spouseTelephoneNo,
        father_surname: input.fatherSurname,
        father_first_name: input.fatherFirstName,
        father_middle_name: input.fatherMiddleName,
        father_name_extension: input.fatherNameExtension,
        mother_maiden_surname: input.motherMaidenSurname,
        mother_first_name: input.motherFirstName,
        mother_middle_name: input.motherMiddleName,
        updated_by_user_id: context.appUserId,
    };

    if (input.familyId) {
        const { error: dbErr } = await db.from("employee_family_background").update(payload).eq("id", input.familyId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
    } else {
        const { error: dbErr } = await db.from("employee_family_background").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId });
        if (dbErr) return pdsSaveFailure();
    }

    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Children â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertChildInput = {
    pdsProfileId: string;
    campusId: string;
    childId: string | null;
    fullName: string;
    birthDate: string | null;
    sortOrder: number;
};

export async function wsUpsertChildAction(input: WsUpsertChildInput): Promise<WorkspaceActionResult> {
    if (!input.fullName.trim()) return { ok: false, error: "Child name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = { full_name: input.fullName, birth_date: input.birthDate || null, sort_order: input.sortOrder, updated_by_user_id: context.appUserId };

    if (input.childId) {
        const { error: dbErr } = await db.from("employee_children").update(payload).eq("id", input.childId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: input.childId };
    } else {
        const { data, error: dbErr } = await db.from("employee_children").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteChildAction(input: { pdsProfileId: string; childId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_children").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.childId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertEducationInput = {
    pdsProfileId: string;
    campusId: string;
    educationId: string | null;
    level: string;
    schoolName: string | null;
    degreeCourse: string | null;
    periodFromYear: number | null;
    periodToYear: number | null;
    highestLevelUnits: string | null;
    yearGraduated: number | null;
    scholarshipHonors: string | null;
    sortOrder: number;
};

export async function wsUpsertEducationAction(input: WsUpsertEducationInput): Promise<WorkspaceActionResult> {
    if (!input.level.trim()) return { ok: false, error: "Education level is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        level: input.level,
        school_name: input.schoolName,
        degree_course: input.degreeCourse,
        period_from_year: input.periodFromYear,
        period_to_year: input.periodToYear,
        highest_level_units: input.highestLevelUnits,
        year_graduated: input.yearGraduated,
        scholarship_honors: input.scholarshipHonors,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.educationId) {
        const { error: dbErr } = await db.from("employee_education").update(payload).eq("id", input.educationId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: input.educationId };
    } else {
        const { data, error: dbErr } = await db.from("employee_education").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteEducationAction(input: { pdsProfileId: string; educationId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_education").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.educationId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Eligibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertEligibilityInput = {
    pdsProfileId: string;
    campusId: string;
    eligibilityId: string | null;
    eligibilityName: string;
    rating: string | null;
    examinationDate: string | null;
    examinationPlace: string | null;
    licenseNumber: string | null;
    licenseValidUntil: string | null;
    sortOrder: number;
};

export async function wsUpsertEligibilityAction(input: WsUpsertEligibilityInput): Promise<WorkspaceActionResult> {
    if (!input.eligibilityName.trim()) return { ok: false, error: "Eligibility name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        eligibility_name: input.eligibilityName,
        rating: input.rating,
        examination_date: input.examinationDate || null,
        examination_place: input.examinationPlace,
        license_number: input.licenseNumber,
        license_valid_until: input.licenseValidUntil || null,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.eligibilityId) {
        const { error: dbErr } = await db.from("employee_eligibilities").update(payload).eq("id", input.eligibilityId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: input.eligibilityId };
    } else {
        const { data, error: dbErr } = await db.from("employee_eligibilities").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteEligibilityAction(input: { pdsProfileId: string; eligibilityId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_eligibilities").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.eligibilityId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Work Experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertWorkExperienceInput = {
    pdsProfileId: string;
    campusId: string;
    workExpId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    isCurrent: boolean;
    positionTitle: string;
    departmentAgencyOfficeCompany: string | null;
    monthlySalary: number | null;
    salaryGradeStep: string | null;
    appointmentStatus: string | null;
    isGovernmentService: boolean | null;
    sortOrder: number;
};

export async function wsUpsertWorkExperienceAction(input: WsUpsertWorkExperienceInput): Promise<WorkspaceActionResult> {
    if (!input.positionTitle.trim()) return { ok: false, error: "Position title is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        date_from: input.dateFrom || null,
        date_to: input.isCurrent ? null : (input.dateTo || null),
        is_current: input.isCurrent,
        position_title: input.positionTitle,
        department_agency_office_company: input.departmentAgencyOfficeCompany,
        monthly_salary: input.monthlySalary,
        salary_grade_step: input.salaryGradeStep,
        appointment_status: input.appointmentStatus,
        is_government_service: input.isGovernmentService,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.workExpId) {
        const { error: dbErr } = await db.from("employee_work_experiences").update(payload).eq("id", input.workExpId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: input.workExpId };
    } else {
        const { data, error: dbErr } = await db.from("employee_work_experiences").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteWorkExperienceAction(input: { pdsProfileId: string; workExpId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_work_experiences").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.workExpId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Voluntary Work â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertVoluntaryWorkInput = {
    pdsProfileId: string;
    campusId: string;
    voluntaryWorkId: string | null;
    organizationName: string;
    organizationAddress: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    hoursCount: number | null;
    positionNatureOfWork: string | null;
    sortOrder: number;
};

export async function wsUpsertVoluntaryWorkAction(input: WsUpsertVoluntaryWorkInput): Promise<WorkspaceActionResult> {
    if (!input.organizationName.trim()) return { ok: false, error: "Organization name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        organization_name: input.organizationName,
        organization_address: input.organizationAddress,
        date_from: input.dateFrom || null,
        date_to: input.dateTo || null,
        hours_count: input.hoursCount,
        position_nature_of_work: input.positionNatureOfWork,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.voluntaryWorkId) {
        const { error: dbErr } = await db.from("employee_voluntary_work").update(payload).eq("id", input.voluntaryWorkId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        await writeAuditLog({ eventType: "pds", action: "update", entityType: "pds_voluntary_work", entityId: employeeId });
        revalidatePath("/pds");
        return { ok: true, id: input.voluntaryWorkId };
    } else {
        const { data, error: dbErr } = await db.from("employee_voluntary_work").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        await writeAuditLog({ eventType: "pds", action: "create", entityType: "pds_voluntary_work", entityId: employeeId });
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteVoluntaryWorkAction(input: { pdsProfileId: string; voluntaryWorkId: string }): Promise<WorkspaceActionResult> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_voluntary_work").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.voluntaryWorkId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    await writeAuditLog({ eventType: "pds", action: "delete", entityType: "pds_voluntary_work", entityId: employeeId });
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Learning & Development â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertLearningInput = {
    pdsProfileId: string;
    campusId: string;
    learningId: string | null;
    title: string;
    dateFrom: string | null;
    dateTo: string | null;
    hoursCount: number | null;
    learningType: string | null;
    conductedBy: string | null;
    sortOrder: number;
};

export async function wsUpsertLearningAction(input: WsUpsertLearningInput): Promise<WorkspaceActionResult> {
    if (!input.title.trim()) return { ok: false, error: "Title is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        title: input.title,
        date_from: input.dateFrom || null,
        date_to: input.dateTo || null,
        hours_count: input.hoursCount,
        learning_type: input.learningType,
        conducted_by: input.conductedBy,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.learningId) {
        const { error: dbErr } = await db.from("employee_learning_development").update(payload).eq("id", input.learningId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: input.learningId };
    } else {
        const { data, error: dbErr } = await db.from("employee_learning_development").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteLearningAction(input: { pdsProfileId: string; learningId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_learning_development").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.learningId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Other Info: Skills / Recognitions / Memberships â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertSkillInput = { pdsProfileId: string; campusId: string; skillId: string | null; skillName: string; sortOrder: number };
export async function wsUpsertSkillAction(input: WsUpsertSkillInput): Promise<WorkspaceActionResult> {
    if (!input.skillName.trim()) return { ok: false, error: "Skill name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const payload = { skill_name: input.skillName, sort_order: input.sortOrder, updated_by_user_id: context.appUserId };
    if (input.skillId) {
        const { error: dbErr } = await db.from("employee_other_skills").update(payload).eq("id", input.skillId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.skillId };
    } else {
        const { data, error: dbErr } = await db.from("employee_other_skills").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}
export async function wsDeleteSkillAction(input: { pdsProfileId: string; skillId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_other_skills").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.skillId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
    return { ok: true };
}

export type WsUpsertRecognitionInput = { pdsProfileId: string; campusId: string; recognitionId: string | null; recognitionTitle: string; sortOrder: number };
export async function wsUpsertRecognitionAction(input: WsUpsertRecognitionInput): Promise<WorkspaceActionResult> {
    if (!input.recognitionTitle.trim()) return { ok: false, error: "Recognition title is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const payload = { recognition_title: input.recognitionTitle, sort_order: input.sortOrder, updated_by_user_id: context.appUserId };
    if (input.recognitionId) {
        const { error: dbErr } = await db.from("employee_recognitions").update(payload).eq("id", input.recognitionId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.recognitionId };
    } else {
        const { data, error: dbErr } = await db.from("employee_recognitions").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}
export async function wsDeleteRecognitionAction(input: { pdsProfileId: string; recognitionId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_recognitions").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.recognitionId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
    return { ok: true };
}

export type WsUpsertMembershipInput = { pdsProfileId: string; campusId: string; membershipId: string | null; organizationName: string; sortOrder: number };
export async function wsUpsertMembershipAction(input: WsUpsertMembershipInput): Promise<WorkspaceActionResult> {
    if (!input.organizationName.trim()) return { ok: false, error: "Organization name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const payload = { organization_name: input.organizationName, sort_order: input.sortOrder, updated_by_user_id: context.appUserId };
    if (input.membershipId) {
        const { error: dbErr } = await db.from("employee_memberships").update(payload).eq("id", input.membershipId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.membershipId };
    } else {
        const { data, error: dbErr } = await db.from("employee_memberships").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}
export async function wsDeleteMembershipAction(input: { pdsProfileId: string; membershipId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_memberships").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.membershipId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertReferenceInput = {
    pdsProfileId: string;
    campusId: string;
    referenceId: string | null;
    fullName: string;
    address: string | null;
    telephoneNo: string | null;
    email: string | null;
    sortOrder: number;
};

export async function wsUpsertReferenceAction(input: WsUpsertReferenceInput): Promise<WorkspaceActionResult> {
    if (!input.fullName.trim()) return { ok: false, error: "Full name is required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        full_name: input.fullName,
        address: input.address,
        telephone_no: input.telephoneNo,
        email: input.email,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.referenceId) {
        const { error: dbErr } = await db.from("employee_references").update(payload).eq("id", input.referenceId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.referenceId };
    } else {
        const { data, error: dbErr } = await db.from("employee_references").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

export async function wsDeleteReferenceAction(input: { pdsProfileId: string; referenceId: string }): Promise<WorkspaceActionResult> {
    const { context, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };
    const { error: dbErr } = await db.from("employee_references").update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId }).eq("id", input.referenceId).eq("pds_profile_id", input.pdsProfileId);
    if (dbErr) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
    return { ok: true };
}

// â”€â”€ Declaration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertDeclarationInput = {
    pdsProfileId: string;
    campusId: string;
    declarationId: string | null;
    answers: Record<string, string>;
    explanations: Record<string, string>;
    declarationDate: string | null;
    administeringOfficer: string | null;
};

export async function wsUpsertDeclarationAction(input: WsUpsertDeclarationInput): Promise<WorkspaceActionResult> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        answers: input.answers,
        explanations: input.explanations,
        declaration_date: input.declarationDate || null,
        administering_officer: input.administeringOfficer || null,
        updated_by_user_id: context.appUserId,
    };

    if (input.declarationId) {
        const { error: dbErr } = await db.from("employee_pds_declarations").update(payload).eq("id", input.declarationId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.declarationId };
    } else {
        const { data, error: dbErr } = await db.from("employee_pds_declarations").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

// â”€â”€ Government ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type WsUpsertGovernmentIdInput = {
    pdsProfileId: string;
    campusId: string;
    governmentIdId: string | null;
    idType: string;
    idNumber: string;
    issuedAt: string | null;
    issuedPlace: string | null;
    issuingAgency: string | null;
};

export async function wsUpsertGovernmentIdAction(input: WsUpsertGovernmentIdInput): Promise<WorkspaceActionResult> {
    if (!input.idType.trim() || !input.idNumber.trim()) return { ok: false, error: "ID type and number are required." };
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    const payload = {
        id_type: input.idType,
        id_number: input.idNumber,
        issued_at: input.issuedAt || null,
        issued_place: input.issuedPlace || null,
        issuing_agency: input.issuingAgency || null,
        is_primary: true,
        updated_by_user_id: context.appUserId,
    };

    if (input.governmentIdId) {
        const { error: dbErr } = await db.from("employee_government_ids").update(payload).eq("id", input.governmentIdId).eq("pds_profile_id", input.pdsProfileId);
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: input.governmentIdId };
    } else {
        const { data, error: dbErr } = await db.from("employee_government_ids").insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId }).select("id").single();
        if (dbErr) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId); revalidatePath("/pds");
        return { ok: true, id: (data as { id: string }).id };
    }
}

// â”€â”€ Submit for HR Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function submitPdsForReviewAction(profileId: string): Promise<WorkspaceActionResult> {
    const { context, employeeId, db, error } = await requireSelfWrite();
    if (error) return { ok: false, error };

    // Verify the profile belongs to this employee
    const { data: profile } = await db
        .from("employee_pds_profiles")
        .select("id, status")
        .eq("id", profileId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();

    if (!profile) return { ok: false, error: "You do not have permission to submit this PDS." };

    const currentStatus = (profile as { id: string; status: string }).status;

    if (currentStatus === "ready_for_review" || currentStatus === "under_hr_review") {
        return { ok: false, error: "Your PDS is already pending HR review." };
    }
    if (currentStatus === "verified" || currentStatus === "generated") {
        return { ok: false, error: "Your PDS has already been verified by HR." };
    }

    // Validate required sections exist
    const [piRes, famRes, eduRes, weRes, refRes, declRes, govRes] = await Promise.all([
        db.from("employee_personal_information").select("id").eq("pds_profile_id", profileId).not("surname", "is", null).is("deleted_at", null).limit(1).maybeSingle(),
        db.from("employee_family_background").select("id").eq("pds_profile_id", profileId).is("deleted_at", null).maybeSingle(),
        db.from("employee_education").select("id").eq("pds_profile_id", profileId).is("deleted_at", null).limit(1).maybeSingle(),
        db.from("employee_work_experiences").select("id").eq("pds_profile_id", profileId).is("deleted_at", null).limit(1).maybeSingle(),
        db.from("employee_references").select("id").eq("pds_profile_id", profileId).is("deleted_at", null).limit(1).maybeSingle(),
        db.from("employee_pds_declarations").select("id").eq("pds_profile_id", profileId).is("deleted_at", null).maybeSingle(),
        db.from("employee_government_ids").select("id").eq("pds_profile_id", profileId).eq("is_primary", true).is("deleted_at", null).maybeSingle(),
    ]);

    const missing: string[] = [];
    if (!piRes.data) missing.push("Personal Information");
    if (!famRes.data) missing.push("Family Background");
    if (!eduRes.data) missing.push("Educational Background");
    if (!weRes.data) missing.push("Work Experience");
    if (!refRes.data) missing.push("References");
    if (!declRes.data) missing.push("Declaration");
    if (!govRes.data) missing.push("Government-Issued ID");

    if (missing.length > 0) {
        return {
            ok: false,
            error: `Please complete the required PDS sections before submitting: ${missing.join(", ")}.`,
        };
    }

    // Transition status to ready_for_review
    const { error: updateError } = await db
        .from("employee_pds_profiles")
        .update({
            status: "ready_for_review",
            submitted_at: new Date().toISOString(),
            submitted_by_user_id: context.appUserId,
            updated_by_user_id: context.appUserId,
        })
        .eq("id", profileId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null);

    if (updateError) return { ok: false, error: "We could not submit your PDS right now. Please try again or contact HR." };

    await writeAuditLog({
        eventType: "pds",
        action: "submit_for_review",
        entityType: "pds_profile",
        entityId: employeeId,
    });

    revalidatePath("/pds");
    return { ok: true };
}

