import { notFound } from "next/navigation";
import Link from "next/link";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeePdsData } from "@/features/employees/repository/pds.repository";
import type {
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
    PdsVoluntaryWork,
    PdsWorkExperience,
} from "@/features/employees/repository/pds.repository";
import { normalizeEducationLevel } from "@/features/employees/repository/pds.repository";
import { PrintTriggerButton } from "./print-trigger-button";

type PageProps = { params: Promise<{ employeeId: string }> };

function v(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === "") return "";
    return String(val);
}

function fd(val: string | null | undefined): string {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${day}/${m}/${d.getUTCFullYear()}`;
}

// Style constants matching CS Form 212 Revised 2025
const T: React.CSSProperties = { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" };
const SH: React.CSSProperties = { background: "#404040", color: "#fff", fontWeight: "bold", fontStyle: "italic", fontSize: 8, padding: "3px 5px", border: "0.5px solid #666" };
const LB: React.CSSProperties = { background: "#D9D9D9", fontSize: 7, padding: "1px 3px", border: "0.5px solid #999", verticalAlign: "top" };
const SL: React.CSSProperties = { background: "#f0f0f0", fontSize: 6.5, padding: "1px 3px", border: "0.5px solid #bbb", verticalAlign: "top", color: "#555" };
const VL: React.CSSProperties = { background: "#fff", fontSize: 8, padding: "2px 4px", border: "0.5px solid #999", verticalAlign: "top" };
const TH: React.CSSProperties = { background: "#595959", color: "#fff", fontWeight: "bold", fontSize: 7, padding: "2px 3px", border: "0.5px solid #666", textAlign: "center", verticalAlign: "middle" };
const TD: React.CSSProperties = { background: "#fff", fontSize: 7.5, padding: "2px 3px", border: "0.5px solid #999", verticalAlign: "top" };

function SignatureRow() {
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup><col style={{ width: "15%" }} /><col style={{ width: "55%" }} /><col style={{ width: "10%" }} /><col style={{ width: "20%" }} /></colgroup>
            <tbody>
                <tr>
                    <td style={{ ...LB, fontWeight: "bold", fontStyle: "italic", fontSize: 8, textAlign: "center" }}>SIGNATURE</td>
                    <td style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(wet signature/e-signature/digital certificate)</td>
                    <td style={{ ...LB, fontWeight: "bold", fontStyle: "italic", fontSize: 8, textAlign: "center" }}>DATE</td>
                    <td style={VL}></td>
                </tr>
            </tbody>
        </table>
    );
}

function addr(obj: Record<string, unknown>, key: string): string {
    const val = obj[key];
    if (val === null || val === undefined) return "";
    return String(val);
}

// Section I
function PersonalInfoSection({ pi }: { pi: PdsPersonalInfo | null }) {
    const ra = (pi?.residentialAddress ?? {}) as Record<string, unknown>;
    const pa = (pi?.permanentAddress ?? {}) as Record<string, unknown>;
    const dualType = pi?.dualCitizenshipType ?? "";
    const dualCountry = pi?.dualCitizenshipCountry ?? "";
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "18%" }} /><col style={{ width: "17%" }} />
                <col style={{ width: "15%" }} /><col style={{ width: "18%" }} />
                <col style={{ width: "15%" }} /><col style={{ width: "17%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={6} style={SH}>I.  PERSONAL INFORMATION</td></tr>
                <tr><td style={LB}>1. SURNAME</td><td colSpan={5} style={VL}>{v(pi?.surname)}</td></tr>
                <tr>
                    <td style={LB}>2. FIRST NAME</td><td colSpan={3} style={VL}>{v(pi?.firstName)}</td>
                    <td style={LB}>NAME EXTENSION (JR., SR.)</td><td style={VL}>{v(pi?.nameExtension)}</td>
                </tr>
                <tr><td style={LB}>MIDDLE NAME</td><td colSpan={5} style={VL}>{v(pi?.middleName)}</td></tr>
                <tr>
                    <td rowSpan={2} style={LB}>3. DATE OF BIRTH{"\n"}(dd/mm/yyyy)</td>
                    <td rowSpan={2} style={VL}>{fd(pi?.birthDate)}</td>
                    <td colSpan={4} style={LB}>16. CITIZENSHIP</td>
                </tr>
                <tr>
                    <td colSpan={2} style={VL}>
                        {dualType ? `${v(pi?.citizenship)} (Dual – ${dualType}${dualCountry ? `: ${dualCountry}` : ""})` : v(pi?.citizenship) || "Filipino"}
                    </td>
                    <td style={{ ...LB, fontSize: 6.5 }}>If dual, indicate country:</td>
                    <td style={VL}>{dualCountry}</td>
                </tr>
                <tr><td style={LB}>4. PLACE OF BIRTH</td><td colSpan={5} style={VL}>{v(pi?.birthPlace)}</td></tr>
                <tr>
                    <td style={LB}>5. SEX AT BIRTH</td><td style={VL}>{v(pi?.sexAtBirth)?.toUpperCase()}</td>
                    <td colSpan={4} style={LB}>17. RESIDENTIAL ADDRESS</td>
                </tr>
                <tr>
                    <td rowSpan={3} style={LB}>6. CIVIL STATUS</td><td rowSpan={3} style={VL}>{v(pi?.civilStatus)}</td>
                    <td style={SL}>House/Block/Lot No.</td><td style={VL}>{addr(ra, "house_no")}</td>
                    <td style={SL}>Street</td><td style={VL}>{addr(ra, "street")}</td>
                </tr>
                <tr>
                    <td style={SL}>Subdivision/Village</td><td style={VL}>{addr(ra, "subdivision_village") || addr(ra, "subdivision")}</td>
                    <td style={SL}>Barangay</td><td style={VL}>{addr(ra, "barangay")}</td>
                </tr>
                <tr>
                    <td style={SL}>City/Municipality</td><td style={VL}>{addr(ra, "city_municipality")}</td>
                    <td style={SL}>Province</td><td style={VL}>{addr(ra, "province")}</td>
                </tr>
                <tr>
                    <td style={LB}>7. HEIGHT (m)</td><td style={VL}>{v(pi?.heightM)}</td>
                    <td style={LB}>ZIP CODE</td><td colSpan={3} style={VL}>{addr(ra, "zip_code")}</td>
                </tr>
                <tr>
                    <td style={LB}>8. WEIGHT (kg)</td><td style={VL}>{v(pi?.weightKg)}</td>
                    <td colSpan={4} style={LB}>18. PERMANENT ADDRESS</td>
                </tr>
                <tr>
                    <td rowSpan={3} style={LB}>9. BLOOD TYPE</td><td rowSpan={3} style={VL}>{v(pi?.bloodType)}</td>
                    <td style={SL}>House/Block/Lot No.</td><td style={VL}>{addr(pa, "house_no")}</td>
                    <td style={SL}>Street</td><td style={VL}>{addr(pa, "street")}</td>
                </tr>
                <tr>
                    <td style={SL}>Subdivision/Village</td><td style={VL}>{addr(pa, "subdivision_village") || addr(pa, "subdivision")}</td>
                    <td style={SL}>Barangay</td><td style={VL}>{addr(pa, "barangay")}</td>
                </tr>
                <tr>
                    <td style={SL}>City/Municipality</td><td style={VL}>{addr(pa, "city_municipality")}</td>
                    <td style={SL}>Province</td><td style={VL}>{addr(pa, "province")}</td>
                </tr>
                <tr>
                    <td style={LB}>10. UMID ID NO.</td><td style={VL}>{v(pi?.gsisNo)}</td>
                    <td style={LB}>ZIP CODE</td><td colSpan={3} style={VL}>{addr(pa, "zip_code")}</td>
                </tr>
                <tr>
                    <td style={LB}>11. PAG-IBIG ID NO.</td><td style={VL}>{v(pi?.pagibigNo)}</td>
                    <td style={LB}>19. TELEPHONE NO.</td><td colSpan={3} style={VL}>{v(pi?.telephoneNo)}</td>
                </tr>
                <tr>
                    <td style={LB}>12. PHILHEALTH NO.</td><td style={VL}>{v(pi?.philhealthNo)}</td>
                    <td style={LB}>20. MOBILE NO.</td><td colSpan={3} style={VL}>{v(pi?.mobileNo)}</td>
                </tr>
                <tr>
                    <td style={LB}>13. PhilSys Number (PSN):</td><td style={VL}>{v(pi?.philsysNo)}</td>
                    <td style={LB}>21. E-MAIL ADDRESS (if any)</td><td colSpan={3} style={VL}>{v(pi?.email)}</td>
                </tr>
                <tr><td style={LB}>14. TIN NO.</td><td style={VL}>{v(pi?.tin)}</td><td colSpan={4} style={VL}></td></tr>
                <tr><td style={LB}>15. AGENCY EMPLOYEE NO.</td><td style={VL}>{v(pi?.agencyEmployeeNo)}</td><td colSpan={4} style={VL}></td></tr>
            </tbody>
        </table>
    );
}

// Section II
function FamilySection({ fam, pdsChildren }: { fam: PdsFamilyBackground | null; pdsChildren: PdsChild[] }) {
    const ch = (i: number) => pdsChildren[i];
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "17%" }} /><col style={{ width: "17%" }} />
                <col style={{ width: "16%" }} /><col style={{ width: "32%" }} /><col style={{ width: "18%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={5} style={SH}>II.  FAMILY BACKGROUND</td></tr>
                <tr>
                    <td colSpan={3} style={LB}>22. SPOUSE&apos;S SURNAME</td>
                    <td style={LB}>23. NAME of CHILDREN (Write full name and list all)</td>
                    <td style={LB}>DATE OF BIRTH (dd/mm/yyyy)</td>
                </tr>
                {([
                    ["SURNAME", v(fam?.spouseSurname), 0],
                    ["FIRST NAME", v(fam?.spouseFirstName), 1],
                    ["MIDDLE NAME", v(fam?.spouseMiddleName), 2],
                    ["OCCUPATION", v(fam?.spouseOccupation), 3],
                    ["EMPLOYER/BUSINESS NAME", v(fam?.spouseEmployerName), 4],
                    ["BUSINESS ADDRESS", v(fam?.spouseBusinessAddress), 5],
                    ["TELEPHONE NO.", v(fam?.spouseTelephoneNo), 6],
                ] as [string, string, number][]).map(([lbl, val, ci]) => (
                    <tr key={lbl}>
                        <td colSpan={3} style={VL}><span style={{ ...LB, padding: "0 2px", marginRight: 3 }}>{lbl}</span>{val}</td>
                        <td style={VL}>{ch(ci)?.fullName ?? ""}</td>
                        <td style={VL}>{fd(ch(ci)?.birthDate)}</td>
                    </tr>
                ))}
                {pdsChildren.slice(7).map((c) => (
                    <tr key={c.id}>
                        <td colSpan={3} style={VL}></td>
                        <td style={VL}>{c.fullName}</td>
                        <td style={VL}>{fd(c.birthDate)}</td>
                    </tr>
                ))}
                <tr>
                    <td colSpan={3} style={LB}>24. FATHER&apos;S SURNAME</td>
                    <td colSpan={2} style={VL}>{v(fam?.fatherSurname)}</td>
                </tr>
                <tr>
                    <td style={LB}>FIRST NAME</td><td colSpan={2} style={VL}>{v(fam?.fatherFirstName)}</td>
                    <td style={LB}>NAME EXTENSION (JR., SR.)</td><td style={VL}>{v(fam?.fatherNameExtension)}</td>
                </tr>
                <tr><td style={LB}>MIDDLE NAME</td><td colSpan={4} style={VL}>{v(fam?.fatherMiddleName)}</td></tr>
                <tr>
                    <td colSpan={3} style={LB}>25. MOTHER&apos;S MAIDEN NAME</td>
                    <td colSpan={2} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic" }}>(Continue on separate sheet if necessary)</td>
                </tr>
                <tr><td style={LB}>SURNAME</td><td colSpan={4} style={VL}>{v(fam?.motherMaidenSurname)}</td></tr>
                <tr><td style={LB}>FIRST NAME</td><td colSpan={4} style={VL}>{v(fam?.motherFirstName)}</td></tr>
                <tr><td style={LB}>MIDDLE NAME</td><td colSpan={4} style={VL}>{v(fam?.motherMiddleName)}</td></tr>
            </tbody>
        </table>
    );
}

// Section III
function EducationSection({ education }: { education: PdsEducation[] }) {
    const levels = [
        { label: "ELEMENTARY", key: "elementary" },
        { label: "SECONDARY", key: "secondary" },
        { label: "VOCATIONAL / TRADE COURSE", key: "vocational" },
        { label: "COLLEGE", key: "college" },
        { label: "GRADUATE STUDIES", key: "graduate" },
    ];
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "11%" }} /><col style={{ width: "22%" }} /><col style={{ width: "20%" }} />
                <col style={{ width: "7%" }} /><col style={{ width: "7%" }} />
                <col style={{ width: "13%" }} /><col style={{ width: "9%" }} /><col style={{ width: "11%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={8} style={SH}>III.  EDUCATIONAL BACKGROUND</td></tr>
                <tr>
                    <th style={TH}>26.<br />LEVEL</th>
                    <th style={TH}>NAME OF SCHOOL<br />(Write in full)</th>
                    <th style={TH}>BASIC EDUCATION/<br />DEGREE/COURSE<br />(Write in full)</th>
                    <th style={TH} colSpan={2}>PERIOD OF<br />ATTENDANCE<br />From / To</th>
                    <th style={TH}>HIGHEST LEVEL/<br />UNITS EARNED<br />(if not graduated)</th>
                    <th style={TH}>YEAR<br />GRADUATED</th>
                    <th style={TH}>SCHOLARSHIP/<br />ACADEMIC<br />HONORS RECEIVED</th>
                </tr>
                {levels.map(({ label, key }) => {
                    const e = education.find((x) => normalizeEducationLevel(x.level) === key);
                    return (
                        <tr key={key}>
                            <td style={{ ...TD, background: "#E8E8E8", fontWeight: "bold", fontSize: 7 }}>{label}</td>
                            <td style={TD}>{v(e?.schoolName)}</td>
                            <td style={TD}>{v(e?.degreeCourse)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{v(e?.periodFromYear)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{v(e?.periodToYear)}</td>
                            <td style={TD}>{v(e?.highestLevelUnits)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{v(e?.yearGraduated)}</td>
                            <td style={TD}>{v(e?.scholarshipHonors)}</td>
                        </tr>
                    );
                })}
                <tr><td colSpan={8} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section IV
function EligibilitySection({ eligibilities }: { eligibilities: PdsEligibility[] }) {
    const rows = Math.max(eligibilities.length, 10);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "35%" }} /><col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "12%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={6} style={SH}>IV.  CIVIL SERVICE ELIGIBILITY</td></tr>
                <tr>
                    <th style={TH}>27. CES/CSEE/CAREER SERVICE/RA 1080 (BOARD/BAR)/<br />UNDER SPECIAL LAWS/CATEGORY III IV<br />ELIGIBILITY and ELIGIBILITIES FOR UNIFORMED PERSONNEL</th>
                    <th style={TH}>RATING<br />(If Applicable)</th>
                    <th style={TH}>DATE OF<br />EXAMINATION /<br />CONFERMENT</th>
                    <th style={TH}>PLACE OF EXAMINATION /<br />CONFERMENT</th>
                    <th style={TH}>LICENSE<br />NUMBER</th>
                    <th style={TH}>LICENSE<br />VALID UNTIL</th>
                </tr>
                {Array.from({ length: rows }).map((_, i) => {
                    const e = eligibilities[i];
                    return (
                        <tr key={i}>
                            <td style={{ ...TD, height: 14 }}>{v(e?.eligibilityName)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{v(e?.rating)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{fd(e?.examinationDate)}</td>
                            <td style={TD}>{v(e?.examinationPlace)}</td>
                            <td style={TD}>{v(e?.licenseNumber)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{fd(e?.licenseValidUntil)}</td>
                        </tr>
                    );
                })}
                <tr><td colSpan={6} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section V
function WorkExpSection({ workExperiences }: { workExperiences: PdsWorkExperience[] }) {
    const rows = Math.max(workExperiences.length, 20);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "9%" }} /><col style={{ width: "9%" }} />
                <col style={{ width: "22%" }} /><col style={{ width: "28%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "11%" }} /><col style={{ width: "9%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={7} style={SH}>V.  WORK EXPERIENCE</td></tr>
                <tr><td colSpan={7} style={{ ...LB, fontSize: 7, fontStyle: "italic", color: "#c00" }}>(Include private employment. Start from your recent work.) Description of duties should be indicated in the attached Work Experience Sheet.</td></tr>
                <tr>
                    <th style={TH} colSpan={2}>28. INCLUSIVE DATES<br />(dd/mm/yyyy)</th>
                    <th style={TH} rowSpan={2}>POSITION TITLE<br />(Write in full/<br />Do not abbreviate)</th>
                    <th style={TH} rowSpan={2}>DEPARTMENT / AGENCY / OFFICE / COMPANY<br />(Write in full/Do not abbreviate)</th>
                    <th style={TH} rowSpan={2}>MONTHLY<br />SALARY</th>
                    <th style={TH} rowSpan={2}>STATUS OF<br />APPOINTMENT</th>
                    <th style={TH} rowSpan={2}>GOVT<br />SERVICE</th>
                </tr>
                <tr><th style={TH}>From</th><th style={TH}>To</th></tr>
                {Array.from({ length: rows }).map((_, i) => {
                    const w = workExperiences[i];
                    return (
                        <tr key={i}>
                            <td style={{ ...TD, height: 14, textAlign: "center" }}>{fd(w?.dateFrom)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{w?.isCurrent ? "PRESENT" : fd(w?.dateTo)}</td>
                            <td style={TD}>{v(w?.positionTitle)}</td>
                            <td style={TD}>{v(w?.departmentAgencyOfficeCompany)}</td>
                            <td style={{ ...TD, textAlign: "right" }}>{w?.monthlySalary != null ? w.monthlySalary.toLocaleString("en-PH") : ""}</td>
                            <td style={TD}>{v(w?.appointmentStatus)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{w?.isGovernmentService === true ? "Y" : w?.isGovernmentService === false ? "N" : ""}</td>
                        </tr>
                    );
                })}
                <tr><td colSpan={7} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section VI
function VoluntaryWorkSection({ voluntaryWork }: { voluntaryWork: PdsVoluntaryWork[] }) {
    const rows = Math.max(voluntaryWork.length, 7);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "35%" }} /><col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "29%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={5} style={SH}>VI.  VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATIONS</td></tr>
                <tr>
                    <th style={TH} rowSpan={2}>29. NAME &amp; ADDRESS OF ORGANIZATION<br />(Write in full)</th>
                    <th style={TH} colSpan={2}>INCLUSIVE DATES (dd/mm/yyyy)</th>
                    <th style={TH} rowSpan={2}>NUMBER<br />OF HOURS</th>
                    <th style={TH} rowSpan={2}>POSITION / NATURE OF WORK</th>
                </tr>
                <tr><th style={TH}>From</th><th style={TH}>To</th></tr>
                {Array.from({ length: rows }).map((_, i) => {
                    const vw = voluntaryWork[i];
                    const orgFull = vw ? [vw.organizationName, vw.organizationAddress].filter(Boolean).join(", ") : "";
                    return (
                        <tr key={i}><td style={{ ...TD, height: 14 }}>{orgFull}</td><td style={{ ...TD, textAlign: "center" }}>{fd(vw?.dateFrom)}</td><td style={{ ...TD, textAlign: "center" }}>{fd(vw?.dateTo)}</td><td style={{ ...TD, textAlign: "center" }}>{v(vw?.hoursCount)}</td><td style={TD}>{v(vw?.positionNatureOfWork)}</td></tr>
                    );
                })}
                <tr><td colSpan={5} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section VII
function LearningSection({ learning }: { learning: PdsLearningDevelopment[] }) {
    const rows = Math.max(learning.length, 20);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "32%" }} /><col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} /><col style={{ width: "9%" }} />
                <col style={{ width: "16%" }} /><col style={{ width: "23%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={6} style={SH}>VII.  LEARNING AND DEVELOPMENT (L&amp;D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED</td></tr>
                <tr>
                    <th style={TH} rowSpan={2}>30. TITLE OF LEARNING AND DEVELOPMENT<br />INTERVENTIONS/TRAINING PROGRAMS<br />(Write in full)</th>
                    <th style={TH} colSpan={2}>INCLUSIVE DATES OF ATTENDANCE<br />(dd/mm/yyyy)</th>
                    <th style={TH} rowSpan={2}>NUMBER<br />OF HOURS</th>
                    <th style={TH} rowSpan={2}>Type of L&amp;D<br />(Managerial/<br />Supervisory/<br />Technical/etc.)</th>
                    <th style={TH} rowSpan={2}>CONDUCTED/SPONSORED BY<br />(Write in full)</th>
                </tr>
                <tr><th style={TH}>From</th><th style={TH}>To</th></tr>
                {Array.from({ length: rows }).map((_, i) => {
                    const l = learning[i];
                    return (
                        <tr key={i}>
                            <td style={{ ...TD, height: 14 }}>{v(l?.title)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{fd(l?.dateFrom)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{fd(l?.dateTo)}</td>
                            <td style={{ ...TD, textAlign: "center" }}>{v(l?.hoursCount)}</td>
                            <td style={TD}>{v(l?.learningType)}</td>
                            <td style={TD}>{v(l?.conductedBy)}</td>
                        </tr>
                    );
                })}
                <tr><td colSpan={6} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section VIII
function OtherInfoSection({ skills, recognitions, memberships }: { skills: PdsSkill[]; recognitions: PdsRecognition[]; memberships: PdsMembership[] }) {
    const rows = Math.max(skills.length, recognitions.length, memberships.length, 8);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup><col style={{ width: "33%" }} /><col style={{ width: "34%" }} /><col style={{ width: "33%" }} /></colgroup>
            <tbody>
                <tr><td colSpan={3} style={SH}>VIII.  OTHER INFORMATION</td></tr>
                <tr>
                    <th style={TH}>31. SPECIAL SKILLS and HOBBIES</th>
                    <th style={TH}>32. NON-ACADEMIC DISTINCTIONS / RECOGNITION<br />(Write in full)</th>
                    <th style={TH}>33. MEMBERSHIP IN ASSOCIATION/ORGANIZATION<br />(Write in full)</th>
                </tr>
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td style={{ ...TD, height: 14 }}>{v(skills[i]?.skillName)}</td>
                        <td style={TD}>{v(recognitions[i]?.recognitionTitle)}</td>
                        <td style={TD}>{v(memberships[i]?.organizationName)}</td>
                    </tr>
                ))}
                <tr><td colSpan={3} style={{ ...VL, fontSize: 7, color: "#c00", fontStyle: "italic", textAlign: "center" }}>(Continue on separate sheet if necessary)</td></tr>
            </tbody>
        </table>
    );
}

// Section IX – References (C4)
function ReferencesSection({ references }: { references: PdsReference[] }) {
    const rows = Math.max(references.length, 3);
    return (
        <table style={{ ...T, marginBottom: 0 }}>
            <colgroup>
                <col style={{ width: "34%" }} /><col style={{ width: "40%" }} /><col style={{ width: "26%" }} />
            </colgroup>
            <tbody>
                <tr><td colSpan={3} style={SH}>IX.  CHARACTER REFERENCES</td></tr>
                <tr><td colSpan={3} style={{ ...LB, fontSize: 7, fontStyle: "italic" }}>(Write at least 3 people who are not related to you. Indicate full name, address, and phone number.)</td></tr>
                <tr>
                    <th style={TH}>34. NAME</th>
                    <th style={TH}>ADDRESS</th>
                    <th style={TH}>TEL. NO.</th>
                </tr>
                {Array.from({ length: rows }).map((_, i) => {
                    const r = references[i];
                    return (
                        <tr key={i}>
                            <td style={{ ...TD, height: 16 }}>{v(r?.fullName)}</td>
                            <td style={TD}>{v(r?.address)}</td>
                            <td style={TD}>{v(r?.telephoneNo)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

// Section X – Declaration (C4)
function DeclarationSection({ declaration, governmentId }: { declaration: PdsDeclaration | null; governmentId: PdsGovernmentId | null }) {
    const questions = [
        { key: "q34a", label: "34a. Have you been found guilty of any administrative offense?" },
        { key: "q34b", label: "34b. Have you been criminally charged before any court?" },
        { key: "q34c", label: "34c. Have you ever been convicted of any crime or violation?" },
        { key: "q34d", label: "34d. Have you been separated from the service in the government as a result of an administrative case?" },
        { key: "q34e", label: "34e. Have you ever been a candidate in a national or local election (except barangay)?" },
        { key: "q34f", label: "34f. Have you resigned from the government service in the last year to participate in the election?" },
        { key: "q35", label: "35. Have you acquired the status of an immigrant or permanent resident of another country?" },
        { key: "q36", label: "36. Pursuant to CSC MC 10, s. 2020, have you been or are you currently involved in any organization/group?" },
        { key: "q37", label: "37. Have you ever been a member of an organization that advocates violence or overthrow of the government?" },
        { key: "q38", label: "38. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office?" },
        { key: "q39", label: "39. Have you ever been formally charged or found guilty of possession/use/distribution of illegal drugs?" },
        { key: "q40", label: "40. Have you ever been found guilty of, or is there a pending criminal case for an offense involving moral turpitude?" },
    ];
    const answers = declaration?.answers ?? {};
    const explanations = declaration?.explanations ?? {};
    return (
        <>
            <table style={{ ...T, marginBottom: 0 }}>
                <colgroup>
                    <col style={{ width: "70%" }} /><col style={{ width: "9%" }} /><col style={{ width: "9%" }} /><col style={{ width: "12%" }} />
                </colgroup>
                <tbody>
                    <tr><td colSpan={4} style={SH}>X.  DECLARATION</td></tr>
                    <tr><td colSpan={4} style={{ ...LB, fontSize: 7, fontStyle: "italic" }}>Questions 34 to 40. Tick the appropriate boxes and state details if necessary.</td></tr>
                    <tr>
                        <th style={TH}>QUESTIONS</th>
                        <th style={TH}>YES</th>
                        <th style={TH}>NO</th>
                        <th style={TH}>DETAILS (if YES)</th>
                    </tr>
                    {questions.map(({ key, label }) => {
                        const ans = String(answers[key] ?? "").toUpperCase();
                        const expl = String(explanations[key] ?? "");
                        return (
                            <tr key={key}>
                                <td style={{ ...TD, fontSize: 7 }}>{label}</td>
                                <td style={{ ...TD, textAlign: "center", fontWeight: "bold" }}>{ans === "YES" ? "✓" : ""}</td>
                                <td style={{ ...TD, textAlign: "center", fontWeight: "bold" }}>{ans === "NO" ? "✓" : ""}</td>
                                <td style={{ ...TD, fontSize: 7 }}>{expl}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <table style={{ ...T, marginBottom: 0 }}>
                <colgroup>
                    <col style={{ width: "30%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /><col style={{ width: "30%" }} />
                </colgroup>
                <tbody>
                    <tr>
                        <td style={LB}>Government-Issued ID</td>
                        <td style={VL}>{v(governmentId?.idType)}</td>
                        <td style={LB}>ID/License/Passport No.</td>
                        <td style={VL}>{v(governmentId?.idNumber)}</td>
                    </tr>
                    <tr>
                        <td style={LB}>Date/Place of Issuance</td>
                        <td style={VL}>{governmentId?.issuedAt ? fd(governmentId.issuedAt) : ""}</td>
                        <td style={LB}>Place of Issuance</td>
                        <td style={VL}>{v(governmentId?.issuedPlace)}</td>
                    </tr>
                </tbody>
            </table>
            <table style={{ ...T, marginBottom: 0 }}>
                <tbody>
                    <tr>
                        <td style={{ ...VL, width: "55%", fontSize: 7, fontStyle: "italic" }}>
                            I DECLARE under oath that I have personally accomplished this Personal Data Sheet which is a true, correct and complete statement pursuant to the provisions of pertinent laws, rules and regulations of the Republic of the Philippines. I authorize the agency to verify/validate the contents stated herein. I agree that any misrepresentation made in this document and its attachments shall cause the filing of administrative/criminal case/s against me.
                        </td>
                        <td style={{ ...LB, width: "45%", textAlign: "center", fontStyle: "italic" }}>
                            <div style={{ minHeight: 40 }}></div>
                            <div style={{ borderTop: "0.5px solid #999", paddingTop: 2 }}>Signature (Sign over Printed Name)</div>
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...LB, fontSize: 7 }}>Subscribed and sworn to before me this _____ day of _____________ 20___, at _________________________.</td>
                        <td style={{ ...LB, textAlign: "center", fontSize: 7 }}>
                            {v(declaration?.administeringOfficer) || "Administering Officer"}<br />
                            {v(declaration?.declarationDate) ? fd(declaration!.declarationDate) : "Date"}
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    );
}
export default async function EmployeePdsPrintPage({ params }: PageProps) {
    const { employeeId } = await params;
    await withProtectedPageMeta({ pathname: "/employees", permission: "pds.generate" });
    const [employee, pdsData] = await Promise.all([getEmployeeById(employeeId), getEmployeePdsData(employeeId)]);
    if (!employee) notFound();
    const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix].filter(Boolean).join(" ") || employee.employeeNo;
    const outer: React.CSSProperties = { maxWidth: 860, margin: "0 auto", fontFamily: "Arial, sans-serif", color: "#111", fontSize: 8 };
    return (
        <div>
            <div className="pds-print-controls" style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <PrintTriggerButton />
                <Link href={`/employees/${employeeId}/pds`} style={{ padding: "5px 14px", background: "#e2e8f0", color: "#333", borderRadius: 4, fontSize: 13, textDecoration: "none" }}>← Back</Link>
            </div>
            <div style={outer}>
                {/* Form header */}
                <table style={{ ...T, marginBottom: 0 }}>
                    <tbody>
                        <tr>
                            <td style={{ width: "15%", fontSize: 7.5, fontWeight: "bold", border: "0.5px solid #999", padding: "3px 5px", verticalAlign: "top" }}>CS Form No. 212<br />Revised 2025</td>
                            <td style={{ textAlign: "center", border: "0.5px solid #999", padding: "4px", fontSize: 16, fontWeight: "bold", letterSpacing: 2 }}>PERSONAL DATA SHEET</td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ fontSize: 7, fontStyle: "italic", padding: "3px 5px", border: "0.5px solid #999", borderTop: "none" }}>
                    <strong>WARNING:</strong> Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person concerned.<br />
                    <strong>READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORM.</strong><br />
                    Print legibly if accomplished through own handwriting. Tick appropriate boxes (☐) and use separate sheet if necessary. Indicate N/A if not applicable. <strong>DO NOT ABBREVIATE.</strong>
                </div>

                {/* PAGE 1 */}
                <PersonalInfoSection pi={pdsData.personalInfo} />
                <FamilySection fam={pdsData.familyBackground} pdsChildren={pdsData.children} />
                <EducationSection education={pdsData.education} />
                <SignatureRow />

                {/* PAGE 2 */}
                <div style={{ pageBreakBefore: "always" }} />
                <EligibilitySection eligibilities={pdsData.eligibilities} />
                <WorkExpSection workExperiences={pdsData.workExperiences} />
                <SignatureRow />

                {/* PAGE 3 */}
                <div style={{ pageBreakBefore: "always" }} />
                <VoluntaryWorkSection voluntaryWork={pdsData.voluntaryWork} />
                <LearningSection learning={pdsData.learningDevelopment} />
                <OtherInfoSection skills={pdsData.skills} recognitions={pdsData.recognitions} memberships={pdsData.memberships} />
                <SignatureRow />

                {/* PAGE 4 */}
                <div style={{ pageBreakBefore: "always" }} />
                <ReferencesSection references={pdsData.references} />
                <DeclarationSection declaration={pdsData.declaration} governmentId={pdsData.governmentId} />
                <SignatureRow />

                <div style={{ marginTop: 4, fontSize: 6.5, color: "#888", textAlign: "right" }}>
                    {(() => {
                        const now = new Date();
                        const d = String(now.getDate()).padStart(2, "0");
                        const m = String(now.getMonth() + 1).padStart(2, "0");
                        return `CS FORM 212 (Revised 2025) · Generated by CSU PRIME-HR · ${d}/${m}/${now.getFullYear()}`;
                    })()}
                </div>
            </div>
        </div>
    );
}
