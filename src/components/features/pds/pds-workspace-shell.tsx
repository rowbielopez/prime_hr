"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, LockKeyhole, TriangleAlert } from "lucide-react";
import { ContentSection, StatusBadge } from "@/components/foundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDS_SECTIONS, PDS_STATUS_LABELS } from "@/features/pds/constants";
import type { PdsSectionKey } from "@/features/pds/types";
import type { EmployeePdsData, PdsVoluntaryWork } from "@/features/employees/repository/pds.types";
import type { AddressInput } from "@/features/employees/pds-edit.actions";
import {
    ensurePdsProfileAction,
    wsUpdatePersonalInfoAction,
    wsUpdateFamilyBackgroundAction,
    wsUpsertChildAction,
    wsDeleteChildAction,
    wsUpsertEducationAction,
    wsDeleteEducationAction,
    wsUpsertEligibilityAction,
    wsDeleteEligibilityAction,
    wsUpsertWorkExperienceAction,
    wsDeleteWorkExperienceAction,
    wsUpsertVoluntaryWorkAction,
    wsDeleteVoluntaryWorkAction,
    wsUpsertLearningAction,
    wsDeleteLearningAction,
    wsUpsertSkillAction,
    wsDeleteSkillAction,
    wsUpsertRecognitionAction,
    wsDeleteRecognitionAction,
    wsUpsertMembershipAction,
    wsDeleteMembershipAction,
    wsUpsertReferenceAction,
    wsDeleteReferenceAction,
    wsUpsertDeclarationAction,
    wsUpsertGovernmentIdAction,
    submitPdsForReviewAction,
} from "@/features/pds/pds-workspace.actions";
import { cn } from "@/lib/utils";


// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
    employeeId: string;
    campusId: string;
    pdsData: EmployeePdsData;
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

function ErrorBanner({ message }: { message: string | null }) {
    if (!message) return null;
    return <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{message}</div>;
}

function SuccessBanner({ message }: { message: string | null }) {
    if (!message) return null;
    return <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">{message}</div>;
}

function SectionHeader({ title }: { title: string }) {
    return <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-3">{title}</h3>;
}

function parseAddress(addr: Record<string, unknown>): AddressInput {
    return {
        houseNo: String(addr.house_no ?? ""),
        street: String(addr.street ?? ""),
        barangay: String(addr.barangay ?? ""),
        cityMunicipality: String(addr.city_municipality ?? ""),
        province: String(addr.province ?? ""),
        zipCode: String(addr.zip_code ?? ""),
        country: String(addr.country ?? ""),
    };
}

function AddressFields({ prefix, value, onChange }: {
    prefix: string;
    value: AddressInput;
    onChange: (v: AddressInput) => void;
}) {
    const set = (key: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...value, [key]: e.target.value });
    return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <FieldRow label="House / Block / Lot No."><Input value={value.houseNo ?? ""} onChange={set("houseNo")} /></FieldRow>
            <FieldRow label="Street"><Input value={value.street ?? ""} onChange={set("street")} /></FieldRow>
            <FieldRow label="Barangay"><Input value={value.barangay ?? ""} onChange={set("barangay")} /></FieldRow>
            <FieldRow label="City / Municipality"><Input value={value.cityMunicipality ?? ""} onChange={set("cityMunicipality")} /></FieldRow>
            <FieldRow label="Province"><Input value={value.province ?? ""} onChange={set("province")} /></FieldRow>
            <FieldRow label="Zip Code"><Input value={value.zipCode ?? ""} onChange={set("zipCode")} /></FieldRow>
            <FieldRow label="Country"><Input value={value.country ?? ""} onChange={set("country")} placeholder="Philippines" /></FieldRow>
            <span className="hidden" aria-hidden>{prefix}</span>
        </div>
    );
}

// ── Section: Overview ─────────────────────────────────────────────────────────

function OverviewSection({ pdsData, profileId, profileStatus, onInit }: {
    pdsData: EmployeePdsData;
    profileId: string | null;
    profileStatus: string | null;
    onInit: (id: string) => void;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleInit() {
        setError(null);
        startTransition(async () => {
            const result = await ensurePdsProfileAction();
            if (result.ok && result.profileId) {
                onInit(result.profileId);
            } else if (!result.ok) {
                setError(result.error);
            }
        });
    }

    return (
        <div className="space-y-4">
            <SectionHeader title="PDS Draft Overview" />
            <ErrorBanner message={error} />
            {profileId ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                        <dt className="text-xs text-muted-foreground">Status</dt>
                        <dd className="text-sm font-semibold capitalize">{PDS_STATUS_LABELS[(profileStatus ?? pdsData.profileStatus) as keyof typeof PDS_STATUS_LABELS] ?? "Draft"}</dd>
                    </div>
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                        <dt className="text-xs text-muted-foreground">Last Updated</dt>
                        <dd className="text-sm font-semibold">{pdsData.profileUpdatedAt ? new Date(pdsData.profileUpdatedAt).toLocaleDateString() : "—"}</dd>
                    </div>
                    {pdsData.profileUpdatedByName && (
                        <div className="rounded-lg border bg-card p-3 space-y-1 sm:col-span-2">
                            <dt className="text-xs text-muted-foreground">Last Updated By</dt>
                            <dd className="text-sm font-semibold">{pdsData.profileUpdatedByName}</dd>
                        </div>
                    )}
                </dl>
            ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-inset/50 p-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No PDS draft exists yet. Click below to start filling your Personal Data Sheet.</p>
                    <Button type="button" onClick={handleInit} disabled={pending}>
                        {pending ? "Initializing…" : "Start My PDS Draft"}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── Section: Personal Information ─────────────────────────────────────────────

function PersonalInfoSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    const pi = pdsData.personalInfo;
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [f, setF] = useState({
        surname: pi?.surname ?? "", firstName: pi?.firstName ?? "", middleName: pi?.middleName ?? "",
        nameExtension: pi?.nameExtension ?? "", birthDate: pi?.birthDate?.slice(0, 10) ?? "",
        birthPlace: pi?.birthPlace ?? "", sexAtBirth: pi?.sexAtBirth ?? "", civilStatus: pi?.civilStatus ?? "",
        heightM: pi?.heightM?.toString() ?? "", weightKg: pi?.weightKg?.toString() ?? "",
        bloodType: pi?.bloodType ?? "", citizenship: pi?.citizenship ?? "",
        dualCitizenshipType: pi?.dualCitizenshipType ?? "", dualCitizenshipCountry: pi?.dualCitizenshipCountry ?? "",
        telephoneNo: pi?.telephoneNo ?? "", mobileNo: pi?.mobileNo ?? "", email: pi?.email ?? "",
        gsisNo: pi?.gsisNo ?? "", pagibigNo: pi?.pagibigNo ?? "", philhealthNo: pi?.philhealthNo ?? "",
        sssNo: pi?.sssNo ?? "", tin: pi?.tin ?? "", philsysNo: pi?.philsysNo ?? "",
        agencyEmployeeNo: pi?.agencyEmployeeNo ?? "",
    });
    const [residential, setResidential] = useState<AddressInput>(
        pi?.residentialAddress ? parseAddress(pi.residentialAddress as Record<string, unknown>) : { houseNo: "", street: "", barangay: "", cityMunicipality: "", province: "", zipCode: "", country: "" }
    );
    const [permanent, setPermanent] = useState<AddressInput>(
        pi?.permanentAddress ? parseAddress(pi.permanentAddress as Record<string, unknown>) : { houseNo: "", street: "", barangay: "", cityMunicipality: "", province: "", zipCode: "", country: "" }
    );
    const n = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [key]: e.target.value }));

    function handleSave(e: React.FormEvent) {
        e.preventDefault(); setError(null); setSuccess(null);
        startTransition(async () => {
            const result = await wsUpdatePersonalInfoAction({
                pdsProfileId, campusId,
                personalInfoId: pi?.id ?? null,
                surname: f.surname || null, firstName: f.firstName || null, middleName: f.middleName || null,
                nameExtension: f.nameExtension || null, birthDate: f.birthDate || null, birthPlace: f.birthPlace || null,
                sexAtBirth: f.sexAtBirth || null, civilStatus: f.civilStatus || null,
                heightM: f.heightM ? parseFloat(f.heightM) : null, weightKg: f.weightKg ? parseFloat(f.weightKg) : null,
                bloodType: f.bloodType || null, citizenship: f.citizenship || null,
                dualCitizenshipType: f.dualCitizenshipType || null, dualCitizenshipCountry: f.dualCitizenshipCountry || null,
                telephoneNo: f.telephoneNo || null, mobileNo: f.mobileNo || null, email: f.email || null,
                gsisNo: f.gsisNo || null, pagibigNo: f.pagibigNo || null, philhealthNo: f.philhealthNo || null,
                sssNo: f.sssNo || null, tin: f.tin || null, philsysNo: f.philsysNo || null,
                agencyEmployeeNo: f.agencyEmployeeNo || null,
                residentialAddress: residential, permanentAddress: permanent,
            });
            if (result.ok) setSuccess("Personal information saved."); else setError(result.error);
        });
    }

    return (
        <form onSubmit={handleSave} className="space-y-5">
            <ErrorBanner message={error} /><SuccessBanner message={success} />
            <div>
                <SectionHeader title="Identity" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldRow label="Surname *"><Input value={f.surname} onChange={n("surname")} /></FieldRow>
                    <FieldRow label="First Name *"><Input value={f.firstName} onChange={n("firstName")} /></FieldRow>
                    <FieldRow label="Middle Name"><Input value={f.middleName} onChange={n("middleName")} /></FieldRow>
                    <FieldRow label="Name Extension"><Input value={f.nameExtension} onChange={n("nameExtension")} placeholder="Jr., Sr., III" /></FieldRow>
                </div>
            </div>
            <div>
                <SectionHeader title="Birth Details" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="Date of Birth"><Input type="date" value={f.birthDate} onChange={n("birthDate")} /></FieldRow>
                    <FieldRow label="Place of Birth"><Input value={f.birthPlace} onChange={n("birthPlace")} /></FieldRow>
                    <FieldRow label="Sex at Birth">
                        <select value={f.sexAtBirth} onChange={n("sexAtBirth")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">— Select —</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </FieldRow>
                    <FieldRow label="Civil Status">
                        <select value={f.civilStatus} onChange={n("civilStatus")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">— Select —</option>
                            {["Single", "Married", "Widowed", "Divorced", "Separated", "Annulled"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FieldRow>
                    <FieldRow label="Height (m)"><Input type="number" step="0.01" value={f.heightM} onChange={n("heightM")} /></FieldRow>
                    <FieldRow label="Weight (kg)"><Input type="number" step="0.1" value={f.weightKg} onChange={n("weightKg")} /></FieldRow>
                    <FieldRow label="Blood Type">
                        <select value={f.bloodType} onChange={n("bloodType")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">— Select —</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </FieldRow>
                </div>
            </div>
            <div>
                <SectionHeader title="Citizenship" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="Citizenship"><Input value={f.citizenship} onChange={n("citizenship")} placeholder="Filipino" /></FieldRow>
                    <FieldRow label="Dual Citizenship Type">
                        <select value={f.dualCitizenshipType} onChange={n("dualCitizenshipType")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">None</option>
                            <option value="by_birth">By Birth</option>
                            <option value="by_naturalization">By Naturalization</option>
                        </select>
                    </FieldRow>
                    {f.dualCitizenshipType && (
                        <FieldRow label="Dual Citizenship Country"><Input value={f.dualCitizenshipCountry} onChange={n("dualCitizenshipCountry")} /></FieldRow>
                    )}
                </div>
            </div>
            <div>
                <SectionHeader title="Contact Information" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="Telephone No."><Input value={f.telephoneNo} onChange={n("telephoneNo")} /></FieldRow>
                    <FieldRow label="Mobile No."><Input value={f.mobileNo} onChange={n("mobileNo")} /></FieldRow>
                    <FieldRow label="Email"><Input type="email" value={f.email} onChange={n("email")} /></FieldRow>
                </div>
            </div>
            <div>
                <SectionHeader title="Government IDs" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="GSIS No."><Input value={f.gsisNo} onChange={n("gsisNo")} /></FieldRow>
                    <FieldRow label="Pag-IBIG No."><Input value={f.pagibigNo} onChange={n("pagibigNo")} /></FieldRow>
                    <FieldRow label="PhilHealth No."><Input value={f.philhealthNo} onChange={n("philhealthNo")} /></FieldRow>
                    <FieldRow label="SSS No."><Input value={f.sssNo} onChange={n("sssNo")} /></FieldRow>
                    <FieldRow label="TIN"><Input value={f.tin} onChange={n("tin")} /></FieldRow>
                    <FieldRow label="PhilSys No."><Input value={f.philsysNo} onChange={n("philsysNo")} /></FieldRow>
                    <FieldRow label="Agency Employee No."><Input value={f.agencyEmployeeNo} onChange={n("agencyEmployeeNo")} /></FieldRow>
                </div>
            </div>
            <div>
                <SectionHeader title="Residential Address" />
                <AddressFields prefix="residential" value={residential} onChange={setResidential} />
            </div>
            <div>
                <SectionHeader title="Permanent Address" />
                <AddressFields prefix="permanent" value={permanent} onChange={setPermanent} />
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Personal Information"}</Button>
            </div>
        </form>
    );
}

// ── Section: Family Background ────────────────────────────────────────────────

function FamilyBackgroundSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    const fb = pdsData.familyBackground;
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [f, setF] = useState({
        spouseSurname: fb?.spouseSurname ?? "", spouseFirstName: fb?.spouseFirstName ?? "",
        spouseMiddleName: fb?.spouseMiddleName ?? "", spouseNameExtension: fb?.spouseNameExtension ?? "",
        spouseOccupation: fb?.spouseOccupation ?? "", spouseEmployerName: fb?.spouseEmployerName ?? "",
        spouseBusinessAddress: fb?.spouseBusinessAddress ?? "", spouseTelephoneNo: fb?.spouseTelephoneNo ?? "",
        fatherSurname: fb?.fatherSurname ?? "", fatherFirstName: fb?.fatherFirstName ?? "",
        fatherMiddleName: fb?.fatherMiddleName ?? "", fatherNameExtension: fb?.fatherNameExtension ?? "",
        motherMaidenSurname: fb?.motherMaidenSurname ?? "", motherFirstName: fb?.motherFirstName ?? "",
        motherMiddleName: fb?.motherMiddleName ?? "",
    });
    const n = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [key]: e.target.value }));

    const [children, setChildren] = useState(pdsData.children.map(c => ({ ...c })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addChild() { setChildren(prev => [...prev, { id: "", fullName: "", birthDate: null, sortOrder: prev.length }]); }

    function handleSaveFamily(e: React.FormEvent) {
        e.preventDefault(); setError(null); setSuccess(null);
        startTransition(async () => {
            const result = await wsUpdateFamilyBackgroundAction({
                pdsProfileId, campusId, familyId: fb?.id ?? null,
                spouseSurname: f.spouseSurname || null, spouseFirstName: f.spouseFirstName || null,
                spouseMiddleName: f.spouseMiddleName || null, spouseNameExtension: f.spouseNameExtension || null,
                spouseOccupation: f.spouseOccupation || null, spouseEmployerName: f.spouseEmployerName || null,
                spouseBusinessAddress: f.spouseBusinessAddress || null, spouseTelephoneNo: f.spouseTelephoneNo || null,
                fatherSurname: f.fatherSurname || null, fatherFirstName: f.fatherFirstName || null,
                fatherMiddleName: f.fatherMiddleName || null, fatherNameExtension: f.fatherNameExtension || null,
                motherMaidenSurname: f.motherMaidenSurname || null, motherFirstName: f.motherFirstName || null,
                motherMiddleName: f.motherMiddleName || null,
            });
            if (result.ok) setSuccess("Family background saved."); else setError(result.error);
        });
    }

    async function saveChild(idx: number) {
        setSavingIdx(idx);
        const c = children[idx];
        const result = await wsUpsertChildAction({ pdsProfileId, campusId, childId: c.id || null, fullName: c.fullName, birthDate: c.birthDate, sortOrder: idx });
        if (result.ok && result.id && !c.id) setChildren(prev => prev.map((ch, i) => i === idx ? { ...ch, id: result.id! } : ch));
        setSavingIdx(null);
    }

    async function deleteChild(idx: number) {
        const c = children[idx];
        if (!c.id) { setChildren(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteChildAction({ pdsProfileId, childId: c.id });
        setChildren(prev => prev.filter((_, i) => i !== idx));
        setDeletingIdx(null);
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSaveFamily} className="space-y-4">
                <ErrorBanner message={error} /><SuccessBanner message={success} />
                <div>
                    <SectionHeader title="Spouse Information" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Surname"><Input value={f.spouseSurname} onChange={n("spouseSurname")} /></FieldRow>
                        <FieldRow label="First Name"><Input value={f.spouseFirstName} onChange={n("spouseFirstName")} /></FieldRow>
                        <FieldRow label="Middle Name"><Input value={f.spouseMiddleName} onChange={n("spouseMiddleName")} /></FieldRow>
                        <FieldRow label="Name Extension"><Input value={f.spouseNameExtension} onChange={n("spouseNameExtension")} /></FieldRow>
                        <FieldRow label="Occupation"><Input value={f.spouseOccupation} onChange={n("spouseOccupation")} /></FieldRow>
                        <FieldRow label="Employer / Business Name"><Input value={f.spouseEmployerName} onChange={n("spouseEmployerName")} /></FieldRow>
                        <FieldRow label="Business Address"><Input value={f.spouseBusinessAddress} onChange={n("spouseBusinessAddress")} /></FieldRow>
                        <FieldRow label="Telephone No."><Input value={f.spouseTelephoneNo} onChange={n("spouseTelephoneNo")} /></FieldRow>
                    </div>
                </div>
                <div>
                    <SectionHeader title="Father" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <FieldRow label="Surname"><Input value={f.fatherSurname} onChange={n("fatherSurname")} /></FieldRow>
                        <FieldRow label="First Name"><Input value={f.fatherFirstName} onChange={n("fatherFirstName")} /></FieldRow>
                        <FieldRow label="Middle Name"><Input value={f.fatherMiddleName} onChange={n("fatherMiddleName")} /></FieldRow>
                        <FieldRow label="Name Extension"><Input value={f.fatherNameExtension} onChange={n("fatherNameExtension")} /></FieldRow>
                    </div>
                </div>
                <div>
                    <SectionHeader title="Mother (Maiden Name)" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Maiden Surname"><Input value={f.motherMaidenSurname} onChange={n("motherMaidenSurname")} /></FieldRow>
                        <FieldRow label="First Name"><Input value={f.motherFirstName} onChange={n("motherFirstName")} /></FieldRow>
                        <FieldRow label="Middle Name"><Input value={f.motherMiddleName} onChange={n("motherMiddleName")} /></FieldRow>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Family Background"}</Button>
                </div>
            </form>
            <div className="space-y-3">
                <SectionHeader title="Children" />
                {children.map((c, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <FieldRow label="Full Name *">
                                <Input value={c.fullName} onChange={e => setChildren(prev => prev.map((ch, i) => i === idx ? { ...ch, fullName: e.target.value } : ch))} />
                            </FieldRow>
                            <FieldRow label="Date of Birth">
                                <Input type="date" value={c.birthDate?.slice(0, 10) ?? ""} onChange={e => setChildren(prev => prev.map((ch, i) => i === idx ? { ...ch, birthDate: e.target.value || null } : ch))} />
                            </FieldRow>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteChild(idx)}>
                                {deletingIdx === idx ? "Removing…" : "Remove"}
                            </Button>
                            <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveChild(idx)}>
                                {savingIdx === idx ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addChild}>+ Add Child</Button>
            </div>
        </div>
    );
}

// ── Section: Educational Background ──────────────────────────────────────────

const EDUCATION_LEVELS = ["elementary", "secondary", "vocational", "college", "graduate"];
const EDU_LEVEL_LABELS: Record<string, string> = { elementary: "ELEMENTARY", secondary: "SECONDARY", vocational: "VOCATIONAL COURSE", college: "COLLEGE", graduate: "GRADUATE STUDIES" };

function EducationSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    type EduRow = { id: string; level: string; schoolName: string; degreeCourse: string; periodFromYear: string; periodToYear: string; highestLevelUnits: string; yearGraduated: string; scholarshipHonors: string; sortOrder: number };
    const [rows, setRows] = useState<EduRow[]>(pdsData.education.map(e => ({
        id: e.id, level: e.level, schoolName: e.schoolName ?? "", degreeCourse: e.degreeCourse ?? "",
        periodFromYear: e.periodFromYear?.toString() ?? "", periodToYear: e.periodToYear?.toString() ?? "",
        highestLevelUnits: e.highestLevelUnits ?? "", yearGraduated: e.yearGraduated?.toString() ?? "",
        scholarshipHonors: e.scholarshipHonors ?? "", sortOrder: e.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", level: "college", schoolName: "", degreeCourse: "", periodFromYear: "", periodToYear: "", highestLevelUnits: "", yearGraduated: "", scholarshipHonors: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof EduRow, val: string) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const result = await wsUpsertEducationAction({ pdsProfileId, campusId, educationId: r.id || null, level: r.level, schoolName: r.schoolName || null, degreeCourse: r.degreeCourse || null, periodFromYear: r.periodFromYear ? parseInt(r.periodFromYear) : null, periodToYear: r.periodToYear ? parseInt(r.periodToYear) : null, highestLevelUnits: r.highestLevelUnits || null, yearGraduated: r.yearGraduated ? parseInt(r.yearGraduated) : null, scholarshipHonors: r.scholarshipHonors || null, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteEducationAction({ pdsProfileId, educationId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Level *">
                            <select value={r.level} onChange={e => setField(idx, "level", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{EDU_LEVEL_LABELS[l]}</option>)}
                            </select>
                        </FieldRow>
                        <FieldRow label="School Name"><Input value={r.schoolName} onChange={e => setField(idx, "schoolName", e.target.value)} /></FieldRow>
                        <FieldRow label="Degree / Course"><Input value={r.degreeCourse} onChange={e => setField(idx, "degreeCourse", e.target.value)} /></FieldRow>
                        <FieldRow label="Period From (Year)"><Input type="number" value={r.periodFromYear} onChange={e => setField(idx, "periodFromYear", e.target.value)} /></FieldRow>
                        <FieldRow label="Period To (Year)"><Input type="number" value={r.periodToYear} onChange={e => setField(idx, "periodToYear", e.target.value)} /></FieldRow>
                        <FieldRow label="Highest Level / Units Earned"><Input value={r.highestLevelUnits} onChange={e => setField(idx, "highestLevelUnits", e.target.value)} /></FieldRow>
                        <FieldRow label="Year Graduated"><Input type="number" value={r.yearGraduated} onChange={e => setField(idx, "yearGraduated", e.target.value)} /></FieldRow>
                        <FieldRow label="Scholarship / Honors Received"><Input value={r.scholarshipHonors} onChange={e => setField(idx, "scholarshipHonors", e.target.value)} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Education</Button>
        </div>
    );
}

// ── Section: Civil Service Eligibility ───────────────────────────────────────

function EligibilitySection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    type ERow = { id: string; eligibilityName: string; rating: string; examinationDate: string; examinationPlace: string; licenseNumber: string; licenseValidUntil: string; sortOrder: number };
    const [rows, setRows] = useState<ERow[]>(pdsData.eligibilities.map(e => ({
        id: e.id, eligibilityName: e.eligibilityName, rating: e.rating ?? "", examinationDate: e.examinationDate?.slice(0, 10) ?? "",
        examinationPlace: e.examinationPlace ?? "", licenseNumber: e.licenseNumber ?? "", licenseValidUntil: e.licenseValidUntil?.slice(0, 10) ?? "", sortOrder: e.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", eligibilityName: "", rating: "", examinationDate: "", examinationPlace: "", licenseNumber: "", licenseValidUntil: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof ERow, val: string) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const result = await wsUpsertEligibilityAction({ pdsProfileId, campusId, eligibilityId: r.id || null, eligibilityName: r.eligibilityName, rating: r.rating || null, examinationDate: r.examinationDate || null, examinationPlace: r.examinationPlace || null, licenseNumber: r.licenseNumber || null, licenseValidUntil: r.licenseValidUntil || null, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteEligibilityAction({ pdsProfileId, eligibilityId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Career Service / RA 1080 / OTHERS *"><Input value={r.eligibilityName} onChange={e => setField(idx, "eligibilityName", e.target.value)} /></FieldRow>
                        <FieldRow label="Rating (if applicable)"><Input value={r.rating} onChange={e => setField(idx, "rating", e.target.value)} /></FieldRow>
                        <FieldRow label="Date of Examination / Conferment"><Input type="date" value={r.examinationDate} onChange={e => setField(idx, "examinationDate", e.target.value)} /></FieldRow>
                        <FieldRow label="Place of Examination / Conferment"><Input value={r.examinationPlace} onChange={e => setField(idx, "examinationPlace", e.target.value)} /></FieldRow>
                        <FieldRow label="License Number (if applicable)"><Input value={r.licenseNumber} onChange={e => setField(idx, "licenseNumber", e.target.value)} /></FieldRow>
                        <FieldRow label="License Valid Until"><Input type="date" value={r.licenseValidUntil} onChange={e => setField(idx, "licenseValidUntil", e.target.value)} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Eligibility</Button>
        </div>
    );
}

// ── Section: Work Experience ──────────────────────────────────────────────────

function WorkExperienceSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    type WRow = { id: string; dateFrom: string; dateTo: string; isCurrent: boolean; positionTitle: string; departmentAgencyOfficeCompany: string; monthlySalary: string; salaryGradeStep: string; appointmentStatus: string; isGovernmentService: string; sortOrder: number };
    const [rows, setRows] = useState<WRow[]>(pdsData.workExperiences.map(w => ({
        id: w.id, dateFrom: w.dateFrom?.slice(0, 10) ?? "", dateTo: w.dateTo?.slice(0, 10) ?? "", isCurrent: w.isCurrent,
        positionTitle: w.positionTitle, departmentAgencyOfficeCompany: w.departmentAgencyOfficeCompany ?? "",
        monthlySalary: w.monthlySalary?.toString() ?? "", salaryGradeStep: w.salaryGradeStep ?? "",
        appointmentStatus: w.appointmentStatus ?? "", isGovernmentService: w.isGovernmentService === null ? "" : (w.isGovernmentService ? "yes" : "no"),
        sortOrder: w.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", dateFrom: "", dateTo: "", isCurrent: false, positionTitle: "", departmentAgencyOfficeCompany: "", monthlySalary: "", salaryGradeStep: "", appointmentStatus: "", isGovernmentService: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof WRow, val: string | boolean) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const govSvc = r.isGovernmentService === "yes" ? true : r.isGovernmentService === "no" ? false : null;
        const result = await wsUpsertWorkExperienceAction({ pdsProfileId, campusId, workExpId: r.id || null, dateFrom: r.dateFrom || null, dateTo: r.dateTo || null, isCurrent: r.isCurrent, positionTitle: r.positionTitle, departmentAgencyOfficeCompany: r.departmentAgencyOfficeCompany || null, monthlySalary: r.monthlySalary ? parseFloat(r.monthlySalary) : null, salaryGradeStep: r.salaryGradeStep || null, appointmentStatus: r.appointmentStatus || null, isGovernmentService: govSvc, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteWorkExperienceAction({ pdsProfileId, workExpId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Position Title *"><Input value={r.positionTitle} onChange={e => setField(idx, "positionTitle", e.target.value)} /></FieldRow>
                        <FieldRow label="Department / Agency / Office / Company"><Input value={r.departmentAgencyOfficeCompany} onChange={e => setField(idx, "departmentAgencyOfficeCompany", e.target.value)} /></FieldRow>
                        <FieldRow label="Monthly Salary"><Input type="number" value={r.monthlySalary} onChange={e => setField(idx, "monthlySalary", e.target.value)} /></FieldRow>
                        <FieldRow label="Salary Grade & Step Increment"><Input value={r.salaryGradeStep} onChange={e => setField(idx, "salaryGradeStep", e.target.value)} placeholder="e.g. 12-1" /></FieldRow>
                        <FieldRow label="Status of Appointment"><Input value={r.appointmentStatus} onChange={e => setField(idx, "appointmentStatus", e.target.value)} placeholder="Permanent, Casual, etc." /></FieldRow>
                        <FieldRow label="Gov't Service?">
                            <select value={r.isGovernmentService} onChange={e => setField(idx, "isGovernmentService", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                            </select>
                        </FieldRow>
                        <FieldRow label="Date From"><Input type="date" value={r.dateFrom} onChange={e => setField(idx, "dateFrom", e.target.value)} /></FieldRow>
                        <FieldRow label="Date To">
                            <Input type="date" value={r.isCurrent ? "" : r.dateTo} onChange={e => setField(idx, "dateTo", e.target.value)} disabled={r.isCurrent} />
                        </FieldRow>
                        <FieldRow label="Currently Employed Here?">
                            <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={r.isCurrent} onChange={e => setField(idx, "isCurrent", e.target.checked)} className="h-4 w-4" />
                                Present
                            </label>
                        </FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Work Experience</Button>
        </div>
    );
}

// ── Section: Voluntary Work ───────────────────────────────────────────────────

function VoluntaryWorkSection({ pdsProfileId, campusId, voluntaryWork }: { pdsProfileId: string; campusId: string; voluntaryWork: PdsVoluntaryWork[] }) {
    type VRow = { id: string; organizationName: string; organizationAddress: string; dateFrom: string; dateTo: string; hoursCount: string; positionNatureOfWork: string; sortOrder: number };
    const [rows, setRows] = useState<VRow[]>(voluntaryWork.map(v => ({
        id: v.id, organizationName: v.organizationName, organizationAddress: v.organizationAddress ?? "",
        dateFrom: v.dateFrom?.slice(0, 10) ?? "", dateTo: v.dateTo?.slice(0, 10) ?? "",
        hoursCount: v.hoursCount?.toString() ?? "", positionNatureOfWork: v.positionNatureOfWork ?? "", sortOrder: v.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", organizationName: "", organizationAddress: "", dateFrom: "", dateTo: "", hoursCount: "", positionNatureOfWork: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof VRow, val: string) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const result = await wsUpsertVoluntaryWorkAction({ pdsProfileId, campusId, voluntaryWorkId: r.id || null, organizationName: r.organizationName, organizationAddress: r.organizationAddress || null, dateFrom: r.dateFrom || null, dateTo: r.dateTo || null, hoursCount: r.hoursCount ? parseFloat(r.hoursCount) : null, positionNatureOfWork: r.positionNatureOfWork || null, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteVoluntaryWorkAction({ pdsProfileId, voluntaryWorkId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Name / Address of Organization *"><Input value={r.organizationName} onChange={e => setField(idx, "organizationName", e.target.value)} /></FieldRow>
                        <FieldRow label="Organization Address"><Input value={r.organizationAddress} onChange={e => setField(idx, "organizationAddress", e.target.value)} /></FieldRow>
                        <FieldRow label="Position / Nature of Work"><Input value={r.positionNatureOfWork} onChange={e => setField(idx, "positionNatureOfWork", e.target.value)} /></FieldRow>
                        <FieldRow label="Date From"><Input type="date" value={r.dateFrom} onChange={e => setField(idx, "dateFrom", e.target.value)} /></FieldRow>
                        <FieldRow label="Date To"><Input type="date" value={r.dateTo} onChange={e => setField(idx, "dateTo", e.target.value)} /></FieldRow>
                        <FieldRow label="No. of Hours"><Input type="number" step="0.5" value={r.hoursCount} onChange={e => setField(idx, "hoursCount", e.target.value)} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Voluntary Work</Button>
        </div>
    );
}

// ── Section: Learning & Development ──────────────────────────────────────────

function LearningSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    type LRow = { id: string; title: string; dateFrom: string; dateTo: string; hoursCount: string; learningType: string; conductedBy: string; sortOrder: number };
    const [rows, setRows] = useState<LRow[]>(pdsData.learningDevelopment.map(l => ({
        id: l.id, title: l.title, dateFrom: l.dateFrom?.slice(0, 10) ?? "", dateTo: l.dateTo?.slice(0, 10) ?? "",
        hoursCount: l.hoursCount?.toString() ?? "", learningType: l.learningType ?? "", conductedBy: l.conductedBy ?? "", sortOrder: l.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", title: "", dateFrom: "", dateTo: "", hoursCount: "", learningType: "", conductedBy: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof LRow, val: string) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const result = await wsUpsertLearningAction({ pdsProfileId, campusId, learningId: r.id || null, title: r.title, dateFrom: r.dateFrom || null, dateTo: r.dateTo || null, hoursCount: r.hoursCount ? parseFloat(r.hoursCount) : null, learningType: r.learningType || null, conductedBy: r.conductedBy || null, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteLearningAction({ pdsProfileId, learningId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="Title of L&D / Training Programs *"><Input value={r.title} onChange={e => setField(idx, "title", e.target.value)} /></FieldRow>
                        <FieldRow label="Conducted / Sponsored By"><Input value={r.conductedBy} onChange={e => setField(idx, "conductedBy", e.target.value)} /></FieldRow>
                        <FieldRow label="Type of L&D">
                            <select value={r.learningType} onChange={e => setField(idx, "learningType", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="">— Select —</option>
                                {["Managerial", "Supervisory", "Technical", "Foundation"].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </FieldRow>
                        <FieldRow label="Date From"><Input type="date" value={r.dateFrom} onChange={e => setField(idx, "dateFrom", e.target.value)} /></FieldRow>
                        <FieldRow label="Date To"><Input type="date" value={r.dateTo} onChange={e => setField(idx, "dateTo", e.target.value)} /></FieldRow>
                        <FieldRow label="No. of Hours"><Input type="number" value={r.hoursCount} onChange={e => setField(idx, "hoursCount", e.target.value)} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add L&D Entry</Button>
        </div>
    );
}

// ── Section: Other Information ────────────────────────────────────────────────

type SimpleRow = { id: string; value: string; sortOrder: number };

function SimpleList({ items, setItems, onSave, onDelete, listKey, label, placeholder, saving, deleting }: {
    items: SimpleRow[];
    setItems: React.Dispatch<React.SetStateAction<SimpleRow[]>>;
    onSave: (i: number) => void;
    onDelete: (i: number) => void;
    listKey: string;
    label: string;
    placeholder?: string;
    saving: { type: string; idx: number } | null;
    deleting: { type: string; idx: number } | null;
}) {
    return (
        <div className="space-y-2">
            <SectionHeader title={label} />
            {items.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    <Input value={r.value} placeholder={placeholder} onChange={e => setItems(prev => prev.map((s, i) => i === idx ? { ...s, value: e.target.value } : s))} className="flex-1" />
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" disabled={deleting?.type === listKey && deleting.idx === idx} onClick={() => onDelete(idx)}>Remove</Button>
                    <Button type="button" size="sm" disabled={saving?.type === listKey && saving.idx === idx} onClick={() => onSave(idx)} className="shrink-0">{saving?.type === listKey && saving.idx === idx ? "Saving…" : "Save"}</Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { id: "", value: "", sortOrder: prev.length }])}>+ Add</Button>
        </div>
    );
}

function OtherInfoSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    const [skills, setSkills] = useState<SimpleRow[]>(pdsData.skills.map(s => ({ id: s.id, value: s.skillName, sortOrder: s.sortOrder })));
    const [recognitions, setRecognitions] = useState<SimpleRow[]>(pdsData.recognitions.map(r => ({ id: r.id, value: r.recognitionTitle, sortOrder: r.sortOrder })));
    const [memberships, setMemberships] = useState<SimpleRow[]>(pdsData.memberships.map(m => ({ id: m.id, value: m.organizationName, sortOrder: m.sortOrder })));
    const [saving, setSaving] = useState<{ type: string; idx: number } | null>(null);
    const [deleting, setDeleting] = useState<{ type: string; idx: number } | null>(null);

    async function saveSkill(idx: number) {
        setSaving({ type: "skill", idx }); const r = skills[idx];
        const result = await wsUpsertSkillAction({ pdsProfileId, campusId, skillId: r.id || null, skillName: r.value, sortOrder: idx });
        if (result.ok && result.id && !r.id) setSkills(prev => prev.map((s, i) => i === idx ? { ...s, id: result.id! } : s));
        setSaving(null);
    }
    async function deleteSkill(idx: number) {
        const r = skills[idx];
        if (!r.id) { setSkills(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeleting({ type: "skill", idx });
        await wsDeleteSkillAction({ pdsProfileId, skillId: r.id });
        setSkills(prev => prev.filter((_, i) => i !== idx)); setDeleting(null);
    }

    async function saveRecognition(idx: number) {
        setSaving({ type: "rec", idx }); const r = recognitions[idx];
        const result = await wsUpsertRecognitionAction({ pdsProfileId, campusId, recognitionId: r.id || null, recognitionTitle: r.value, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRecognitions(prev => prev.map((s, i) => i === idx ? { ...s, id: result.id! } : s));
        setSaving(null);
    }
    async function deleteRecognition(idx: number) {
        const r = recognitions[idx];
        if (!r.id) { setRecognitions(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeleting({ type: "rec", idx });
        await wsDeleteRecognitionAction({ pdsProfileId, recognitionId: r.id });
        setRecognitions(prev => prev.filter((_, i) => i !== idx)); setDeleting(null);
    }

    async function saveMembership(idx: number) {
        setSaving({ type: "mem", idx }); const r = memberships[idx];
        const result = await wsUpsertMembershipAction({ pdsProfileId, campusId, membershipId: r.id || null, organizationName: r.value, sortOrder: idx });
        if (result.ok && result.id && !r.id) setMemberships(prev => prev.map((s, i) => i === idx ? { ...s, id: result.id! } : s));
        setSaving(null);
    }
    async function deleteMembership(idx: number) {
        const r = memberships[idx];
        if (!r.id) { setMemberships(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeleting({ type: "mem", idx });
        await wsDeleteMembershipAction({ pdsProfileId, membershipId: r.id });
        setMemberships(prev => prev.filter((_, i) => i !== idx)); setDeleting(null);
    }

    return (
        <div className="space-y-6">
            <SimpleList items={skills} setItems={setSkills} onSave={saveSkill} onDelete={deleteSkill} listKey="skill" label="Special Skills / Hobbies" placeholder="e.g. Public Speaking, Drawing" saving={saving} deleting={deleting} />
            <SimpleList items={recognitions} setItems={setRecognitions} onSave={saveRecognition} onDelete={deleteRecognition} listKey="rec" label="Non-Academic Distinctions / Recognitions" placeholder="e.g. Best Employee Award 2024" saving={saving} deleting={deleting} />
            <SimpleList items={memberships} setItems={setMemberships} onSave={saveMembership} onDelete={deleteMembership} listKey="mem" label="Membership in Association / Organization" placeholder="e.g. Philippine Nurses Association" saving={saving} deleting={deleting} />
        </div>
    );
}

// ── Section: References ───────────────────────────────────────────────────────

function ReferencesSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    type RRow = { id: string; fullName: string; address: string; telephoneNo: string; email: string; sortOrder: number };
    const [rows, setRows] = useState<RRow[]>(pdsData.references.map(r => ({
        id: r.id, fullName: r.fullName, address: r.address ?? "", telephoneNo: r.telephoneNo ?? "", email: r.email ?? "", sortOrder: r.sortOrder,
    })));
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

    function addRow() { setRows(prev => [...prev, { id: "", fullName: "", address: "", telephoneNo: "", email: "", sortOrder: prev.length }]); }
    function setField(idx: number, key: keyof RRow, val: string) { setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r)); }

    async function saveRow(idx: number) {
        setSavingIdx(idx); const r = rows[idx];
        const result = await wsUpsertReferenceAction({ pdsProfileId, campusId, referenceId: r.id || null, fullName: r.fullName, address: r.address || null, telephoneNo: r.telephoneNo || null, email: r.email || null, sortOrder: idx });
        if (result.ok && result.id && !r.id) setRows(prev => prev.map((ro, i) => i === idx ? { ...ro, id: result.id! } : ro));
        setSavingIdx(null);
    }
    async function deleteRow(idx: number) {
        const r = rows[idx];
        if (!r.id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        await wsDeleteReferenceAction({ pdsProfileId, referenceId: r.id });
        setRows(prev => prev.filter((_, i) => i !== idx)); setDeletingIdx(null);
    }

    return (
        <div className="space-y-3">
            {rows.map((r, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <FieldRow label="Full Name *"><Input value={r.fullName} onChange={e => setField(idx, "fullName", e.target.value)} /></FieldRow>
                        <FieldRow label="Address"><Input value={r.address} onChange={e => setField(idx, "address", e.target.value)} /></FieldRow>
                        <FieldRow label="Telephone No."><Input value={r.telephoneNo} onChange={e => setField(idx, "telephoneNo", e.target.value)} /></FieldRow>
                        <FieldRow label="Email"><Input type="email" value={r.email} onChange={e => setField(idx, "email", e.target.value)} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingIdx === idx} onClick={() => deleteRow(idx)}>{deletingIdx === idx ? "Removing…" : "Remove"}</Button>
                        <Button type="button" size="sm" disabled={savingIdx === idx} onClick={() => saveRow(idx)}>{savingIdx === idx ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Reference</Button>
        </div>
    );
}

// ── Section: Declaration ──────────────────────────────────────────────────────

const DECLARATION_QUESTIONS = [
    { key: "q34a", label: "34a. Have you been found guilty of any administrative offense?" },
    { key: "q34b", label: "34b. Have you been criminally charged before any court?" },
    { key: "q34c", label: "34c. Have you ever been convicted of any crime or violation?" },
    { key: "q34d", label: "34d. Have you been separated from the service in the government as a result of an administrative case?" },
    { key: "q34e", label: "34e. Have you ever been a candidate in a national or local election held within the last year (except barangay)?" },
    { key: "q34f", label: "34f. Have you resigned from the government within the past year to participate in the election?" },
    { key: "q35", label: "35. Have you acquired the status of an immigrant or permanent resident of another country?" },
    { key: "q36", label: "36. Are you or have you ever been involved in any organization?" },
    { key: "q37", label: "37. Have you ever been a member of an organization that advocates violence or overthrow of the government?" },
    { key: "q38", label: "38. Have you ever been convicted, imprisoned, or dismissed for moral turpitude?" },
    { key: "q39", label: "39. Have you ever been formally charged or found guilty of possession of illegal drugs?" },
    { key: "q40", label: "40. Have you ever been found guilty of sexual harassment?" },
];

function DeclarationSection({ pdsProfileId, campusId, pdsData }: { pdsProfileId: string; campusId: string; pdsData: EmployeePdsData }) {
    const decl = pdsData.declaration;
    const govId = pdsData.governmentId;
    const [pending, startTransition] = useTransition();
    const [declError, setDeclError] = useState<string | null>(null);
    const [declSuccess, setDeclSuccess] = useState<string | null>(null);
    const [govError, setGovError] = useState<string | null>(null);
    const [govSuccess, setGovSuccess] = useState<string | null>(null);

    const [declarationId, setDeclarationId] = useState<string | null>(decl?.id ?? null);
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const q of DECLARATION_QUESTIONS) init[q.key] = String(decl?.answers?.[q.key] ?? "").toUpperCase();
        return init;
    });
    const [explanations, setExplanations] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const q of DECLARATION_QUESTIONS) init[q.key] = String(decl?.explanations?.[q.key] ?? "");
        return init;
    });
    const [declarationDate, setDeclarationDate] = useState(decl?.declarationDate?.slice(0, 10) ?? "");
    const [administeringOfficer, setAdministeringOfficer] = useState(decl?.administeringOfficer ?? "");
    const [govIdId, setGovIdId] = useState<string | null>(govId?.id ?? null);
    const [govForm, setGovForm] = useState({ idType: govId?.idType ?? "", idNumber: govId?.idNumber ?? "", issuedAt: govId?.issuedAt?.slice(0, 10) ?? "", issuedPlace: govId?.issuedPlace ?? "", issuingAgency: govId?.issuingAgency ?? "" });

    function handleSaveDeclaration(e: React.FormEvent) {
        e.preventDefault(); setDeclError(null); setDeclSuccess(null);
        startTransition(async () => {
            const result = await wsUpsertDeclarationAction({ pdsProfileId, campusId, declarationId, answers, explanations, declarationDate: declarationDate || null, administeringOfficer: administeringOfficer || null });
            if (result.ok) { if (result.id && !declarationId) setDeclarationId(result.id); setDeclSuccess("Declaration saved."); } else setDeclError(result.error);
        });
    }

    function handleSaveGovId(e: React.FormEvent) {
        e.preventDefault(); setGovError(null); setGovSuccess(null);
        startTransition(async () => {
            const result = await wsUpsertGovernmentIdAction({ pdsProfileId, campusId, governmentIdId: govIdId, idType: govForm.idType, idNumber: govForm.idNumber, issuedAt: govForm.issuedAt || null, issuedPlace: govForm.issuedPlace || null, issuingAgency: govForm.issuingAgency || null });
            if (result.ok) { if (result.id && !govIdId) setGovIdId(result.id); setGovSuccess("Government ID saved."); } else setGovError(result.error);
        });
    }

    return (
        <div className="space-y-8">
            <form onSubmit={handleSaveDeclaration} className="space-y-4">
                <SectionHeader title="Legal Questions (Items 34–40)" />
                <ErrorBanner message={declError} /><SuccessBanner message={declSuccess} />
                <div className="space-y-3">
                    {DECLARATION_QUESTIONS.map(({ key, label }) => (
                        <div key={key} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                            <p className="text-sm leading-5">{label}</p>
                            <div className="flex items-center gap-4">
                                {["YES", "NO"].map(val => (
                                    <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                        <input type="radio" name={key} value={val} checked={answers[key] === val} onChange={() => setAnswers(p => ({ ...p, [key]: val }))} className="h-4 w-4" />
                                        {val.charAt(0) + val.slice(1).toLowerCase()}
                                    </label>
                                ))}
                            </div>
                            {answers[key] === "YES" && (
                                <FieldRow label="If YES, please give details">
                                    <Input value={explanations[key]} onChange={e => setExplanations(p => ({ ...p, [key]: e.target.value }))} placeholder="Provide details…" />
                                </FieldRow>
                            )}
                        </div>
                    ))}
                </div>
                <div>
                    <SectionHeader title="Declaration Details" />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FieldRow label="Date of Declaration"><Input type="date" value={declarationDate} onChange={e => setDeclarationDate(e.target.value)} /></FieldRow>
                        <FieldRow label="Administering Officer"><Input value={administeringOfficer} onChange={e => setAdministeringOfficer(e.target.value)} /></FieldRow>
                    </div>
                </div>
                <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Declaration"}</Button></div>
            </form>
            <form onSubmit={handleSaveGovId} className="space-y-4">
                <SectionHeader title="Government-Issued ID" />
                <ErrorBanner message={govError} /><SuccessBanner message={govSuccess} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="ID Type *"><Input value={govForm.idType} onChange={e => setGovForm(p => ({ ...p, idType: e.target.value }))} placeholder="e.g. Passport, Driver's License" /></FieldRow>
                    <FieldRow label="ID No. *"><Input value={govForm.idNumber} onChange={e => setGovForm(p => ({ ...p, idNumber: e.target.value }))} /></FieldRow>
                    <FieldRow label="Date Issued"><Input type="date" value={govForm.issuedAt} onChange={e => setGovForm(p => ({ ...p, issuedAt: e.target.value }))} /></FieldRow>
                    <FieldRow label="Place of Issue"><Input value={govForm.issuedPlace} onChange={e => setGovForm(p => ({ ...p, issuedPlace: e.target.value }))} /></FieldRow>
                    <FieldRow label="Issuing Agency"><Input value={govForm.issuingAgency} onChange={e => setGovForm(p => ({ ...p, issuingAgency: e.target.value }))} /></FieldRow>
                </div>
                <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Government ID"}</Button></div>
            </form>
        </div>
    );
}

// ── Section: Review & Generate ────────────────────────────────────────────────

function ReviewGenerateSection({ pdsData, profileId, profileStatus, onStatusChange }: {
    pdsData: EmployeePdsData;
    profileId: string | null;
    profileStatus: string | null;
    onStatusChange: (status: string) => void;
}) {
    const checks = [
        { label: "Personal Information", ok: !!pdsData.personalInfo?.surname },
        { label: "Family Background", ok: !!pdsData.familyBackground },
        { label: "Educational Background", ok: pdsData.education.length > 0 },
        { label: "Civil Service Eligibility", ok: pdsData.eligibilities.length > 0 },
        { label: "Work Experience", ok: pdsData.workExperiences.length > 0 },
        { label: "References", ok: pdsData.references.length > 0 },
        { label: "Declaration", ok: !!pdsData.declaration },
        { label: "Government-Issued ID", ok: !!pdsData.governmentId },
    ];
    const allPassed = checks.every(c => c.ok);
    const incompleteSections = checks.filter(c => !c.ok).map(c => c.label);
    const [isPending, startTransition] = useTransition();

    const isAlreadyPending = profileStatus === "ready_for_review" || profileStatus === "under_hr_review";
    const isVerified = profileStatus === "verified" || profileStatus === "generated";
    const isReturnedForCorrection = profileStatus === "returned_for_correction";

    function handleSubmit() {
        if (!profileId) return;
        startTransition(async () => {
            const result = await submitPdsForReviewAction(profileId);
            if (result.ok) {
                onStatusChange("ready_for_review");
                toast.success("Your PDS has been submitted for HR review.");
            } else {
                toast.error(result.error);
            }
        });
    }

    const statusLabel = PDS_STATUS_LABELS[profileStatus as keyof typeof PDS_STATUS_LABELS] ?? "Draft";

    return (
        <div className="space-y-4">
            <SectionHeader title="Validation Summary" />
            <div className="space-y-2">
                {checks.map(c => (
                    <div key={c.label} className={cn("flex items-center gap-3 rounded-lg border px-4 py-2 text-sm", c.ok ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30")}>
                        {c.ok
                            ? <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                            : <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                        <span className={c.ok ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}>{c.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{c.ok ? "Complete" : "Incomplete"}</span>
                    </div>
                ))}
            </div>

            {/* Status banners */}
            {isAlreadyPending && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 text-sm text-blue-700 dark:text-blue-300">
                    Your PDS has been submitted and is pending HR review. You will be notified if HR returns it for revision.
                </div>
            )}
            {isReturnedForCorrection && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">
                    Your PDS was returned for correction by HR. Please update the required sections and resubmit.
                </div>
            )}
            {isVerified && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-sm text-green-700 dark:text-green-300">
                    Your PDS has been verified by HR. Future edits will start a new revision draft.
                </div>
            )}
            {!isAlreadyPending && !isVerified && allPassed && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-sm text-green-700 dark:text-green-300">
                    All required sections are complete. Your PDS is ready to submit for HR review.
                </div>
            )}
            {!isAlreadyPending && !isVerified && !allPassed && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">
                    Some sections are incomplete. Please complete: {incompleteSections.join(", ")}.
                </div>
            )}

            <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                    Status: <span className="font-medium">{statusLabel}</span>
                </p>
                {isAlreadyPending ? (
                    <Button type="button" variant="outline" disabled>
                        Pending HR Review
                    </Button>
                ) : isVerified ? (
                    <Button type="button" variant="outline" disabled>
                        Verified by HR
                    </Button>
                ) : (
                    <Button
                        type="button"
                        disabled={!allPassed || !profileId || isPending}
                        onClick={handleSubmit}
                    >
                        {isPending ? "Submitting…" : "Submit for HR Review"}
                    </Button>
                )}
            </div>
        </div>
    );
}

// ── Completion helpers ────────────────────────────────────────────────────────

function computeCompletion(pdsData: EmployeePdsData) {
    const checks = [
        !!pdsData.personalInfo?.surname,
        !!pdsData.personalInfo?.firstName,
        !!pdsData.personalInfo?.birthDate,
        !!pdsData.personalInfo?.citizenship,
        !!pdsData.familyBackground,
        pdsData.education.length > 0,
        pdsData.workExperiences.length > 0,
        pdsData.references.length > 0,
        !!pdsData.declaration,
        !!pdsData.governmentId,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function PdsWorkspaceShell({ employeeId: _employeeId, campusId, pdsData }: Props) {
    const [activeSectionKey, setActiveSectionKey] = useState<PdsSectionKey>("overview");
    const [profileId, setProfileId] = useState<string | null>(pdsData.profileId);
    const [profileStatus, setProfileStatus] = useState<string | null>(pdsData.profileStatus);
    const completionScore = computeCompletion(pdsData);

    const currentIndex = PDS_SECTIONS.findIndex(s => s.key === activeSectionKey);
    const nextSection = PDS_SECTIONS[currentIndex + 1];
    const prevSection = PDS_SECTIONS[currentIndex - 1];
    const activeSection = PDS_SECTIONS[currentIndex];

    function renderSectionContent() {
        if (!profileId && activeSectionKey !== "overview") {
            return (
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-inset/50 p-6 text-center text-sm text-muted-foreground">
                    Please initialize your PDS draft from the Overview section first.
                </div>
            );
        }

        switch (activeSectionKey) {
            case "overview":
                return <OverviewSection pdsData={pdsData} profileId={profileId} profileStatus={profileStatus} onInit={setProfileId} />;
            case "personal_information":
                return <PersonalInfoSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "family_background":
                return <FamilyBackgroundSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "educational_background":
                return <EducationSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "civil_service_eligibility":
                return <EligibilitySection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "work_experience":
                return <WorkExperienceSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "voluntary_work":
                return <VoluntaryWorkSection pdsProfileId={profileId!} campusId={campusId} voluntaryWork={pdsData.voluntaryWork} />;
            case "learning_development":
                return <LearningSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "other_information":
                return <OtherInfoSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "references":
                return <ReferencesSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "declaration":
                return <DeclarationSection pdsProfileId={profileId!} campusId={campusId} pdsData={pdsData} />;
            case "review_generate":
                return <ReviewGenerateSection pdsData={pdsData} profileId={profileId} profileStatus={profileStatus} onStatusChange={setProfileStatus} />;
            default:
                return <div className="p-4 text-sm text-muted-foreground">Section coming soon.</div>;
        }
    }

    function sectionStatus(key: PdsSectionKey): "complete" | "draft" | "not_started" {
        if (!profileId) return "not_started";
        switch (key) {
            case "overview": return "draft";
            case "personal_information": return pdsData.personalInfo?.surname ? "complete" : "not_started";
            case "family_background": return pdsData.familyBackground ? "complete" : "not_started";
            case "educational_background": return pdsData.education.length > 0 ? "complete" : "not_started";
            case "civil_service_eligibility": return pdsData.eligibilities.length > 0 ? "complete" : "not_started";
            case "work_experience": return pdsData.workExperiences.length > 0 ? "complete" : "not_started";
            case "voluntary_work": return pdsData.voluntaryWork.length > 0 ? "complete" : "not_started";
            case "learning_development": return pdsData.learningDevelopment.length > 0 ? "complete" : "not_started";
            case "other_information": return pdsData.skills.length > 0 || pdsData.memberships.length > 0 ? "complete" : "not_started";
            case "references": return pdsData.references.length > 0 ? "complete" : "not_started";
            case "declaration": return pdsData.declaration ? "complete" : "not_started";
            case "review_generate": return "not_started";
            default: return "not_started";
        }
    }

    function completionTone(score: number) {
        if (score >= 90) return "active" as const;
        if (score >= 50) return "pending" as const;
        return "inactive" as const;
    }

    return (
        <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
            {/* Left: Section navigation */}
            <ContentSection
                size="compact"
                header={
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold">PDS Sections</h2>
                            <p className="text-xs text-muted-foreground">CSC Form No. 212 Revised 2025</p>
                        </div>
                        <Badge variant="outline">{completionScore}%</Badge>
                    </div>
                }
            >
                <nav aria-label="PDS sections" className="space-y-0.5">
                    {PDS_SECTIONS.map((section) => {
                        const status = sectionStatus(section.key);
                        const isActive = section.key === activeSectionKey;
                        return (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => setActiveSectionKey(section.key)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                                    isActive ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                                )}
                            >
                                {status === "complete"
                                    ? <CheckCircle2 className="size-4 text-status-success shrink-0" aria-hidden />
                                    : status === "draft"
                                        ? <Circle className="size-4 text-primary shrink-0" aria-hidden />
                                        : <Circle className="size-4 text-muted-foreground/50 shrink-0" aria-hidden />}
                                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                                <span className="text-[11px] text-muted-foreground shrink-0">{section.sheet}</span>
                            </button>
                        );
                    })}
                </nav>
            </ContentSection>

            {/* Main: Current section form */}
            <main className="space-y-4">
                <ContentSection
                    header={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-semibold">{activeSection.label}</h2>
                                    <Badge variant="outline">{activeSection.sheet}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{activeSection.description}</p>
                            </div>
                            {pdsData.profileUpdatedAt && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    Saved {new Date(pdsData.profileUpdatedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    }
                    footer={
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-muted-foreground">Section data will autosave as draft records.</p>
                            <div className="flex gap-2">
                                {prevSection && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveSectionKey(prevSection.key)}>
                                        ← Back
                                    </Button>
                                )}
                                {nextSection && (
                                    <Button type="button" size="sm" onClick={() => setActiveSectionKey(nextSection.key)}>
                                        Continue →
                                    </Button>
                                )}
                            </div>
                        </div>
                    }
                >
                    {renderSectionContent()}
                </ContentSection>
            </main>

            {/* Right: Completion panel */}
            <aside className="space-y-4">
                <ContentSection
                    size="compact"
                    header={<h2 className="text-sm font-semibold">Completion</h2>}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <StatusBadge tone={completionTone(completionScore)} label={PDS_STATUS_LABELS[profileStatus as keyof typeof PDS_STATUS_LABELS] ?? "Draft"} />
                            <span className="text-sm font-semibold tabular-nums">{completionScore}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionScore}%` }} />
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="rounded-md border border-border/70 p-2">
                                <dt>Sections</dt>
                                <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">{PDS_SECTIONS.length - 2}</dd>
                            </div>
                            <div className="rounded-md border border-border/70 p-2">
                                <dt>Completed</dt>
                                <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                                    {PDS_SECTIONS.filter(s => sectionStatus(s.key) === "complete").length}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </ContentSection>

                <ContentSection
                    size="compact"
                    header={<h2 className="text-sm font-semibold">Review Lock</h2>}
                >
                    <div className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 flex size-8 items-center justify-center rounded-md border bg-surface-inset text-muted-foreground shrink-0">
                            <LockKeyhole className="size-4" aria-hidden />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">
                                {profileStatus === "verified" || profileStatus === "generated"
                                    ? "Verified"
                                    : profileStatus === "ready_for_review" || profileStatus === "under_hr_review"
                                        ? "Pending HR Review"
                                        : "Draft version"}
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {profileStatus === "verified" || profileStatus === "generated"
                                    ? "This PDS has been verified by HR. Future edits will create a new draft."
                                    : profileStatus === "ready_for_review" || profileStatus === "under_hr_review"
                                        ? "Your PDS has been submitted and is pending HR review."
                                        : "Verified PDS versions will be locked and future edits will create a new draft."}
                            </p>
                        </div>
                    </div>
                </ContentSection>

                <ContentSection
                    size="compact"
                    header={<h2 className="text-sm font-semibold">Quick Navigation</h2>}
                >
                    <div className="flex flex-wrap gap-1">
                        {PDS_SECTIONS.filter(s => s.sheet !== "Workspace").map(s => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setActiveSectionKey(s.key)}
                                className={cn(
                                    "rounded px-2 py-1 text-[11px] transition-colors",
                                    activeSectionKey === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                            >
                                {s.sheet}
                            </button>
                        ))}
                    </div>
                </ContentSection>
            </aside>
        </div>
    );
}

