import type { PdsProfileStatus, PdsSectionDefinition } from "@/features/pds/types";

export const PDS_SECTIONS: PdsSectionDefinition[] = [
    {
        key: "overview",
        label: "Overview",
        description: "Draft status, employee linkage, and generation readiness.",
        sheet: "Workspace",
    },
    {
        key: "personal_information",
        label: "Personal Information",
        description: "Identity, birth, contact, citizenship, address, and government identifiers.",
        sheet: "C1",
    },
    {
        key: "family_background",
        label: "Family Background",
        description: "Spouse, parents, and children records.",
        sheet: "C1",
        repeatable: true,
    },
    {
        key: "educational_background",
        label: "Educational Background",
        description: "Schools, degrees, years, highest levels, and honors.",
        sheet: "C1",
        repeatable: true,
    },
    {
        key: "civil_service_eligibility",
        label: "Civil Service Eligibility",
        description: "Eligibility, rating, examination, and license details.",
        sheet: "C2",
        repeatable: true,
    },
    {
        key: "work_experience",
        label: "Work Experience",
        description: "Employment history, salary grade, appointment status, and government service flags.",
        sheet: "C2",
        repeatable: true,
    },
    {
        key: "voluntary_work",
        label: "Voluntary Work",
        description: "Civic, NGO, and voluntary service records.",
        sheet: "C3",
        repeatable: true,
    },
    {
        key: "learning_development",
        label: "Learning and Development",
        description: "Training, seminars, learning type, hours, and sponsors.",
        sheet: "C3",
        repeatable: true,
    },
    {
        key: "other_information",
        label: "Other Information",
        description: "Skills, recognitions, and memberships.",
        sheet: "C3",
        repeatable: true,
    },
    {
        key: "references",
        label: "References",
        description: "Character references and contact details.",
        sheet: "C4",
        repeatable: true,
    },
    {
        key: "declaration",
        label: "Declaration",
        description: "Legal questions, government ID, signature, and oath details.",
        sheet: "C4",
    },
    {
        key: "review_generate",
        label: "Review and Generate",
        description: "Validation summary, HR verification, and CSC PDS 2025 export.",
        sheet: "Workspace",
    },
];

export const PDS_STATUS_LABELS: Record<PdsProfileStatus, string> = {
    not_started: "Not Started",
    draft: "Draft",
    incomplete: "Incomplete",
    ready_for_review: "Ready for Review",
    under_hr_review: "Under HR Review",
    returned_for_correction: "Returned for Correction",
    verified: "Verified",
    generated: "Generated",
};
