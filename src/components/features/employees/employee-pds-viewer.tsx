import type {
    EmployeePdsData,
    PdsChild,
    PdsDeclaration,
    PdsEducation,
    PdsEligibility,
    PdsFamilyBackground,
    PdsGovernmentId,
    PdsLearningDevelopment,
    PdsMembership,
    PdsPersonalInfo,
    PdsRecognition,
    PdsReference,
    PdsSkill,
    PdsWorkExperience,
} from "@/features/employees/repository/pds.repository";
import { getEducationLevelLabel, sortEducation } from "@/features/employees/repository/pds.repository";

// ── Helpers ──────────────────────────────────────────────────────────────────

function dash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${day}/${m}/${d.getUTCFullYear()}`;
}

function formatAddress(addr: Record<string, unknown>): string {
    if (!addr || Object.keys(addr).length === 0) return "—";
    const parts = [
        addr.house_no,
        addr.street,
        addr.barangay,
        addr.city_municipality,
        addr.province,
        addr.zip_code,
        addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
    return <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium">{dash(value)}</dd>
        </div>
    );
}

function SimpleTable({
    headers,
    rows,
    emptyMessage,
}: {
    headers: string[];
    rows: (string | number | null)[][];
    emptyMessage: string;
}) {
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        {headers.map((h) => (
                            <th key={h} className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                            {row.map((cell, j) => (
                                <td key={j} className="py-2 pr-4 align-top">
                                    {dash(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Section renderers ─────────────────────────────────────────────────────────

function PersonalInfoSection({ data }: { data: PdsPersonalInfo }) {
    return (
        <SectionCard title="Personal Information">
            <div className="space-y-4">
                <FieldGrid>
                    <Field label="Surname" value={data.surname} />
                    <Field label="First Name" value={data.firstName} />
                    <Field label="Middle Name" value={data.middleName} />
                    <Field label="Name Extension" value={data.nameExtension} />
                    <Field label="Date of Birth" value={formatDate(data.birthDate)} />
                    <Field label="Place of Birth" value={data.birthPlace} />
                    <Field label="Sex at Birth" value={data.sexAtBirth?.toUpperCase() ?? null} />
                    <Field label="Civil Status" value={data.civilStatus} />
                    <Field label="Height (m)" value={data.heightM} />
                    <Field label="Weight (kg)" value={data.weightKg} />
                    <Field label="Blood Type" value={data.bloodType} />
                    <Field label="Citizenship" value={data.citizenship} />
                    {data.dualCitizenshipType && (
                        <>
                            <Field label="Dual Citizenship Type" value={data.dualCitizenshipType} />
                            <Field label="Dual Citizenship Country" value={data.dualCitizenshipCountry} />
                        </>
                    )}
                    <Field label="Telephone No." value={data.telephoneNo} />
                    <Field label="Mobile No." value={data.mobileNo} />
                    <Field label="Email" value={data.email} />
                </FieldGrid>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Residential Address</p>
                        <p className="mt-0.5 text-sm font-medium">{formatAddress(data.residentialAddress)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Permanent Address</p>
                        <p className="mt-0.5 text-sm font-medium">{formatAddress(data.permanentAddress)}</p>
                    </div>
                </div>
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Government IDs</p>
                    <FieldGrid>
                        <Field label="GSIS No." value={data.gsisNo} />
                        <Field label="Pag-IBIG No." value={data.pagibigNo} />
                        <Field label="PhilHealth No." value={data.philhealthNo} />
                        <Field label="SSS No." value={data.sssNo} />
                        <Field label="TIN" value={data.tin} />
                        <Field label="PhilSys No." value={data.philsysNo} />
                        <Field label="Agency Employee No." value={data.agencyEmployeeNo} />
                    </FieldGrid>
                </div>
            </div>
        </SectionCard>
    );
}

function FamilySection({
    family,
    pdsChildren,
}: {
    family: PdsFamilyBackground | null;
    pdsChildren: PdsChild[];
}) {
    return (
        <SectionCard title="Family Background">
            <div className="space-y-5">
                {family ? (
                    <>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Spouse</p>
                            <FieldGrid>
                                <Field label="Surname" value={family.spouseSurname} />
                                <Field label="First Name" value={family.spouseFirstName} />
                                <Field label="Middle Name" value={family.spouseMiddleName} />
                                <Field label="Name Extension" value={family.spouseNameExtension} />
                                <Field label="Occupation" value={family.spouseOccupation} />
                                <Field label="Employer / Business Name" value={family.spouseEmployerName} />
                                <Field label="Business Address" value={family.spouseBusinessAddress} />
                                <Field label="Telephone No." value={family.spouseTelephoneNo} />
                            </FieldGrid>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Father</p>
                            <FieldGrid>
                                <Field label="Surname" value={family.fatherSurname} />
                                <Field label="First Name" value={family.fatherFirstName} />
                                <Field label="Middle Name" value={family.fatherMiddleName} />
                                <Field label="Name Extension" value={family.fatherNameExtension} />
                            </FieldGrid>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Mother</p>
                            <FieldGrid>
                                <Field label="Maiden Surname" value={family.motherMaidenSurname} />
                                <Field label="First Name" value={family.motherFirstName} />
                                <Field label="Middle Name" value={family.motherMiddleName} />
                            </FieldGrid>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">No family background on record.</p>
                )}

                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Children ({pdsChildren.length})
                    </p>
                    <SimpleTable
                        headers={["Full Name", "Date of Birth"]}
                        rows={pdsChildren.map((c) => [c.fullName, formatDate(c.birthDate)])}
                        emptyMessage="No children on record."
                    />
                </div>
            </div>
        </SectionCard>
    );
}

function EducationSection({ education }: { education: PdsEducation[] }) {
    const sorted = sortEducation(education);
    return (
        <SectionCard title="Educational Background">
            <SimpleTable
                headers={["Level", "School", "Degree / Course", "From", "To", "Graduated", "Honors"]}
                rows={sorted.map((e) => [
                    getEducationLevelLabel(e.level),
                    e.schoolName,
                    e.degreeCourse ?? e.highestLevelUnits,
                    e.periodFromYear,
                    e.periodToYear,
                    e.yearGraduated,
                    e.scholarshipHonors,
                ])}
                emptyMessage="No education records."
            />
        </SectionCard>
    );
}

function EligibilitySection({ eligibilities }: { eligibilities: PdsEligibility[] }) {
    return (
        <SectionCard title="Civil Service Eligibility">
            <SimpleTable
                headers={["Eligibility", "Rating", "Exam Date", "Exam Place", "License No.", "Valid Until"]}
                rows={eligibilities.map((e) => [
                    e.eligibilityName,
                    e.rating,
                    formatDate(e.examinationDate),
                    e.examinationPlace,
                    e.licenseNumber,
                    formatDate(e.licenseValidUntil),
                ])}
                emptyMessage="No eligibility records."
            />
        </SectionCard>
    );
}

function WorkExperienceSection({ workExperiences }: { workExperiences: PdsWorkExperience[] }) {
    return (
        <SectionCard title={`Work Experience (${workExperiences.length})`}>
            <SimpleTable
                headers={["From", "To", "Position", "Organization", "Salary", "SG/Step", "Status", "Gov't"]}
                rows={workExperiences.map((w) => [
                    formatDate(w.dateFrom),
                    w.isCurrent ? "Present" : formatDate(w.dateTo),
                    w.positionTitle,
                    w.departmentAgencyOfficeCompany,
                    w.monthlySalary !== null ? w.monthlySalary.toLocaleString() : null,
                    w.salaryGradeStep,
                    w.appointmentStatus,
                    w.isGovernmentService === true ? "Yes" : w.isGovernmentService === false ? "No" : null,
                ])}
                emptyMessage="No work experience records."
            />
        </SectionCard>
    );
}

function LearningSection({ learning }: { learning: PdsLearningDevelopment[] }) {
    return (
        <SectionCard title={`Learning and Development (${learning.length})`}>
            <SimpleTable
                headers={["Title / Activity", "From", "To", "Hours", "Type", "Conducted By"]}
                rows={learning.map((l) => [
                    l.title,
                    formatDate(l.dateFrom),
                    formatDate(l.dateTo),
                    l.hoursCount,
                    l.learningType,
                    l.conductedBy,
                ])}
                emptyMessage="No learning and development records."
            />
        </SectionCard>
    );
}

function OtherInfoSection({
    skills,
    recognitions,
    memberships,
}: {
    skills: PdsSkill[];
    recognitions: PdsRecognition[];
    memberships: PdsMembership[];
}) {
    return (
        <SectionCard title="Other Information">
            <div className="space-y-5">
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Special Skills / Hobbies ({skills.length})
                    </p>
                    {skills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None on record.</p>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {skills.map((s) => (
                                <li
                                    key={s.id}
                                    className="rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-sm"
                                >
                                    {s.skillName}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Non-Academic Distinctions / Recognitions ({recognitions.length})
                    </p>
                    {recognitions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None on record.</p>
                    ) : (
                        <ul className="space-y-1">
                            {recognitions.map((r) => (
                                <li key={r.id} className="text-sm">
                                    {r.recognitionTitle}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Memberships ({memberships.length})
                    </p>
                    {memberships.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None on record.</p>
                    ) : (
                        <ul className="space-y-1">
                            {memberships.map((m) => (
                                <li key={m.id} className="text-sm">
                                    {m.organizationName}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}

function ReferencesSection({ references }: { references: PdsReference[] }) {
    return (
        <SectionCard title="References (C4)">
            <SimpleTable
                headers={["Name", "Address", "Telephone No.", "Email"]}
                rows={references.map((r) => [r.fullName, r.address, r.telephoneNo, r.email])}
                emptyMessage="No references on record."
            />
        </SectionCard>
    );
}

const DECLARATION_QUESTION_LABELS: Record<string, string> = {
    q34a: "34a. Have you been found guilty of any administrative offense?",
    q34b: "34b. Have you been criminally charged before any court?",
    q34c: "34c. Have you ever been convicted of any crime or violation?",
    q34d: "34d. Have you been separated from the service in the government as a result of an administrative case?",
    q34e: "34e. Have you ever been a candidate in a national or local election held within the last year (except barangay)?",
    q34f: "34f. Have you resigned from the government within the past year to participate in the election?",
    q35: "35. Have you acquired the status of an immigrant or permanent resident of another country?",
    q36: "36. Are you or have you ever been involved in any organization?",
    q37: "37. Have you ever been a member of an organization that advocates violence or overthrow of the government?",
    q38: "38. Have you ever been convicted, imprisoned, or dismissed for moral turpitude?",
    q39: "39. Have you ever been formally charged or found guilty of possession of illegal drugs?",
    q40: "40. Have you ever been found guilty of sexual harassment?",
};

function DeclarationSection({
    declaration,
    governmentId,
}: {
    declaration: PdsDeclaration | null;
    governmentId: PdsGovernmentId | null;
}) {
    return (
        <SectionCard title="Declaration (C4)">
            <div className="space-y-5">
                {declaration ? (
                    <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Legal Questions</p>
                        <dl className="space-y-2 text-sm">
                            {Object.entries(declaration.answers).map(([key, val]) => {
                                const label = DECLARATION_QUESTION_LABELS[key] ?? key;
                                const answer = String(val ?? "").toUpperCase();
                                const explanation = declaration.explanations?.[key];
                                return (
                                    <div key={key} className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2">
                                        <span
                                            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${answer === "YES"
                                                ? "bg-destructive/10 text-destructive"
                                                : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {answer || "—"}
                                        </span>
                                        <div>
                                            <p className="leading-5">{label}</p>
                                            {!!explanation && (
                                                <p className="mt-1 text-xs text-muted-foreground">Details: {String(explanation)}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </dl>
                        {(declaration.declarationDate || declaration.administeringOfficer) && (
                            <FieldGrid>
                                {declaration.declarationDate && (
                                    <Field label="Declaration Date" value={formatDate(declaration.declarationDate)} />
                                )}
                                {declaration.administeringOfficer && (
                                    <Field label="Administering Officer" value={declaration.administeringOfficer} />
                                )}
                            </FieldGrid>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No declaration on record.</p>
                )}

                {governmentId && (
                    <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Government-Issued ID</p>
                        <FieldGrid>
                            <Field label="ID Type" value={governmentId.idType} />
                            <Field label="ID Number" value={governmentId.idNumber} />
                            {governmentId.issuedAt && <Field label="Date Issued" value={formatDate(governmentId.issuedAt)} />}
                            {governmentId.issuedPlace && <Field label="Place Issued" value={governmentId.issuedPlace} />}
                            {governmentId.issuingAgency && <Field label="Issuing Agency" value={governmentId.issuingAgency} />}
                        </FieldGrid>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type EmployeePdsViewerProps = {
    data: EmployeePdsData;
};

function formatUpdatedAt(iso: string | null): string {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function EmployeePdsViewer({ data }: EmployeePdsViewerProps) {
    if (!data.profileId) {
        return (
            <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="text-base font-medium">No PDS profile on record</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    This employee does not have a PDS profile linked. It may not have been migrated or created yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border px-2 py-0.5">
                    Status: <span className="capitalize">{(data.profileStatus ?? "unknown").replace(/_/g, " ")}</span>
                </span>
                <span className="rounded-md border px-2 py-0.5">
                    Work experiences: {data.workExperiences.length}
                </span>
                <span className="rounded-md border px-2 py-0.5">
                    Education: {data.education.length}
                </span>
                <span className="rounded-md border px-2 py-0.5">
                    Eligibilities: {data.eligibilities.length}
                </span>
                <span className="rounded-md border px-2 py-0.5">
                    L&amp;D: {data.learningDevelopment.length}
                </span>
                {data.profileUpdatedAt && (
                    <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                        Last updated: {formatUpdatedAt(data.profileUpdatedAt)}
                        {data.profileUpdatedByName && (
                            <> by <span className="font-medium text-foreground">{data.profileUpdatedByName}</span></>
                        )}
                    </span>
                )}
            </div>

            {data.personalInfo ? (
                <PersonalInfoSection data={data.personalInfo} />
            ) : (
                <SectionCard title="Personal Information">
                    <p className="text-sm text-muted-foreground">No personal information on record.</p>
                </SectionCard>
            )}

            <FamilySection family={data.familyBackground} pdsChildren={data.children} />
            <EducationSection education={data.education} />
            <EligibilitySection eligibilities={data.eligibilities} />
            <WorkExperienceSection workExperiences={data.workExperiences} />
            <LearningSection learning={data.learningDevelopment} />
            <OtherInfoSection
                skills={data.skills}
                recognitions={data.recognitions}
                memberships={data.memberships}
            />
            <ReferencesSection references={data.references} />
            <DeclarationSection declaration={data.declaration} governmentId={data.governmentId} />
        </div>
    );
}
