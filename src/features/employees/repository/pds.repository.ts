import { createSupabaseServerClient } from "@/lib/supabase/server";
export {
    LEVEL_LABELS,
    normalizeEducationLevel,
    getEducationLevelLabel,
    sortEducation,
    type PdsPersonalInfo,
    type PdsFamilyBackground,
    type PdsChild,
    type PdsEducation,
    type PdsEligibility,
    type PdsWorkExperience,
    type PdsVoluntaryWork,
    type PdsLearningDevelopment,
    type PdsSkill,
    type PdsRecognition,
    type PdsMembership,
    type PdsReference,
    type PdsDeclaration,
    type PdsGovernmentId,
    type EmployeePdsData,
} from "./pds.types";
import type {
    PdsPersonalInfo,
    PdsFamilyBackground,
    PdsChild,
    PdsEducation,
    PdsEligibility,
    PdsWorkExperience,
    PdsVoluntaryWork,
    PdsLearningDevelopment,
    PdsSkill,
    PdsRecognition,
    PdsMembership,
    PdsReference,
    PdsDeclaration,
    PdsGovernmentId,
    EmployeePdsData,
} from "./pds.types";

// ── Raw DB row types ─────────────────────────────────────────────────────────

type PersonalInfoRow = {
    id: string;
    surname: string | null;
    first_name: string | null;
    middle_name: string | null;
    name_extension: string | null;
    birth_date: string | null;
    birth_place: string | null;
    sex_at_birth: string | null;
    civil_status: string | null;
    height_m: number | null;
    weight_kg: number | null;
    blood_type: string | null;
    gsis_no: string | null;
    pagibig_no: string | null;
    philhealth_no: string | null;
    sss_no: string | null;
    tin: string | null;
    philsys_no: string | null;
    agency_employee_no: string | null;
    citizenship: string | null;
    dual_citizenship_type: string | null;
    dual_citizenship_country: string | null;
    residential_address: Record<string, unknown>;
    permanent_address: Record<string, unknown>;
    telephone_no: string | null;
    mobile_no: string | null;
    email: string | null;
};

type FamilyRow = {
    id: string;
    spouse_surname: string | null;
    spouse_first_name: string | null;
    spouse_middle_name: string | null;
    spouse_name_extension: string | null;
    spouse_occupation: string | null;
    spouse_employer_business_name: string | null;
    spouse_business_address: string | null;
    spouse_telephone_no: string | null;
    father_surname: string | null;
    father_first_name: string | null;
    father_middle_name: string | null;
    father_name_extension: string | null;
    mother_maiden_surname: string | null;
    mother_first_name: string | null;
    mother_middle_name: string | null;
};

type ChildRow = {
    id: string;
    full_name: string;
    birth_date: string | null;
    sort_order: number;
};

type EducationRow = {
    id: string;
    level: string;
    school_name: string | null;
    degree_course: string | null;
    period_from_year: number | null;
    period_to_year: number | null;
    highest_level_units: string | null;
    year_graduated: number | null;
    scholarship_honors: string | null;
    sort_order: number;
};

type EligibilityRow = {
    id: string;
    eligibility_name: string;
    rating: string | null;
    examination_date: string | null;
    examination_place: string | null;
    license_number: string | null;
    license_valid_until: string | null;
    sort_order: number;
};

type WorkExpRow = {
    id: string;
    date_from: string | null;
    date_to: string | null;
    is_current: boolean;
    position_title: string;
    department_agency_office_company: string | null;
    monthly_salary: number | null;
    salary_grade_step: string | null;
    appointment_status: string | null;
    is_government_service: boolean | null;
    sort_order: number;
};

type VoluntaryWorkRow = {
    id: string;
    organization_name: string;
    organization_address: string | null;
    date_from: string | null;
    date_to: string | null;
    hours_count: number | null;
    position_nature_of_work: string | null;
    sort_order: number;
};

type LearningRow = {
    id: string;
    title: string;
    date_from: string | null;
    date_to: string | null;
    hours_count: number | null;
    learning_type: string | null;
    conducted_by: string | null;
    sort_order: number;
};

type SkillRow = {
    id: string;
    skill_name: string;
    sort_order: number;
};

type RecognitionRow = {
    id: string;
    recognition_title: string;
    sort_order: number;
};

type MembershipRow = {
    id: string;
    organization_name: string;
    sort_order: number;
};

type ReferenceRow = {
    id: string;
    full_name: string;
    address: string | null;
    telephone_no: string | null;
    email: string | null;
    sort_order: number;
};

type DeclarationRow = {
    id: string;
    answers: Record<string, unknown>;
    explanations: Record<string, unknown>;
    declaration_date: string | null;
    administering_officer: string | null;
};

type GovernmentIdRow = {
    id: string;
    id_type: string;
    id_number: string;
    issued_at: string | null;
    issued_place: string | null;
    issuing_agency: string | null;
    is_primary: boolean;
};

// ── Public types are defined in ./pds.types.ts and re-exported above ─────────

// ── Repository function ──────────────────────────────────────────────────────

export async function getEmployeePdsData(employeeId: string): Promise<EmployeePdsData> {
    const supabase = await createSupabaseServerClient();

    // Fetch the PDS profile first to get the profileId
    const { data: profileRow } = await supabase
        .from("employee_pds_profiles")
        .select("id, status, updated_at, updated_by_user_id")
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle();

    const profileId = (profileRow as { id: string; status: string; updated_at: string; updated_by_user_id: string | null } | null)?.id ?? null;
    const profileStatus = (profileRow as { id: string; status: string } | null)?.status ?? null;
    const profileUpdatedAt = (profileRow as { updated_at: string } | null)?.updated_at ?? null;
    const updatedByUserId = (profileRow as { updated_by_user_id: string | null } | null)?.updated_by_user_id ?? null;

    // Fire user-name lookup and early-exit check simultaneously
    const userNamePromise = updatedByUserId
        ? supabase
            .from("app_users")
            .select("first_name, last_name, email")
            .eq("id", updatedByUserId)
            .maybeSingle()
        : Promise.resolve({ data: null });

    if (!profileId) {
        // Still await the name promise to avoid unhandled rejection — then return early
        await userNamePromise;
        return {
            profileId: null,
            profileStatus: null,
            profileUpdatedAt: null,
            profileUpdatedByName: null,
            personalInfo: null,
            familyBackground: null,
            children: [],
            education: [],
            eligibilities: [],
            workExperiences: [],
            learningDevelopment: [],
            skills: [],
            recognitions: [],
            memberships: [],
            references: [],
            declaration: null,
            governmentId: null,
            voluntaryWork: [],
        };
    }

    // Fetch section data and user name in parallel
    const [
        userNameRes,
        personalInfoRes,
        familyRes,
        childrenRes,
        educationRes,
        eligibilitiesRes,
        workExpRes,
        voluntaryWorkRes,
        learningRes,
        skillsRes,
        recognitionsRes,
        membershipsRes,
        referencesRes,
        declarationRes,
        governmentIdRes,
    ] = await Promise.all([
        userNamePromise,
        supabase
            .from("employee_personal_information")
            .select(
                "id, surname, first_name, middle_name, name_extension, birth_date, birth_place, sex_at_birth, civil_status, height_m, weight_kg, blood_type, gsis_no, pagibig_no, philhealth_no, sss_no, tin, philsys_no, agency_employee_no, citizenship, dual_citizenship_type, dual_citizenship_country, residential_address, permanent_address, telephone_no, mobile_no, email"
            )
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .maybeSingle(),
        supabase
            .from("employee_family_background")
            .select(
                "id, spouse_surname, spouse_first_name, spouse_middle_name, spouse_name_extension, spouse_occupation, spouse_employer_business_name, spouse_business_address, spouse_telephone_no, father_surname, father_first_name, father_middle_name, father_name_extension, mother_maiden_surname, mother_first_name, mother_middle_name"
            )
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .maybeSingle(),
        supabase
            .from("employee_children")
            .select("id, full_name, birth_date, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("sort_order"),
        supabase
            .from("employee_education")
            .select("id, level, school_name, degree_course, period_from_year, period_to_year, highest_level_units, year_graduated, scholarship_honors, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("period_to_year", { ascending: false }),
        supabase
            .from("employee_eligibilities")
            .select("id, eligibility_name, rating, examination_date, examination_place, license_number, license_valid_until, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("examination_date", { ascending: false, nullsFirst: false }),
        supabase
            .from("employee_work_experiences")
            .select("id, date_from, date_to, is_current, position_title, department_agency_office_company, monthly_salary, salary_grade_step, appointment_status, is_government_service, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("is_current", { ascending: false })          // current jobs first
            .order("date_from", { ascending: false, nullsFirst: false }),  // then latest start date
        supabase
            .from("employee_voluntary_work")
            .select("id, organization_name, organization_address, date_from, date_to, hours_count, position_nature_of_work, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("date_from", { ascending: false, nullsFirst: false }),
        supabase
            .from("employee_learning_development")
            .select("id, title, date_from, date_to, hours_count, learning_type, conducted_by, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("date_from", { ascending: false, nullsFirst: false }),
        supabase
            .from("employee_other_skills")
            .select("id, skill_name, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("sort_order"),
        supabase
            .from("employee_recognitions")
            .select("id, recognition_title, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("sort_order"),
        supabase
            .from("employee_memberships")
            .select("id, organization_name, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("sort_order"),
        supabase
            .from("employee_references")
            .select("id, full_name, address, telephone_no, email, sort_order")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .order("sort_order"),
        supabase
            .from("employee_pds_declarations")
            .select("id, answers, explanations, declaration_date, administering_officer")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .maybeSingle(),
        supabase
            .from("employee_government_ids")
            .select("id, id_type, id_number, issued_at, issued_place, issuing_agency, is_primary")
            .eq("pds_profile_id", profileId)
            .is("deleted_at", null)
            .eq("is_primary", true)
            .maybeSingle(),
    ]);

    const pi = personalInfoRes.data as PersonalInfoRow | null;
    const fam = familyRes.data as FamilyRow | null;
    const children = (childrenRes.data ?? []) as ChildRow[];
    const education = (educationRes.data ?? []) as EducationRow[];
    const eligibilities = (eligibilitiesRes.data ?? []) as EligibilityRow[];
    const workExp = (workExpRes.data ?? []) as WorkExpRow[];
    const voluntaryWork = (voluntaryWorkRes.data ?? []) as VoluntaryWorkRow[];
    const learning = (learningRes.data ?? []) as LearningRow[];
    const skills = (skillsRes.data ?? []) as SkillRow[];
    const recognitions = (recognitionsRes.data ?? []) as RecognitionRow[];
    const memberships = (membershipsRes.data ?? []) as MembershipRow[];
    const references = (referencesRes.data ?? []) as ReferenceRow[];
    const declaration = declarationRes.data as DeclarationRow | null;
    const governmentId = governmentIdRes.data as GovernmentIdRow | null;

    let profileUpdatedByName: string | null = null;
    if (userNameRes.data) {
        const u = userNameRes.data as { first_name: string | null; last_name: string | null; email: string };
        profileUpdatedByName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
    }

    return {
        profileId,
        profileStatus,
        profileUpdatedAt,
        profileUpdatedByName,
        personalInfo: pi
            ? {
                id: pi.id,
                surname: pi.surname,
                firstName: pi.first_name,
                middleName: pi.middle_name,
                nameExtension: pi.name_extension,
                birthDate: pi.birth_date,
                birthPlace: pi.birth_place,
                sexAtBirth: pi.sex_at_birth,
                civilStatus: pi.civil_status,
                heightM: pi.height_m,
                weightKg: pi.weight_kg,
                bloodType: pi.blood_type,
                gsisNo: pi.gsis_no,
                pagibigNo: pi.pagibig_no,
                philhealthNo: pi.philhealth_no,
                sssNo: pi.sss_no,
                tin: pi.tin,
                philsysNo: pi.philsys_no,
                agencyEmployeeNo: pi.agency_employee_no,
                citizenship: pi.citizenship,
                dualCitizenshipType: pi.dual_citizenship_type,
                dualCitizenshipCountry: pi.dual_citizenship_country,
                residentialAddress: pi.residential_address,
                permanentAddress: pi.permanent_address,
                telephoneNo: pi.telephone_no,
                mobileNo: pi.mobile_no,
                email: pi.email,
            }
            : null,
        familyBackground: fam
            ? {
                id: fam.id,
                spouseSurname: fam.spouse_surname,
                spouseFirstName: fam.spouse_first_name,
                spouseMiddleName: fam.spouse_middle_name,
                spouseNameExtension: fam.spouse_name_extension,
                spouseOccupation: fam.spouse_occupation,
                spouseEmployerName: fam.spouse_employer_business_name,
                spouseBusinessAddress: fam.spouse_business_address,
                spouseTelephoneNo: fam.spouse_telephone_no,
                fatherSurname: fam.father_surname,
                fatherFirstName: fam.father_first_name,
                fatherMiddleName: fam.father_middle_name,
                fatherNameExtension: fam.father_name_extension,
                motherMaidenSurname: fam.mother_maiden_surname,
                motherFirstName: fam.mother_first_name,
                motherMiddleName: fam.mother_middle_name,
            }
            : null,
        children: children.map((c) => ({
            id: c.id,
            fullName: c.full_name,
            birthDate: c.birth_date,
            sortOrder: c.sort_order,
        })),
        education: education.map((e) => ({
            id: e.id,
            level: e.level,
            schoolName: e.school_name,
            degreeCourse: e.degree_course,
            periodFromYear: e.period_from_year,
            periodToYear: e.period_to_year,
            highestLevelUnits: e.highest_level_units,
            yearGraduated: e.year_graduated,
            scholarshipHonors: e.scholarship_honors,
            sortOrder: e.sort_order,
        })),
        eligibilities: eligibilities.map((e) => ({
            id: e.id,
            eligibilityName: e.eligibility_name,
            rating: e.rating,
            examinationDate: e.examination_date,
            examinationPlace: e.examination_place,
            licenseNumber: e.license_number,
            licenseValidUntil: e.license_valid_until,
            sortOrder: e.sort_order,
        })),
        workExperiences: workExp.map((w) => ({
            id: w.id,
            dateFrom: w.date_from,
            dateTo: w.date_to,
            isCurrent: w.is_current,
            positionTitle: w.position_title,
            departmentAgencyOfficeCompany: w.department_agency_office_company,
            monthlySalary: w.monthly_salary,
            salaryGradeStep: w.salary_grade_step,
            appointmentStatus: w.appointment_status,
            isGovernmentService: w.is_government_service,
            sortOrder: w.sort_order,
        })),
        voluntaryWork: voluntaryWork.map((v) => ({
            id: v.id,
            organizationName: v.organization_name,
            organizationAddress: v.organization_address,
            dateFrom: v.date_from,
            dateTo: v.date_to,
            hoursCount: v.hours_count,
            positionNatureOfWork: v.position_nature_of_work,
            sortOrder: v.sort_order,
        })),
        learningDevelopment: learning.map((l) => ({
            id: l.id,
            title: l.title,
            dateFrom: l.date_from,
            dateTo: l.date_to,
            hoursCount: l.hours_count,
            learningType: l.learning_type,
            conductedBy: l.conducted_by,
            sortOrder: l.sort_order,
        })),
        skills: skills.map((s) => ({
            id: s.id,
            skillName: s.skill_name,
            sortOrder: s.sort_order,
        })),
        recognitions: recognitions.map((r) => ({
            id: r.id,
            recognitionTitle: r.recognition_title,
            sortOrder: r.sort_order,
        })),
        memberships: memberships.map((m) => ({
            id: m.id,
            organizationName: m.organization_name,
            sortOrder: m.sort_order,
        })),
        references: references.map((r) => ({
            id: r.id,
            fullName: r.full_name,
            address: r.address,
            telephoneNo: r.telephone_no,
            email: r.email,
            sortOrder: r.sort_order,
        })),
        declaration: declaration
            ? {
                id: declaration.id,
                answers: declaration.answers,
                explanations: declaration.explanations,
                declarationDate: declaration.declaration_date,
                administeringOfficer: declaration.administering_officer,
            }
            : null,
        governmentId: governmentId
            ? {
                id: governmentId.id,
                idType: governmentId.id_type,
                idNumber: governmentId.id_number,
                issuedAt: governmentId.issued_at,
                issuedPlace: governmentId.issued_place,
                issuingAgency: governmentId.issuing_agency,
                isPrimary: governmentId.is_primary,
            }
            : null,
    };
}

// ── PDS Review queue ─────────────────────────────────────────────────────────

export type PdsReviewItem = {
    profileId: string;
    employeeId: string;
    employeeName: string;
    employeeNo: string;
    campusId: string | null;
    status: string;
    updatedAt: string | null;
};

export async function listPendingPdsReviews(campusId?: string | null): Promise<PdsReviewItem[]> {
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    let query = db
        .from("employee_pds_profiles")
        .select("id, employee_id, campus_id, status, updated_at, employees(first_name, middle_name, last_name, suffix, employee_no)")
        .in("status", ["ready_for_review", "under_hr_review"])
        .is("deleted_at", null)
        .order("updated_at", { ascending: true });

    if (campusId) {
        query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as Array<{
        id: string;
        employee_id: string;
        campus_id: string | null;
        status: string;
        updated_at: string | null;
        employees: { first_name: string | null; middle_name: string | null; last_name: string | null; suffix: string | null; employee_no: string } | null;
    }>).map((row) => {
        const emp = row.employees;
        const employeeName = emp
            ? [emp.first_name, emp.middle_name, emp.last_name, emp.suffix].filter(Boolean).join(" ")
            : row.employee_id;
        return {
            profileId: row.id,
            employeeId: row.employee_id,
            employeeName,
            employeeNo: emp?.employee_no ?? "",
            campusId: row.campus_id,
            status: row.status,
            updatedAt: row.updated_at,
        };
    });
}
