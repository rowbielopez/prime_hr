// ── Education level normalization helpers ────────────────────────────────────
// NOTE: This file must NOT import from server-only modules (e.g. next/headers,
// supabase/server). It is imported by both Server Components and Client
// Components (including pds-edit-form.tsx).

const LEVEL_ORDER: Record<string, number> = {
    elementary: 0,
    secondary: 1,
    vocational: 2,
    college: 3,
    graduate: 4,
};

export const LEVEL_LABELS: Record<string, string> = {
    elementary: "ELEMENTARY",
    secondary: "SECONDARY",
    vocational: "VOCATIONAL COURSE",
    college: "COLLEGE",
    graduate: "GRADUATE STUDIES",
};

export function normalizeEducationLevel(raw: string | null | undefined): string {
    if (!raw) return "college";
    const l = raw.toLowerCase();
    if (l.includes("elementary") || l.includes("primary")) return "elementary";
    if (
        l.includes("secondary") ||
        l.includes("high school") ||
        l.includes("junior high") ||
        l.includes("senior high") ||
        l.includes("jhs") ||
        l.includes("shs")
    ) return "secondary";
    if (
        l.includes("voc") ||
        l.includes("technical") ||
        l.includes("trade") ||
        l.includes("tech-voc")
    ) return "vocational";
    if (
        l.includes("graduate") ||
        l.includes("master") ||
        l.includes("doctoral") ||
        l.includes("doctorate") ||
        l.includes("phd") ||
        l.includes("post-grad") ||
        l.includes("postgrad") ||
        l.includes("juris doctor")
    ) return "graduate";
    if (
        l.includes("college") ||
        l.includes("bachelor") ||
        l.includes("baccalaureate") ||
        l.includes("undergraduate")
    ) return "college";
    return "college";
}

export function getEducationLevelLabel(raw: string | null | undefined): string {
    return LEVEL_LABELS[normalizeEducationLevel(raw)] ?? "COLLEGE";
}

export function sortEducation<T extends { level: string }>(items: T[]): T[] {
    return [...items].sort(
        (a, b) =>
            (LEVEL_ORDER[normalizeEducationLevel(a.level)] ?? 5) -
            (LEVEL_ORDER[normalizeEducationLevel(b.level)] ?? 5)
    );
}

// ── Public types ─────────────────────────────────────────────────────────────

export type PdsPersonalInfo = {
    id: string;
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
    gsisNo: string | null;
    pagibigNo: string | null;
    philhealthNo: string | null;
    sssNo: string | null;
    tin: string | null;
    philsysNo: string | null;
    agencyEmployeeNo: string | null;
    citizenship: string | null;
    dualCitizenshipType: string | null;
    dualCitizenshipCountry: string | null;
    residentialAddress: Record<string, unknown>;
    permanentAddress: Record<string, unknown>;
    telephoneNo: string | null;
    mobileNo: string | null;
    email: string | null;
};

export type PdsFamilyBackground = {
    id: string;
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

export type PdsChild = {
    id: string;
    fullName: string;
    birthDate: string | null;
    sortOrder: number;
};

export type PdsEducation = {
    id: string;
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

export type PdsEligibility = {
    id: string;
    eligibilityName: string;
    rating: string | null;
    examinationDate: string | null;
    examinationPlace: string | null;
    licenseNumber: string | null;
    licenseValidUntil: string | null;
    sortOrder: number;
};

export type PdsWorkExperience = {
    id: string;
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

export type PdsLearningDevelopment = {
    id: string;
    title: string;
    dateFrom: string | null;
    dateTo: string | null;
    hoursCount: number | null;
    learningType: string | null;
    conductedBy: string | null;
    sortOrder: number;
};

export type PdsSkill = {
    id: string;
    skillName: string;
    sortOrder: number;
};

export type PdsRecognition = {
    id: string;
    recognitionTitle: string;
    sortOrder: number;
};

export type PdsMembership = {
    id: string;
    organizationName: string;
    sortOrder: number;
};

export type PdsReference = {
    id: string;
    fullName: string;
    address: string | null;
    telephoneNo: string | null;
    email: string | null;
    sortOrder: number;
};

export type PdsVoluntaryWork = {
    id: string;
    organizationName: string;
    organizationAddress: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    hoursCount: number | null;
    positionNatureOfWork: string | null;
    sortOrder: number;
};

export type PdsDeclaration = {
    id: string;
    answers: Record<string, unknown>;
    explanations: Record<string, unknown>;
    declarationDate: string | null;
    administeringOfficer: string | null;
};

export type PdsGovernmentId = {
    id: string;
    idType: string;
    idNumber: string;
    issuedAt: string | null;
    issuedPlace: string | null;
    issuingAgency: string | null;
    isPrimary: boolean;
};

export type EmployeePdsData = {
    profileId: string | null;
    profileStatus: string | null;
    profileUpdatedAt: string | null;
    profileUpdatedByName: string | null;
    personalInfo: PdsPersonalInfo | null;
    familyBackground: PdsFamilyBackground | null;
    children: PdsChild[];
    education: PdsEducation[];
    eligibilities: PdsEligibility[];
    workExperiences: PdsWorkExperience[];
    voluntaryWork: PdsVoluntaryWork[];
    learningDevelopment: PdsLearningDevelopment[];
    skills: PdsSkill[];
    recognitions: PdsRecognition[];
    memberships: PdsMembership[];
    references: PdsReference[];
    declaration: PdsDeclaration | null;
    governmentId: PdsGovernmentId | null;
};
