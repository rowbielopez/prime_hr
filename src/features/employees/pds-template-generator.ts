/**
 * PDS Template Fill Generator
 *
 * Loads the official CSC Form 212 Rev. 2025 Excel template from public/ and
 * populates it with employee PDS data, preserving all original formatting,
 * borders, colours, and layout.
 *
 * Cell map was derived by programmatic inspection of
 * "public/PDS Rev. 2025 Template.xlsx" using ExcelJS.
 */
import path from "path";
import ExcelJS from "exceljs";
import type { EmployeePdsData } from "@/features/employees/repository/pds.types";
import { sortEducation } from "@/features/employees/repository/pds.types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function s(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === "") return "";
    return String(val);
}

function fmtDate(val: string | null | undefined): string {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return s(val);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${mon}/${d.getUTCFullYear()}`;
}

function addrField(addr: Record<string, unknown>, key: string): string {
    const val = addr?.[key];
    return typeof val === "string" || typeof val === "number" ? s(val) : "";
}

/** Write a text value to the master cell of a (possibly merged) range. */
function w(ws: ExcelJS.Worksheet, addr: string, val: string | number | null): void {
    const cell = ws.getCell(addr);
    cell.value = val ?? "";
}

/**
 * Mark YES/NO question checkboxes.
 * yesCell / noCell are the checkbox columns (G=YES, H=NO in C4).
 */
function markYesNo(ws: ExcelJS.Worksheet, yesAddr: string, noAddr: string, answer: string | null | undefined): void {
    const isYes = String(answer ?? "").toUpperCase() === "YES";
    w(ws, yesAddr, isYes ? "✓" : "");
    w(ws, noAddr, isYes ? "" : "✓");
}

// ── Main generator ───────────────────────────────────────────────────────────

export async function generatePdsFromTemplate(
    pdsData: EmployeePdsData,
    _employeeName: string,
): Promise<ArrayBuffer> {
    const templatePath = path.join(process.cwd(), "public", "PDS Rev. 2025 Template.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);

    fillSheetC1(wb, pdsData);
    fillSheetC2(wb, pdsData);
    fillSheetC3(wb, pdsData);
    fillSheetC4(wb, pdsData);

    return await wb.xlsx.writeBuffer();
}

// ── Sheet C1 — Personal Info, Family Background, Education ──────────────────

function fillSheetC1(wb: ExcelJS.Workbook, d: EmployeePdsData): void {
    const ws = wb.getWorksheet("C1");
    if (!ws) return;

    const p = d.personalInfo;
    if (!p) return;

    // 1. Personal Information
    w(ws, "D10", s(p.surname).toUpperCase());
    w(ws, "D11", s(p.firstName).toUpperCase());
    w(ws, "L11", p.nameExtension ? s(p.nameExtension).toUpperCase() : "N/A");
    w(ws, "D12", s(p.middleName).toUpperCase());
    w(ws, "D13", fmtDate(p.birthDate));
    w(ws, "D15", s(p.birthPlace).toUpperCase());
    // Sex at Birth — D16:F16 merged; write text value
    w(ws, "D16", s(p.sexAtBirth));
    // Civil Status — D17:F18 merged
    w(ws, "D17", s(p.civilStatus));
    // Citizenship — J13:N13 merged
    w(ws, "J13", s(p.citizenship) || "Filipino");

    // 2. Physical characteristics and government IDs
    if (p.heightM != null) w(ws, "D22", p.heightM);
    if (p.weightKg != null) w(ws, "D24", p.weightKg);
    w(ws, "D25", s(p.bloodType));
    w(ws, "D27", s(p.gsisNo));   // UMID ID No (item 10)
    w(ws, "D29", s(p.pagibigNo));
    w(ws, "D31", s(p.philhealthNo));
    w(ws, "D32", s(p.philsysNo));
    w(ws, "D33", s(p.tin));
    w(ws, "D34", s(p.agencyEmployeeNo));

    // 3. Contact details
    w(ws, "I32", s(p.telephoneNo));
    w(ws, "I33", s(p.mobileNo));
    w(ws, "I34", s(p.email));

    // 4. Residential address (rows 17–24, right side)
    const ra = p.residentialAddress as Record<string, unknown>;
    w(ws, "I17", addrField(ra, "house_no"));
    w(ws, "L17", addrField(ra, "street"));
    w(ws, "I19", addrField(ra, "subdivision"));
    w(ws, "L19", addrField(ra, "barangay"));
    w(ws, "I22", addrField(ra, "city_municipality"));
    w(ws, "L22", addrField(ra, "province"));
    w(ws, "I24", addrField(ra, "zip_code"));

    // 5. Permanent address (rows 25–31, right side)
    const pa = p.permanentAddress as Record<string, unknown>;
    w(ws, "I25", addrField(pa, "house_no"));
    w(ws, "L25", addrField(pa, "street"));
    w(ws, "I27", addrField(pa, "subdivision"));
    w(ws, "L27", addrField(pa, "barangay"));
    w(ws, "I29", addrField(pa, "city_municipality"));
    w(ws, "L29", addrField(pa, "province"));
    w(ws, "I31", addrField(pa, "zip_code"));

    // 6. Family Background — Spouse
    const fb = d.familyBackground;
    if (fb) {
        w(ws, "D36", s(fb.spouseSurname).toUpperCase());
        w(ws, "D37", s(fb.spouseFirstName).toUpperCase());
        w(ws, "G37", fb.spouseNameExtension ? s(fb.spouseNameExtension).toUpperCase() : "N/A");
        w(ws, "D38", s(fb.spouseMiddleName).toUpperCase());
        w(ws, "D39", s(fb.spouseOccupation));
        w(ws, "D40", s(fb.spouseEmployerName));
        w(ws, "D41", s(fb.spouseBusinessAddress));
        w(ws, "D42", s(fb.spouseTelephoneNo));

        // Father
        w(ws, "D43", s(fb.fatherSurname).toUpperCase());
        w(ws, "D44", s(fb.fatherFirstName).toUpperCase());
        w(ws, "G44", fb.fatherNameExtension ? s(fb.fatherNameExtension).toUpperCase() : "N/A");
        w(ws, "D45", s(fb.fatherMiddleName).toUpperCase());

        // Mother (maiden name)
        w(ws, "D47", s(fb.motherMaidenSurname).toUpperCase());
        w(ws, "D48", s(fb.motherFirstName).toUpperCase());
        w(ws, "D49", s(fb.motherMiddleName).toUpperCase());
    }

    // 7. Children (rows 37–42, right side — up to 6 entries)
    const CHILD_ROWS: [string, string][] = [
        ["I37", "M37"],
        ["I38", "M38"],
        ["I39", "M39"],
        ["I40", "M40"],
        ["I41", "M41"],
        ["I42", "M42"],
    ];
    d.children.slice(0, CHILD_ROWS.length).forEach((child, i) => {
        const [nameAddr, dobAddr] = CHILD_ROWS[i];
        w(ws, nameAddr, s(child.fullName).toUpperCase());
        w(ws, dobAddr, fmtDate(child.birthDate));
    });

    // 8. Educational Background (rows 54–58)
    const EDU_ROWS: Record<string, number> = {
        elementary: 54,
        secondary: 55,
        vocational: 56,
        college: 57,
        graduate: 58,
    };
    const sorted = sortEducation(d.education);
    for (const edu of sorted) {
        const level = edu.level?.toLowerCase() ?? "college";
        // Normalize to known levels
        const rowKey = Object.keys(EDU_ROWS).find(k => level.includes(k)) ?? "college";
        const row = EDU_ROWS[rowKey];
        w(ws, `D${row}`, s(edu.schoolName));
        w(ws, `G${row}`, s(edu.degreeCourse));
        w(ws, `J${row}`, edu.periodFromYear ? String(edu.periodFromYear) : "");
        w(ws, `K${row}`, edu.periodToYear ? String(edu.periodToYear) : "");
        w(ws, `L${row}`, s(edu.highestLevelUnits) || "N/A");
        w(ws, `M${row}`, edu.yearGraduated ? String(edu.yearGraduated) : "");
        w(ws, `N${row}`, s(edu.scholarshipHonors) || "N/A");
    }
}

// ── Sheet C2 — Civil Service Eligibility, Work Experience ────────────────────

function fillSheetC2(wb: ExcelJS.Workbook, d: EmployeePdsData): void {
    const ws = wb.getWorksheet("C2");
    if (!ws) return;

    // Civil Service Eligibility — rows 5 onwards (template has rows 5–8; add more if needed)
    d.eligibilities.slice(0, 7).forEach((elig, i) => {
        const row = 5 + i;
        w(ws, `A${row}`, s(elig.eligibilityName));
        w(ws, `F${row}`, s(elig.rating));
        w(ws, `G${row}`, fmtDate(elig.examinationDate));
        w(ws, `I${row}`, s(elig.examinationPlace));
        w(ws, `J${row}`, s(elig.licenseNumber) || "N/A");
        w(ws, `K${row}`, fmtDate(elig.licenseValidUntil) || "N/A");
    });

    // Work Experience — rows 15–39 (25 slots)
    d.workExperiences.slice(0, 25).forEach((we, i) => {
        const row = 15 + i;
        w(ws, `A${row}`, fmtDate(we.dateFrom));
        w(ws, `C${row}`, we.isCurrent ? "PRESENT" : fmtDate(we.dateTo));
        w(ws, `D${row}`, s(we.positionTitle).toUpperCase());
        w(ws, `G${row}`, s(we.departmentAgencyOfficeCompany).toUpperCase());
        w(ws, `J${row}`, s(we.appointmentStatus));
        w(ws, `K${row}`, we.isGovernmentService === true ? "Y" : we.isGovernmentService === false ? "N" : "");
    });
}

// ── Sheet C3 — Voluntary Work, L&D, Other Info ───────────────────────────────

function fillSheetC3(wb: ExcelJS.Workbook, d: EmployeePdsData): void {
    const ws = wb.getWorksheet("C3");
    if (!ws) return;

    // Voluntary Work — rows 6–12 (7 slots)
    d.voluntaryWork.slice(0, 7).forEach((vw, i) => {
        const row = 6 + i;
        const orgFull = [s(vw.organizationName), s(vw.organizationAddress)].filter(Boolean).join(", ");
        w(ws, `A${row}`, orgFull);
        w(ws, `E${row}`, fmtDate(vw.dateFrom));
        w(ws, `F${row}`, fmtDate(vw.dateTo));
        w(ws, `G${row}`, vw.hoursCount != null ? vw.hoursCount : "");
        w(ws, `H${row}`, s(vw.positionNatureOfWork));
    });

    // Learning and Development — rows 18–38 (21 slots)
    d.learningDevelopment.slice(0, 21).forEach((ld, i) => {
        const row = 18 + i;
        w(ws, `A${row}`, s(ld.title));
        w(ws, `E${row}`, fmtDate(ld.dateFrom));
        w(ws, `F${row}`, fmtDate(ld.dateTo));
        w(ws, `G${row}`, ld.hoursCount != null ? ld.hoursCount : "");
        w(ws, `H${row}`, s(ld.learningType));
        w(ws, `I${row}`, s(ld.conductedBy));
    });

    // Other Information (rows 42–48)
    // Skills — column A:B (merged A42:B42 etc.)
    d.skills.slice(0, 7).forEach((sk, i) => {
        w(ws, `A${42 + i}`, s(sk.skillName));
    });
    // Recognitions — column C:H (merged C42:H42 etc.)
    d.recognitions.slice(0, 7).forEach((rec, i) => {
        w(ws, `C${42 + i}`, s(rec.recognitionTitle));
    });
    // Memberships — column I:K (merged I42:K42 etc.)
    d.memberships.slice(0, 7).forEach((mem, i) => {
        w(ws, `I${42 + i}`, s(mem.organizationName));
    });
}

// ── Sheet C4 — Legal Questions, References, Government ID, Declaration ───────

function fillSheetC4(wb: ExcelJS.Workbook, d: EmployeePdsData): void {
    const ws = wb.getWorksheet("C4");
    if (!ws) return;

    const decl = d.declaration;
    const answers = (decl?.answers ?? {}) as Record<string, string>;
    const explanations = (decl?.explanations ?? {}) as Record<string, string>;

    /**
     * App question key → C4 template question mapping
     *
     * The app stores legal questions as q34a–q40 (based on the 2017 form
     * numbering). The 2025 template renumbered questions. Mapping:
     *
     * App key  | Template Q | YES cell | NO cell | Details cell
     * ---------|------------|----------|---------|-------------
     * q34a     | Q35a       | G13      | H13     | I15
     * q34b     | Q35b       | G18      | H18     | G19 area
     * q34c     | Q36        | G23      | H23     | G24 area
     * q34d     | Q37        | G27      | H27     | G28 area
     * q34e     | Q38a       | G31      | H31     | G32
     * q34f     | Q38b       | G34      | H34     | G35
     * q35      | Q39        | G37      | H37     | G38 area
     *
     * Template-only questions (not in app keys):
     *   Q34a (consanguinity 3rd degree) → G6 / H6
     *   Q34b (consanguinity 4th degree) → G8 / H8
     *   Q40a (indigenous)               → G43 / H43
     *   Q40b (PWD)                      → G45 / H45
     *   Q40c (solo parent)              → G47 / H47
     */

    // Q35a — "Have you ever been found guilty of any administrative offense?"
    markYesNo(ws, "G13", "H13", answers.q34a);
    if (answers.q34a?.toUpperCase() === "YES") {
        w(ws, "I15", s(explanations.q34a));
    }

    // Q35b — "Have you been criminally charged before any court?"
    markYesNo(ws, "G18", "H18", answers.q34b);
    if (answers.q34b?.toUpperCase() === "YES") {
        // Details text: write inline with G19 label area (overwrite label)
        // Using separate detail cells J20 for date filed, J21 for status
        const detail = s(explanations.q34b);
        if (detail) {
            // Parse "Case Title | Date Filed: xxx | Status: yyy" or write as-is
            w(ws, "J20", detail);
        }
    }

    // Q36 — "Have you ever been convicted of any crime or violation?"
    markYesNo(ws, "G23", "H23", answers.q34c);
    if (answers.q34c?.toUpperCase() === "YES") {
        w(ws, "I22", s(explanations.q34c));
    }

    // Q37 — "Have you ever been separated from the service?"
    markYesNo(ws, "G27", "H27", answers.q34d);
    if (answers.q34d?.toUpperCase() === "YES") {
        w(ws, "I29", s(explanations.q34d));
    }

    // Q38a — "Have you ever been a candidate in a national or local election?"
    markYesNo(ws, "G31", "H31", answers.q34e);
    if (answers.q34e?.toUpperCase() === "YES") {
        w(ws, "K32", s(explanations.q34e));
    }

    // Q38b — "Have you resigned from the government during the 3-month period?"
    markYesNo(ws, "G34", "H34", answers.q34f);
    if (answers.q34f?.toUpperCase() === "YES") {
        w(ws, "K35", s(explanations.q34f));
    }

    // Q39 — "Have you acquired the status of an immigrant or permanent resident?"
    markYesNo(ws, "G37", "H37", answers.q35);
    if (answers.q35?.toUpperCase() === "YES") {
        w(ws, "I39", s(explanations.q35));
    }

    // 3. References (rows 52–54)
    d.references.slice(0, 3).forEach((ref, i) => {
        const row = 52 + i;
        w(ws, `A${row}`, s(ref.fullName).toUpperCase());
        w(ws, `F${row}`, s(ref.address));
        w(ws, `G${row}`, s(ref.telephoneNo));
    });

    // 4. Government ID
    const govId = d.governmentId;
    if (govId) {
        w(ws, "D61", s(govId.idType));
        w(ws, "D62", s(govId.idNumber));
        const issuance = [s(govId.issuedAt), s(govId.issuedPlace)].filter(Boolean).join(" / ");
        w(ws, "D64", issuance || s(govId.issuingAgency));
    }
}
