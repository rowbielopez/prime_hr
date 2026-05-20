import ExcelJS from "exceljs";
import type { EmployeePdsData } from "@/features/employees/repository/pds.types";
import { getEducationLevelLabel, sortEducation } from "@/features/employees/repository/pds.types";

// ── Style constants ──────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF404040" },  // dark charcoal – matches official form section headers
};
const SECTION_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF595959" },  // darker gray – table column headers
};
const LABEL_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },  // light gray – field label areas
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
};
const WHITE_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, italic: true };
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
const LABEL_FONT: Partial<ExcelJS.Font> = { bold: false, size: 9 };
const VALUE_FONT: Partial<ExcelJS.Font> = { size: 9 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function v(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === "") return "";
    return String(val);
}

function formatDate(val: string | null | undefined): string {
    if (!val) return "";
    // ISO date → DD/MM/YYYY
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const yr = d.getUTCFullYear();
    return `${day}/${m}/${yr}`;
}

function formatAddress(addr: Record<string, unknown>): string {
    if (!addr || Object.keys(addr).length === 0) return "";
    return [addr.house_no, addr.street, addr.barangay, addr.city_municipality, addr.province, addr.zip_code]
        .filter(Boolean)
        .join(", ");
}

function applyBorderToRange(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const cell = ws.getCell(r, c);
            cell.border = THIN_BORDER;
        }
    }
}

function pageHeader(ws: ExcelJS.Worksheet, row: number, totalCols: number, employeeName: string, sheetLabel: string) {
    const r1 = ws.getRow(row);
    r1.height = 18;
    ws.mergeCells(row, 1, row, totalCols);
    const c1 = ws.getCell(row, 1);
    c1.value = "CS FORM No. 212  |  Revised 2025  |  PERSONAL DATA SHEET";
    c1.font = { ...WHITE_FONT, size: 11 };
    c1.fill = HEADER_FILL;
    c1.alignment = { horizontal: "center", vertical: "middle" };
    c1.border = THIN_BORDER;

    const r2 = ws.getRow(row + 1);
    r2.height = 14;
    ws.mergeCells(row + 1, 1, row + 1, totalCols);
    const c2 = ws.getCell(row + 1, 1);
    c2.value = `Employee: ${employeeName}     |     ${sheetLabel}`;
    c2.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c2.alignment = { horizontal: "center", vertical: "middle" };
    c2.fill = SECTION_FILL;
    c2.border = THIN_BORDER;

    return row + 2;
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, totalCols: number, title: string): number {
    ws.mergeCells(row, 1, row, totalCols);
    const cell = ws.getCell(row, 1);
    cell.value = title;
    cell.font = WHITE_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cell.border = THIN_BORDER;
    ws.getRow(row).height = 16;
    return row + 1;
}

function labelValue(ws: ExcelJS.Worksheet, row: number, label: string, value: string, labelWidth = 2, valueWidth = 2): number {
    const cell = ws.getCell(row, 1);
    cell.value = label;
    cell.font = LABEL_FONT;
    cell.fill = LABEL_FILL;
    cell.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    cell.border = THIN_BORDER;
    if (labelWidth > 1) ws.mergeCells(row, 1, row, labelWidth);

    const vcell = ws.getCell(row, labelWidth + 1);
    vcell.value = value;
    vcell.numFmt = "@";
    vcell.font = VALUE_FONT;
    vcell.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    vcell.border = THIN_BORDER;
    if (valueWidth > 1) ws.mergeCells(row, labelWidth + 1, row, labelWidth + valueWidth);

    ws.getRow(row).height = 14;
    return row + 1;
}

function twoColumnRow(
    ws: ExcelJS.Worksheet,
    row: number,
    label1: string, value1: string,
    label2: string, value2: string,
    totalCols: number,
): number {
    const half = Math.floor(totalCols / 2);
    const c1 = ws.getCell(row, 1);
    c1.value = label1;
    c1.font = LABEL_FONT;
    c1.fill = LABEL_FILL;
    c1.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    c1.border = THIN_BORDER;
    ws.mergeCells(row, 1, row, 2);

    const c2 = ws.getCell(row, 3);
    c2.value = value1;
    c2.numFmt = "@";
    c2.font = VALUE_FONT;
    c2.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    c2.border = THIN_BORDER;
    ws.mergeCells(row, 3, row, half);

    const c3 = ws.getCell(row, half + 1);
    c3.value = label2;
    c3.font = LABEL_FONT;
    c3.fill = LABEL_FILL;
    c3.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    c3.border = THIN_BORDER;
    ws.mergeCells(row, half + 1, row, half + 2);

    const c4 = ws.getCell(row, half + 3);
    c4.value = value2;
    c4.numFmt = "@";
    c4.font = VALUE_FONT;
    c4.alignment = { wrapText: true, vertical: "middle", indent: 1 };
    c4.border = THIN_BORDER;
    ws.mergeCells(row, half + 3, row, totalCols);

    ws.getRow(row).height = 14;
    return row + 1;
}

function tableHeader(ws: ExcelJS.Worksheet, row: number, headers: string[], colSpans: number[]): number {
    let col = 1;
    for (let i = 0; i < headers.length; i++) {
        const span = colSpans[i] ?? 1;
        const cell = ws.getCell(row, col);
        cell.value = headers[i];
        cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        cell.fill = SECTION_FILL;  // #595959 gray column headers
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = THIN_BORDER;
        if (span > 1) ws.mergeCells(row, col, row, col + span - 1);
        col += span;
    }
    ws.getRow(row).height = 28;
    return row + 1;
}

function tableRow(ws: ExcelJS.Worksheet, row: number, values: string[], colSpans: number[]): number {
    let col = 1;
    for (let i = 0; i < values.length; i++) {
        const span = colSpans[i] ?? 1;
        const cell = ws.getCell(row, col);
        cell.value = values[i];
        cell.numFmt = "@";  // prevent Excel from auto-formatting date-like strings
        cell.font = VALUE_FONT;
        cell.alignment = { wrapText: true, vertical: "middle", indent: 1 };
        cell.border = THIN_BORDER;
        if (span > 1) ws.mergeCells(row, col, row, col + span - 1);
        col += span;
    }
    ws.getRow(row).height = 14;
    return row + 1;
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildC1Sheet(wb: ExcelJS.Workbook, data: EmployeePdsData, employeeName: string) {
    const ws = wb.addWorksheet("C1 – Personal, Family, Education");
    const COLS = 10;
    ws.columns = Array(COLS).fill({ width: 16 });

    let row = 1;
    row = pageHeader(ws, row, COLS, employeeName, "C1 – Personal Information · Family Background · Educational Background");

    // ── I. PERSONAL INFORMATION ─────────────────────────────────────────────
    row = sectionTitle(ws, row, COLS, "I. Personal Information");

    const pi = data.personalInfo;
    row = twoColumnRow(ws, row, "1. SURNAME", v(pi?.surname), "FIRST NAME", v(pi?.firstName), COLS);
    row = twoColumnRow(ws, row, "MIDDLE NAME", v(pi?.middleName), "NAME EXTENSION (Jr./Sr./III)", v(pi?.nameExtension), COLS);
    row = twoColumnRow(ws, row, "2. DATE OF BIRTH (dd/mm/yyyy)", formatDate(pi?.birthDate), "3. PLACE OF BIRTH", v(pi?.birthPlace), COLS);
    row = twoColumnRow(ws, row, "4. SEX", v(pi?.sexAtBirth)?.toUpperCase() ?? "", "5. CIVIL STATUS", v(pi?.civilStatus), COLS);
    row = twoColumnRow(ws, row, "6. CITIZENSHIP", v(pi?.citizenship), "DUAL CITIZENSHIP", pi?.dualCitizenshipType ? `${pi.dualCitizenshipType}${pi.dualCitizenshipCountry ? ` – ${pi.dualCitizenshipCountry}` : ""}` : "", COLS);
    row = twoColumnRow(ws, row, "7. HEIGHT (m)", v(pi?.heightM), "8. WEIGHT (kg)", v(pi?.weightKg), COLS);
    row = twoColumnRow(ws, row, "9. BLOOD TYPE", v(pi?.bloodType), "", "", COLS);

    row = sectionTitle(ws, row, COLS, "Residential Address");
    row = labelValue(ws, row, "House/Block/Lot No., Street, Subdivision/Village", formatAddress(pi?.residentialAddress ?? {}), 4, 6);
    row = sectionTitle(ws, row, COLS, "Permanent Address");
    row = labelValue(ws, row, "House/Block/Lot No., Street, Subdivision/Village", formatAddress(pi?.permanentAddress ?? {}), 4, 6);

    row = twoColumnRow(ws, row, "TELEPHONE NO.", v(pi?.telephoneNo), "MOBILE NO.", v(pi?.mobileNo), COLS);
    row = labelValue(ws, row, "E-MAIL ADDRESS (if any)", v(pi?.email), 4, 6);

    row = sectionTitle(ws, row, COLS, "Government-Issued Identification Numbers (Fields 10–15)");
    row = twoColumnRow(ws, row, "10. UMID ID NO.", v(pi?.gsisNo), "11. PAG-IBIG ID NO.", v(pi?.pagibigNo), COLS);
    row = twoColumnRow(ws, row, "12. PHILHEALTH NO.", v(pi?.philhealthNo), "13. PhilSys Number (PSN)", v(pi?.philsysNo), COLS);
    row = twoColumnRow(ws, row, "14. TIN NO.", v(pi?.tin), "15. AGENCY EMPLOYEE NO.", v(pi?.agencyEmployeeNo), COLS);

    // ── II. FAMILY BACKGROUND ────────────────────────────────────────────────
    row++;
    row = sectionTitle(ws, row, COLS, "II. Family Background");

    const fam = data.familyBackground;
    row = sectionTitle(ws, row, COLS, "Spouse");
    row = twoColumnRow(ws, row, "SURNAME", v(fam?.spouseSurname), "FIRST NAME", v(fam?.spouseFirstName), COLS);
    row = twoColumnRow(ws, row, "MIDDLE NAME", v(fam?.spouseMiddleName), "NAME EXTENSION", v(fam?.spouseNameExtension), COLS);
    row = twoColumnRow(ws, row, "OCCUPATION", v(fam?.spouseOccupation), "EMPLOYER/BUSINESS NAME", v(fam?.spouseEmployerName), COLS);
    row = twoColumnRow(ws, row, "BUSINESS ADDRESS", v(fam?.spouseBusinessAddress), "TELEPHONE NO.", v(fam?.spouseTelephoneNo), COLS);

    row = sectionTitle(ws, row, COLS, "Father");
    row = twoColumnRow(ws, row, "SURNAME", v(fam?.fatherSurname), "FIRST NAME", v(fam?.fatherFirstName), COLS);
    row = twoColumnRow(ws, row, "MIDDLE NAME", v(fam?.fatherMiddleName), "NAME EXTENSION", v(fam?.fatherNameExtension), COLS);

    row = sectionTitle(ws, row, COLS, "Mother's Maiden Name");
    row = twoColumnRow(ws, row, "SURNAME", v(fam?.motherMaidenSurname), "FIRST NAME", v(fam?.motherFirstName), COLS);
    row = labelValue(ws, row, "MIDDLE NAME", v(fam?.motherMiddleName), 4, 6);

    row = sectionTitle(ws, row, COLS, `Children (${data.children.length})`);
    const childSpans = [4, 6];
    row = tableHeader(ws, row, ["NAME OF CHILD", "DATE OF BIRTH (dd/mm/yyyy)"], childSpans);
    if (data.children.length === 0) {
        row = tableRow(ws, row, ["(none on record)", ""], childSpans);
    } else {
        for (const c of data.children) {
            row = tableRow(ws, row, [v(c.fullName), formatDate(c.birthDate)], childSpans);
        }
    }

    // ── III. EDUCATIONAL BACKGROUND ──────────────────────────────────────────
    row++;
    row = sectionTitle(ws, row, COLS, "III. Educational Background");
    const eduHeaders = ["LEVEL", "SCHOOL/UNIVERSITY", "DEGREE/COURSE", "FROM", "TO", "HIGHEST LEVEL/UNITS EARNED", "YEAR GRADUATED", "SCHOLARSHIP/ACADEMIC HONORS"];
    const eduSpans = [1, 2, 2, 1, 1, 1, 1, 1];
    row = tableHeader(ws, row, eduHeaders, eduSpans);
    if (data.education.length === 0) {
        row = tableRow(ws, row, ["(none on record)", "", "", "", "", "", "", ""], eduSpans);
    } else {
        for (const e of sortEducation(data.education)) {
            row = tableRow(ws, row, [
                getEducationLevelLabel(e.level),
                v(e.schoolName),
                v(e.degreeCourse),
                v(e.periodFromYear),
                v(e.periodToYear),
                v(e.highestLevelUnits),
                v(e.yearGraduated),
                v(e.scholarshipHonors),
            ], eduSpans);
        }
    }
}

function buildC2Sheet(wb: ExcelJS.Workbook, data: EmployeePdsData, employeeName: string) {
    const ws = wb.addWorksheet("C2 – Eligibility, Work Experience");
    const COLS = 10;
    ws.columns = Array(COLS).fill({ width: 16 });

    let row = 1;
    row = pageHeader(ws, row, COLS, employeeName, "C2 – Civil Service Eligibility · Work Experience");

    // ── IV. CIVIL SERVICE ELIGIBILITY ────────────────────────────────────────
    row = sectionTitle(ws, row, COLS, "IV.  CIVIL SERVICE ELIGIBILITY");
    const eligHeaders = ["27. CES/CSEE/CAREER SERVICE/RA 1080 (BOARD/BAR)/UNDER SPECIAL LAWS/CATEGORY III IV ELIGIBILITY and ELIGIBILITIES FOR UNIFORMED PERSONNEL", "RATING (If Applicable)", "DATE OF EXAMINATION / CONFERMENT", "PLACE OF EXAMINATION / CONFERMENT", "LICENSE NUMBER", "LICENSE VALID UNTIL"];
    const eligSpans = [3, 1, 1, 2, 2, 1];
    row = tableHeader(ws, row, eligHeaders, eligSpans);
    if (data.eligibilities.length === 0) {
        row = tableRow(ws, row, ["(none on record)", "", "", "", "", ""], eligSpans);
    } else {
        for (const e of data.eligibilities) {
            row = tableRow(ws, row, [
                v(e.eligibilityName),
                v(e.rating),
                formatDate(e.examinationDate),
                v(e.examinationPlace),
                v(e.licenseNumber),
                formatDate(e.licenseValidUntil),
            ], eligSpans);
        }
    }

    // ── V. WORK EXPERIENCE ───────────────────────────────────────────────────
    row++;
    row = sectionTitle(ws, row, COLS, `V.  WORK EXPERIENCE (${data.workExperiences.length} records) – Start from most recent work`);
    const weHeaders = ["28. INCLUSIVE DATES FROM (dd/mm/yyyy)", "INCLUSIVE DATES TO (dd/mm/yyyy)", "POSITION TITLE (Write in full/Do not abbreviate)", "DEPARTMENT / AGENCY / OFFICE / COMPANY (Write in full)", "MONTHLY SALARY", "STATUS OF APPOINTMENT", "GOV'T SERVICE (Y/N)"];
    const weSpans = [1, 1, 2, 2, 1, 1, 2];
    row = tableHeader(ws, row, weHeaders, weSpans);
    if (data.workExperiences.length === 0) {
        row = tableRow(ws, row, ["", "", "(none on record)", "", "", "", "", ""], weSpans);
    } else {
        for (const w of data.workExperiences) {
            row = tableRow(ws, row, [
                formatDate(w.dateFrom),
                w.isCurrent ? "PRESENT" : formatDate(w.dateTo),
                v(w.positionTitle),
                v(w.departmentAgencyOfficeCompany),
                w.monthlySalary !== null ? w.monthlySalary.toLocaleString() : "",
                v(w.appointmentStatus),
                w.isGovernmentService === true ? "Y" : w.isGovernmentService === false ? "N" : "",
            ], weSpans);
        }
    }
}

function buildC3Sheet(wb: ExcelJS.Workbook, data: EmployeePdsData, employeeName: string) {
    const ws = wb.addWorksheet("C3 – L&D, Other Information");
    const COLS = 10;
    ws.columns = Array(COLS).fill({ width: 16 });

    let row = 1;
    row = pageHeader(ws, row, COLS, employeeName, "C3 – Voluntary Work · Learning & Development · Other Information");

    // ── VI. VOLUNTARY WORK ───────────────────────────────────────────────────
    row = sectionTitle(ws, row, COLS, "VI.  VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATIONS");
    row = tableHeader(ws, row, ["29. NAME & ADDRESS OF ORGANIZATION (Write in full)", "INCLUSIVE DATES FROM (dd/mm/yyyy)", "INCLUSIVE DATES TO (dd/mm/yyyy)", "NUMBER OF HOURS", "POSITION / NATURE OF WORK"], [3, 1, 1, 2, 3]);
    if (data.voluntaryWork.length === 0) {
        row = tableRow(ws, row, ["(none on record)", "", "", "", ""], [3, 1, 1, 2, 3]);
    } else {
        for (const vw of data.voluntaryWork) {
            const orgFull = [vw.organizationName, vw.organizationAddress].filter(Boolean).join(", ");
            row = tableRow(ws, row, [
                v(orgFull),
                formatDate(vw.dateFrom),
                formatDate(vw.dateTo),
                v(vw.hoursCount),
                v(vw.positionNatureOfWork),
            ], [3, 1, 1, 2, 3]);
        }
    }

    // ── VII. LEARNING AND DEVELOPMENT ────────────────────────────────────────
    row++;
    row = sectionTitle(ws, row, COLS, `VII.  LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED (${data.learningDevelopment.length} records)`);
    const ldHeaders = ["30. TITLE OF LEARNING AND DEVELOPMENT INTERVENTIONS/ TRAINING PROGRAMS (Write in full)", "INCLUSIVE DATES FROM (dd/mm/yyyy)", "INCLUSIVE DATES TO (dd/mm/yyyy)", "NUMBER OF HOURS", "TYPE OF L&D (Managerial/ Supervisory/ Technical/etc.)", "CONDUCTED/ SPONSORED BY (Write in full)"];
    const ldSpans = [3, 1, 1, 1, 2, 2];
    row = tableHeader(ws, row, ldHeaders, ldSpans);
    if (data.learningDevelopment.length === 0) {
        row = tableRow(ws, row, ["(none on record)", "", "", "", "", ""], ldSpans);
    } else {
        for (const l of data.learningDevelopment) {
            row = tableRow(ws, row, [
                v(l.title),
                formatDate(l.dateFrom),
                formatDate(l.dateTo),
                v(l.hoursCount),
                v(l.learningType),
                v(l.conductedBy),
            ], ldSpans);
        }
    }

    // ── VIII. OTHER INFORMATION ───────────────────────────────────────────────
    row++;
    row = sectionTitle(ws, row, COLS, "VIII.  OTHER INFORMATION");

    row = sectionTitle(ws, row, COLS, `31. Special Skills and Hobbies (${data.skills.length})`);
    if (data.skills.length === 0) {
        row = tableRow(ws, row, ["(none on record)"], [COLS]);
    } else {
        for (const s of data.skills) {
            ws.mergeCells(row, 1, row, COLS);
            const cell = ws.getCell(row, 1);
            cell.value = s.skillName;
            cell.font = VALUE_FONT;
            cell.alignment = { indent: 2, vertical: "middle" };
            cell.border = THIN_BORDER;
            ws.getRow(row).height = 14;
            row++;
        }
    }

    row++;
    row = sectionTitle(ws, row, COLS, `32. Non-Academic Distinctions / Recognition (${data.recognitions.length})`);
    if (data.recognitions.length === 0) {
        row = tableRow(ws, row, ["(none on record)"], [COLS]);
    } else {
        for (const r of data.recognitions) {
            ws.mergeCells(row, 1, row, COLS);
            const cell = ws.getCell(row, 1);
            cell.value = r.recognitionTitle;
            cell.font = VALUE_FONT;
            cell.alignment = { indent: 2, vertical: "middle" };
            cell.border = THIN_BORDER;
            ws.getRow(row).height = 14;
            row++;
        }
    }

    row++;
    row = sectionTitle(ws, row, COLS, `33. Membership in Association/Organization (${data.memberships.length})`);
    if (data.memberships.length === 0) {
        row = tableRow(ws, row, ["(none on record)"], [COLS]);
    } else {
        for (const m of data.memberships) {
            ws.mergeCells(row, 1, row, COLS);
            const cell = ws.getCell(row, 1);
            cell.value = m.organizationName;
            cell.font = VALUE_FONT;
            cell.alignment = { indent: 2, vertical: "middle" };
            cell.border = THIN_BORDER;
            ws.getRow(row).height = 14;
            row++;
        }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePdsExcel(data: EmployeePdsData, employeeName: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CSU PRIME-HR";
    wb.lastModifiedBy = "CSU PRIME-HR";
    wb.created = new Date();
    wb.modified = new Date();

    buildC1Sheet(wb, data, employeeName);
    buildC2Sheet(wb, data, employeeName);
    buildC3Sheet(wb, data, employeeName);

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}
