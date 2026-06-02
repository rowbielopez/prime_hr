"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/features/auth/server/require-permission";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";

export type PdsActionResult = { ok: true; id?: string } | { ok: false; error: string };

const PDS_SAVE_ERROR = "We could not save this PDS section right now. Please review the entries and try again.";

function pdsSaveFailure(): PdsActionResult {
    return { ok: false, error: PDS_SAVE_ERROR };
}

// â”€â”€ Address helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AddressInput = {
    houseNo: string | null;
    street: string | null;
    barangay: string | null;
    cityMunicipality: string | null;
    province: string | null;
    zipCode: string | null;
    country: string | null;
};

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function touchProfile(db: any, pdsProfileId: string, userId: string) {
    await db.from("employee_pds_profiles").update({ updated_by_user_id: userId }).eq("id", pdsProfileId);
}

// â”€â”€ Personal Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpdatePersonalInfoInput = {
    employeeId: string;
    pdsProfileId: string;
    personalInfoId: string;
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

export async function updatePersonalInfoAction(input: UpdatePersonalInfoInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error } = await db
        .from("employee_personal_information")
        .update({
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
        })
        .eq("id", input.personalInfoId)
        .eq("pds_profile_id", input.pdsProfileId);

    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    await writeAuditLog({ eventType: "pds", action: "update", entityType: "pds_personal_info", entityId: input.employeeId });
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Family Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpdateFamilyBackgroundInput = {
    employeeId: string;
    pdsProfileId: string;
    familyId: string;
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

export async function updateFamilyBackgroundAction(input: UpdateFamilyBackgroundInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error } = await db
        .from("employee_family_background")
        .update({
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
        })
        .eq("id", input.familyId)
        .eq("pds_profile_id", input.pdsProfileId);

    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Children â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertChildInput = {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    childId: string | null;
    fullName: string;
    birthDate: string | null;
    sortOrder: number;
};

export async function upsertChildAction(input: UpsertChildInput): Promise<PdsActionResult> {
    if (!input.fullName.trim()) return { ok: false, error: "Full name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    if (input.childId) {
        const { error } = await db.from("employee_children")
            .update({ full_name: input.fullName, birth_date: input.birthDate || null, sort_order: input.sortOrder, updated_by_user_id: context.appUserId })
            .eq("id", input.childId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.childId };
    } else {
        const { data, error } = await db.from("employee_children")
            .insert({ pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, full_name: input.fullName, birth_date: input.birthDate || null, sort_order: input.sortOrder, created_by_user_id: context.appUserId, updated_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteChildInput = { employeeId: string; pdsProfileId: string; childId: string };
export async function deleteChildAction(input: DeleteChildInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_children")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.childId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertEducationInput = {
    employeeId: string;
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

export async function upsertEducationAction(input: UpsertEducationInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

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
        const { error } = await db.from("employee_education").update(payload).eq("id", input.educationId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.educationId };
    } else {
        const { data, error } = await db.from("employee_education")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

// â”€â”€ Eligibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertEligibilityInput = {
    employeeId: string;
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

export async function upsertEligibilityAction(input: UpsertEligibilityInput): Promise<PdsActionResult> {
    if (!input.eligibilityName.trim()) return { ok: false, error: "Eligibility name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

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
        const { error } = await db.from("employee_eligibilities").update(payload).eq("id", input.eligibilityId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.eligibilityId };
    } else {
        const { data, error } = await db.from("employee_eligibilities")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteEligibilityInput = { employeeId: string; pdsProfileId: string; eligibilityId: string };
export async function deleteEligibilityAction(input: DeleteEligibilityInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_eligibilities")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.eligibilityId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Work Experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertWorkExperienceInput = {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    workExpId: string | null;
    positionTitle: string;
    departmentAgencyOfficeCompany: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    isCurrent: boolean;
    monthlySalary: number | null;
    salaryGradeStep: string | null;
    appointmentStatus: string | null;
    isGovernmentService: boolean | null;
    sortOrder: number;
};

export async function upsertWorkExperienceAction(input: UpsertWorkExperienceInput): Promise<PdsActionResult> {
    if (!input.positionTitle.trim()) return { ok: false, error: "Position title is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const payload = {
        position_title: input.positionTitle,
        department_agency_office_company: input.departmentAgencyOfficeCompany,
        date_from: input.dateFrom || null,
        date_to: input.isCurrent ? null : (input.dateTo || null),
        is_current: input.isCurrent,
        monthly_salary: input.monthlySalary,
        salary_grade_step: input.salaryGradeStep,
        appointment_status: input.appointmentStatus,
        is_government_service: input.isGovernmentService,
        sort_order: input.sortOrder,
        updated_by_user_id: context.appUserId,
    };

    if (input.workExpId) {
        const { error } = await db.from("employee_work_experiences").update(payload).eq("id", input.workExpId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.workExpId };
    } else {
        const { data, error } = await db.from("employee_work_experiences")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteWorkExperienceInput = { employeeId: string; pdsProfileId: string; workExpId: string };
export async function deleteWorkExperienceAction(input: DeleteWorkExperienceInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_work_experiences")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.workExpId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Learning & Development â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertLearningInput = {
    employeeId: string;
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

export async function upsertLearningAction(input: UpsertLearningInput): Promise<PdsActionResult> {
    if (!input.title.trim()) return { ok: false, error: "Title is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

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
        const { error } = await db.from("employee_learning_development").update(payload).eq("id", input.learningId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.learningId };
    } else {
        const { data, error } = await db.from("employee_learning_development")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteLearningInput = { employeeId: string; pdsProfileId: string; learningId: string };
export async function deleteLearningAction(input: DeleteLearningInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_learning_development")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.learningId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Skills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertSkillInput = {
    employeeId: string; pdsProfileId: string; campusId: string;
    skillId: string | null; skillName: string; sortOrder: number;
};
export async function upsertSkillAction(input: UpsertSkillInput): Promise<PdsActionResult> {
    if (!input.skillName.trim()) return { ok: false, error: "Skill name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    if (input.skillId) {
        const { error } = await db.from("employee_other_skills")
            .update({ skill_name: input.skillName, sort_order: input.sortOrder, updated_by_user_id: context.appUserId })
            .eq("id", input.skillId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.skillId };
    } else {
        const { data, error } = await db.from("employee_other_skills")
            .insert({ pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, skill_name: input.skillName, sort_order: input.sortOrder, created_by_user_id: context.appUserId, updated_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}
export type DeleteSkillInput = { employeeId: string; pdsProfileId: string; skillId: string };
export async function deleteSkillAction(input: DeleteSkillInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_other_skills")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.skillId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Recognitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertRecognitionInput = {
    employeeId: string; pdsProfileId: string; campusId: string;
    recognitionId: string | null; recognitionTitle: string; sortOrder: number;
};
export async function upsertRecognitionAction(input: UpsertRecognitionInput): Promise<PdsActionResult> {
    if (!input.recognitionTitle.trim()) return { ok: false, error: "Title is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    if (input.recognitionId) {
        const { error } = await db.from("employee_recognitions")
            .update({ recognition_title: input.recognitionTitle, sort_order: input.sortOrder, updated_by_user_id: context.appUserId })
            .eq("id", input.recognitionId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.recognitionId };
    } else {
        const { data, error } = await db.from("employee_recognitions")
            .insert({ pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, recognition_title: input.recognitionTitle, sort_order: input.sortOrder, created_by_user_id: context.appUserId, updated_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}
export type DeleteRecognitionInput = { employeeId: string; pdsProfileId: string; recognitionId: string };
export async function deleteRecognitionAction(input: DeleteRecognitionInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_recognitions")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.recognitionId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ Memberships â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertMembershipInput = {
    employeeId: string; pdsProfileId: string; campusId: string;
    membershipId: string | null; organizationName: string; sortOrder: number;
};
export async function upsertMembershipAction(input: UpsertMembershipInput): Promise<PdsActionResult> {
    if (!input.organizationName.trim()) return { ok: false, error: "Organization name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    if (input.membershipId) {
        const { error } = await db.from("employee_memberships")
            .update({ organization_name: input.organizationName, sort_order: input.sortOrder, updated_by_user_id: context.appUserId })
            .eq("id", input.membershipId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.membershipId };
    } else {
        const { data, error } = await db.from("employee_memberships")
            .insert({ pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, organization_name: input.organizationName, sort_order: input.sortOrder, created_by_user_id: context.appUserId, updated_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}
export type DeleteMembershipInput = { employeeId: string; pdsProfileId: string; membershipId: string };
export async function deleteMembershipAction(input: DeleteMembershipInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_memberships")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.membershipId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// â”€â”€ References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UpsertReferenceInput = {
    employeeId: string;
    pdsProfileId: string;
    referenceId: string | null;
    fullName: string;
    address: string | null;
    telephoneNo: string | null;
    email: string | null;
    sortOrder: number;
    campusId: string;
};

export async function upsertReferenceAction(input: UpsertReferenceInput): Promise<PdsActionResult> {
    if (!input.fullName.trim()) return { ok: false, error: "Full name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    if (input.referenceId) {
        const { error } = await db.from("employee_references")
            .update({ full_name: input.fullName, address: input.address, telephone_no: input.telephoneNo, email: input.email, sort_order: input.sortOrder, updated_by_user_id: context.appUserId })
            .eq("id", input.referenceId).eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.referenceId };
    } else {
        const { data, error } = await db.from("employee_references")
            .insert({ pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, full_name: input.fullName, address: input.address, telephone_no: input.telephoneNo, email: input.email, sort_order: input.sortOrder, created_by_user_id: context.appUserId, updated_by_user_id: context.appUserId })
            .select("id").single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteReferenceInput = { employeeId: string; pdsProfileId: string; referenceId: string };
export async function deleteReferenceAction(input: DeleteReferenceInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_references")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.referenceId).eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

// ── Declaration (items 34–40) ─────────────────────────────────────────────────

export type UpsertDeclarationInput = {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    declarationId: string | null;
    answers: Record<string, string>;
    explanations: Record<string, string>;
    declarationDate: string | null;
    administeringOfficer: string | null;
};

export async function upsertDeclarationAction(input: UpsertDeclarationInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const payload = {
        answers: input.answers,
        explanations: input.explanations,
        declaration_date: input.declarationDate || null,
        administering_officer: input.administeringOfficer || null,
        updated_by_user_id: context.appUserId,
    };

    if (input.declarationId) {
        const { error } = await db
            .from("employee_pds_declarations")
            .update(payload)
            .eq("id", input.declarationId)
            .eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.declarationId };
    } else {
        const { data, error } = await db
            .from("employee_pds_declarations")
            .insert({
                ...payload,
                pds_profile_id: input.pdsProfileId,
                employee_id: input.employeeId,
                campus_id: input.campusId,
                created_by_user_id: context.appUserId,
            })
            .select("id")
            .single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

// ── Government-Issued ID ──────────────────────────────────────────────────────

export type UpsertGovernmentIdInput = {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    governmentIdId: string | null;
    idType: string;
    idNumber: string;
    issuedAt: string | null;
    issuedPlace: string | null;
    issuingAgency: string | null;
    isPrimary: boolean;
};

export async function upsertGovernmentIdAction(input: UpsertGovernmentIdInput): Promise<PdsActionResult> {
    if (!input.idType.trim() || !input.idNumber.trim()) return { ok: false, error: "ID type and number are required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const payload = {
        id_type: input.idType,
        id_number: input.idNumber,
        issued_at: input.issuedAt || null,
        issued_place: input.issuedPlace || null,
        issuing_agency: input.issuingAgency || null,
        is_primary: input.isPrimary,
        updated_by_user_id: context.appUserId,
    };

    if (input.governmentIdId) {
        const { error } = await db
            .from("employee_government_ids")
            .update(payload)
            .eq("id", input.governmentIdId)
            .eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.governmentIdId };
    } else {
        const { data, error } = await db
            .from("employee_government_ids")
            .insert({
                ...payload,
                pds_profile_id: input.pdsProfileId,
                employee_id: input.employeeId,
                campus_id: input.campusId,
                created_by_user_id: context.appUserId,
            })
            .select("id")
            .single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

// ── Voluntary Work ────────────────────────────────────────────────────────────

export type UpsertVoluntaryWorkInput = {
    employeeId: string;
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

export async function upsertVoluntaryWorkAction(input: UpsertVoluntaryWorkInput): Promise<PdsActionResult> {
    if (!input.organizationName.trim()) return { ok: false, error: "Organization name is required." };
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

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
        const { error } = await db.from("employee_voluntary_work")
            .update(payload)
            .eq("id", input.voluntaryWorkId)
            .eq("pds_profile_id", input.pdsProfileId);
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        await writeAuditLog({ eventType: "pds", action: "update", entityType: "pds_voluntary_work", entityId: input.employeeId });
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: input.voluntaryWorkId };
    } else {
        const { data, error } = await db.from("employee_voluntary_work")
            .insert({ ...payload, pds_profile_id: input.pdsProfileId, employee_id: input.employeeId, campus_id: input.campusId, created_by_user_id: context.appUserId })
            .select("id")
            .single();
        if (error) return pdsSaveFailure();
        await touchProfile(db, input.pdsProfileId, context.appUserId);
        await writeAuditLog({ eventType: "pds", action: "create", entityType: "pds_voluntary_work", entityId: input.employeeId });
        revalidatePath(`/employees/${input.employeeId}/pds`);
        return { ok: true, id: (data as { id: string }).id };
    }
}

export type DeleteVoluntaryWorkInput = { employeeId: string; pdsProfileId: string; voluntaryWorkId: string };
export async function deleteVoluntaryWorkAction(input: DeleteVoluntaryWorkInput): Promise<PdsActionResult> {
    const context = await requirePermission({ permission: "employee.records.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db.from("employee_voluntary_work")
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: context.appUserId })
        .eq("id", input.voluntaryWorkId)
        .eq("pds_profile_id", input.pdsProfileId);
    if (error) return pdsSaveFailure();
    await touchProfile(db, input.pdsProfileId, context.appUserId);
    await writeAuditLog({ eventType: "pds", action: "delete", entityType: "pds_voluntary_work", entityId: input.employeeId });
    revalidatePath(`/employees/${input.employeeId}/pds`);
    return { ok: true };
}

