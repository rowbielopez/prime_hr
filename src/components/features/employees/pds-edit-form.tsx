"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
    PdsEducation,
    PdsPersonalInfo,
    PdsFamilyBackground,
    PdsChild,
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
} from "@/features/employees/repository/pds.types";
import { getEducationLevelLabel, LEVEL_LABELS } from "@/features/employees/repository/pds.types";
import {
    updatePersonalInfoAction,
    updateFamilyBackgroundAction,
    upsertChildAction,
    deleteChildAction,
    upsertEducationAction,
    upsertEligibilityAction,
    deleteEligibilityAction,
    upsertWorkExperienceAction,
    deleteWorkExperienceAction,
    upsertVoluntaryWorkAction,
    deleteVoluntaryWorkAction,
    upsertLearningAction,
    deleteLearningAction,
    upsertSkillAction,
    deleteSkillAction,
    upsertRecognitionAction,
    deleteRecognitionAction,
    upsertMembershipAction,
    deleteMembershipAction,
    upsertReferenceAction,
    deleteReferenceAction,
    upsertDeclarationAction,
    upsertGovernmentIdAction,
    type AddressInput,
} from "@/features/employees/pds-edit.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    personalInfo: PdsPersonalInfo | null;
    familyBackground: PdsFamilyBackground | null;
    pdsChildren: PdsChild[];
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

function ErrorBanner({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
        </p>
    );
}

function SuccessBanner({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <p className="rounded-md border border-green-600/40 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
            {message}
        </p>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
            {title}
        </p>
    );
}

type RowResult = { ok: boolean; msg: string };

// ── Personal Info Tab ─────────────────────────────────────────────────────────

type AddrState = {
    houseNo: string;
    street: string;
    barangay: string;
    cityMunicipality: string;
    province: string;
    zipCode: string;
    country: string;
};

function addrToInput(a: AddrState): AddressInput {
    return {
        houseNo: a.houseNo || null,
        street: a.street || null,
        barangay: a.barangay || null,
        cityMunicipality: a.cityMunicipality || null,
        province: a.province || null,
        zipCode: a.zipCode || null,
        country: a.country || null,
    };
}

function AddressFieldGroup({
    label,
    addr,
    onChange,
}: {
    label: string;
    addr: AddrState;
    onChange: (key: keyof AddrState, value: string) => void;
}) {
    const set = (key: keyof AddrState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(key, e.target.value);
    return (
        <div>
            <SectionHeader title={label} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldRow label="House / Block / Lot No.">
                    <Input value={addr.houseNo} onChange={set("houseNo")} />
                </FieldRow>
                <FieldRow label="Street">
                    <Input value={addr.street} onChange={set("street")} />
                </FieldRow>
                <FieldRow label="Barangay / Subdivision / Village">
                    <Input value={addr.barangay} onChange={set("barangay")} />
                </FieldRow>
                <FieldRow label="City / Municipality">
                    <Input value={addr.cityMunicipality} onChange={set("cityMunicipality")} />
                </FieldRow>
                <FieldRow label="Province">
                    <Input value={addr.province} onChange={set("province")} />
                </FieldRow>
                <FieldRow label="Zip Code">
                    <Input value={addr.zipCode} onChange={set("zipCode")} />
                </FieldRow>
                <FieldRow label="Country">
                    <Input value={addr.country} onChange={set("country")} />
                </FieldRow>
            </div>
        </div>
    );
}

function PersonalInfoForm({
    employeeId,
    pdsProfileId,
    personalInfo,
}: {
    employeeId: string;
    pdsProfileId: string;
    personalInfo: PdsPersonalInfo | null;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const parsedRes = parseAddress((personalInfo?.residentialAddress ?? {}) as Record<string, unknown>);
    const parsedPerm = parseAddress((personalInfo?.permanentAddress ?? {}) as Record<string, unknown>);

    const [form, setForm] = useState({
        surname: personalInfo?.surname ?? "",
        firstName: personalInfo?.firstName ?? "",
        middleName: personalInfo?.middleName ?? "",
        nameExtension: personalInfo?.nameExtension ?? "",
        birthDate: personalInfo?.birthDate?.slice(0, 10) ?? "",
        birthPlace: personalInfo?.birthPlace ?? "",
        sexAtBirth: personalInfo?.sexAtBirth ?? "",
        civilStatus: personalInfo?.civilStatus ?? "",
        heightM: personalInfo?.heightM?.toString() ?? "",
        weightKg: personalInfo?.weightKg?.toString() ?? "",
        bloodType: personalInfo?.bloodType ?? "",
        citizenship: personalInfo?.citizenship ?? "",
        dualCitizenshipType: personalInfo?.dualCitizenshipType ?? "",
        dualCitizenshipCountry: personalInfo?.dualCitizenshipCountry ?? "",
        telephoneNo: personalInfo?.telephoneNo ?? "",
        mobileNo: personalInfo?.mobileNo ?? "",
        email: personalInfo?.email ?? "",
        gsisNo: personalInfo?.gsisNo ?? "",
        pagibigNo: personalInfo?.pagibigNo ?? "",
        philhealthNo: personalInfo?.philhealthNo ?? "",
        sssNo: personalInfo?.sssNo ?? "",
        tin: personalInfo?.tin ?? "",
        philsysNo: personalInfo?.philsysNo ?? "",
        agencyEmployeeNo: personalInfo?.agencyEmployeeNo ?? "",
    });

    const [residentialAddr, setResidentialAddr] = useState<AddrState>({
        houseNo: parsedRes.houseNo ?? "",
        street: parsedRes.street ?? "",
        barangay: parsedRes.barangay ?? "",
        cityMunicipality: parsedRes.cityMunicipality ?? "",
        province: parsedRes.province ?? "",
        zipCode: parsedRes.zipCode ?? "",
        country: parsedRes.country ?? "",
    });

    const [permanentAddr, setPermanentAddr] = useState<AddrState>({
        houseNo: parsedPerm.houseNo ?? "",
        street: parsedPerm.street ?? "",
        barangay: parsedPerm.barangay ?? "",
        cityMunicipality: parsedPerm.cityMunicipality ?? "",
        province: parsedPerm.province ?? "",
        zipCode: parsedPerm.zipCode ?? "",
        country: parsedPerm.country ?? "",
    });

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!personalInfo) return;
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await updatePersonalInfoAction({
                employeeId,
                pdsProfileId,
                personalInfoId: personalInfo.id,
                surname: form.surname || null,
                firstName: form.firstName || null,
                middleName: form.middleName || null,
                nameExtension: form.nameExtension || null,
                birthDate: form.birthDate || null,
                birthPlace: form.birthPlace || null,
                sexAtBirth: form.sexAtBirth || null,
                civilStatus: form.civilStatus || null,
                heightM: form.heightM ? parseFloat(form.heightM) : null,
                weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
                bloodType: form.bloodType || null,
                citizenship: form.citizenship || null,
                dualCitizenshipType: form.dualCitizenshipType || null,
                dualCitizenshipCountry: form.dualCitizenshipCountry || null,
                telephoneNo: form.telephoneNo || null,
                mobileNo: form.mobileNo || null,
                email: form.email || null,
                gsisNo: form.gsisNo || null,
                pagibigNo: form.pagibigNo || null,
                philhealthNo: form.philhealthNo || null,
                sssNo: form.sssNo || null,
                tin: form.tin || null,
                philsysNo: form.philsysNo || null,
                agencyEmployeeNo: form.agencyEmployeeNo || null,
                residentialAddress: addrToInput(residentialAddr),
                permanentAddress: addrToInput(permanentAddr),
            });
            if (result.ok) setSuccess("Personal information updated.");
            else setError(result.error);
        });
    }

    if (!personalInfo) {
        return <p className="text-sm text-muted-foreground">No personal information record found.</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <ErrorBanner message={error} />
            <SuccessBanner message={success} />

            <div>
                <SectionHeader title="Name" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldRow label="Surname">
                        <Input value={form.surname} onChange={set("surname")} />
                    </FieldRow>
                    <FieldRow label="First Name">
                        <Input value={form.firstName} onChange={set("firstName")} />
                    </FieldRow>
                    <FieldRow label="Middle Name">
                        <Input value={form.middleName} onChange={set("middleName")} />
                    </FieldRow>
                    <FieldRow label="Name Extension">
                        <Input value={form.nameExtension} onChange={set("nameExtension")} placeholder="Jr. / Sr. / III" />
                    </FieldRow>
                </div>
            </div>

            <div>
                <SectionHeader title="Birth & Personal Details" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="Date of Birth">
                        <Input type="date" value={form.birthDate} onChange={set("birthDate")} />
                    </FieldRow>
                    <FieldRow label="Place of Birth">
                        <Input value={form.birthPlace} onChange={set("birthPlace")} />
                    </FieldRow>
                    <FieldRow label="Sex at Birth">
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            value={form.sexAtBirth}
                            onChange={set("sexAtBirth")}
                        >
                            <option value="">Select…</option>
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                        </select>
                    </FieldRow>
                    <FieldRow label="Civil Status">
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            value={form.civilStatus}
                            onChange={set("civilStatus")}
                        >
                            <option value="">Select…</option>
                            <option>SINGLE</option>
                            <option>MARRIED</option>
                            <option>WIDOWED</option>
                            <option>SEPARATED</option>
                            <option>ANNULLED</option>
                        </select>
                    </FieldRow>
                    <FieldRow label="Blood Type">
                        <Input value={form.bloodType} onChange={set("bloodType")} placeholder="O+" />
                    </FieldRow>
                    <FieldRow label="Height (m)">
                        <Input type="number" step="0.01" value={form.heightM} onChange={set("heightM")} placeholder="1.65" />
                    </FieldRow>
                    <FieldRow label="Weight (kg)">
                        <Input type="number" step="0.1" value={form.weightKg} onChange={set("weightKg")} placeholder="60" />
                    </FieldRow>
                    <FieldRow label="Citizenship">
                        <Input value={form.citizenship} onChange={set("citizenship")} placeholder="Filipino" />
                    </FieldRow>
                </div>
            </div>

            <div>
                <SectionHeader title="Dual Citizenship (if applicable)" />
                <div className="grid gap-3 sm:grid-cols-2">
                    <FieldRow label="Dual Citizenship Type">
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            value={form.dualCitizenshipType}
                            onChange={set("dualCitizenshipType")}
                        >
                            <option value="">N/A</option>
                            <option value="By Birth">By Birth</option>
                            <option value="By Naturalization">By Naturalization</option>
                        </select>
                    </FieldRow>
                    <FieldRow label="Country of Dual Citizenship">
                        <Input value={form.dualCitizenshipCountry} onChange={set("dualCitizenshipCountry")} placeholder="e.g. USA" />
                    </FieldRow>
                </div>
            </div>

            <AddressFieldGroup
                label="Residential Address"
                addr={residentialAddr}
                onChange={(key, value) => setResidentialAddr((prev) => ({ ...prev, [key]: value }))}
            />

            <AddressFieldGroup
                label="Permanent Address"
                addr={permanentAddr}
                onChange={(key, value) => setPermanentAddr((prev) => ({ ...prev, [key]: value }))}
            />

            <div>
                <SectionHeader title="Contact" />
                <div className="grid gap-3 sm:grid-cols-3">
                    <FieldRow label="Telephone No.">
                        <Input value={form.telephoneNo} onChange={set("telephoneNo")} />
                    </FieldRow>
                    <FieldRow label="Mobile No.">
                        <Input value={form.mobileNo} onChange={set("mobileNo")} />
                    </FieldRow>
                    <FieldRow label="Email">
                        <Input type="email" value={form.email} onChange={set("email")} />
                    </FieldRow>
                </div>
            </div>

            <div>
                <SectionHeader title="Government IDs" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="GSIS / UMID No.">
                        <Input value={form.gsisNo} onChange={set("gsisNo")} />
                    </FieldRow>
                    <FieldRow label="Pag-IBIG No.">
                        <Input value={form.pagibigNo} onChange={set("pagibigNo")} />
                    </FieldRow>
                    <FieldRow label="PhilHealth No.">
                        <Input value={form.philhealthNo} onChange={set("philhealthNo")} />
                    </FieldRow>
                    <FieldRow label="SSS No.">
                        <Input value={form.sssNo} onChange={set("sssNo")} />
                    </FieldRow>
                    <FieldRow label="TIN">
                        <Input value={form.tin} onChange={set("tin")} />
                    </FieldRow>
                    <FieldRow label="PhilSys No. (PSN)">
                        <Input value={form.philsysNo} onChange={set("philsysNo")} />
                    </FieldRow>
                    <FieldRow label="Agency Employee No.">
                        <Input value={form.agencyEmployeeNo} onChange={set("agencyEmployeeNo")} />
                    </FieldRow>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save Personal Information"}
                </Button>
            </div>
        </form>
    );
}

// ── Family Background Tab ─────────────────────────────────────────────────────

function FamilyBackgroundForm({
    employeeId,
    pdsProfileId,
    familyBackground,
}: {
    employeeId: string;
    pdsProfileId: string;
    familyBackground: PdsFamilyBackground | null;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [form, setForm] = useState({
        spouseSurname: familyBackground?.spouseSurname ?? "",
        spouseFirstName: familyBackground?.spouseFirstName ?? "",
        spouseMiddleName: familyBackground?.spouseMiddleName ?? "",
        spouseNameExtension: familyBackground?.spouseNameExtension ?? "",
        spouseOccupation: familyBackground?.spouseOccupation ?? "",
        spouseEmployerName: familyBackground?.spouseEmployerName ?? "",
        spouseBusinessAddress: familyBackground?.spouseBusinessAddress ?? "",
        spouseTelephoneNo: familyBackground?.spouseTelephoneNo ?? "",
        fatherSurname: familyBackground?.fatherSurname ?? "",
        fatherFirstName: familyBackground?.fatherFirstName ?? "",
        fatherMiddleName: familyBackground?.fatherMiddleName ?? "",
        fatherNameExtension: familyBackground?.fatherNameExtension ?? "",
        motherMaidenSurname: familyBackground?.motherMaidenSurname ?? "",
        motherFirstName: familyBackground?.motherFirstName ?? "",
        motherMiddleName: familyBackground?.motherMiddleName ?? "",
    });

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }));

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!familyBackground) return;
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await updateFamilyBackgroundAction({
                employeeId,
                pdsProfileId,
                familyId: familyBackground.id,
                spouseSurname: form.spouseSurname || null,
                spouseFirstName: form.spouseFirstName || null,
                spouseMiddleName: form.spouseMiddleName || null,
                spouseNameExtension: form.spouseNameExtension || null,
                spouseOccupation: form.spouseOccupation || null,
                spouseEmployerName: form.spouseEmployerName || null,
                spouseBusinessAddress: form.spouseBusinessAddress || null,
                spouseTelephoneNo: form.spouseTelephoneNo || null,
                fatherSurname: form.fatherSurname || null,
                fatherFirstName: form.fatherFirstName || null,
                fatherMiddleName: form.fatherMiddleName || null,
                fatherNameExtension: form.fatherNameExtension || null,
                motherMaidenSurname: form.motherMaidenSurname || null,
                motherFirstName: form.motherFirstName || null,
                motherMiddleName: form.motherMiddleName || null,
            });
            if (result.ok) setSuccess("Family background updated.");
            else setError(result.error);
        });
    }

    if (!familyBackground) {
        return <p className="text-sm text-muted-foreground">No family background record found for this employee.</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <ErrorBanner message={error} />
            <SuccessBanner message={success} />

            <div>
                <SectionHeader title="Spouse Information" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="Spouse Surname">
                        <Input value={form.spouseSurname} onChange={set("spouseSurname")} />
                    </FieldRow>
                    <FieldRow label="Spouse First Name">
                        <Input value={form.spouseFirstName} onChange={set("spouseFirstName")} />
                    </FieldRow>
                    <FieldRow label="Spouse Middle Name">
                        <Input value={form.spouseMiddleName} onChange={set("spouseMiddleName")} />
                    </FieldRow>
                    <FieldRow label="Spouse Name Extension">
                        <Input value={form.spouseNameExtension} onChange={set("spouseNameExtension")} placeholder="Jr. / Sr. / III" />
                    </FieldRow>
                    <FieldRow label="Occupation / Nature of Business">
                        <Input value={form.spouseOccupation} onChange={set("spouseOccupation")} />
                    </FieldRow>
                    <FieldRow label="Employer / Business Name">
                        <Input value={form.spouseEmployerName} onChange={set("spouseEmployerName")} />
                    </FieldRow>
                    <div className="sm:col-span-2 lg:col-span-2">
                        <FieldRow label="Business Address">
                            <Input value={form.spouseBusinessAddress} onChange={set("spouseBusinessAddress")} />
                        </FieldRow>
                    </div>
                    <FieldRow label="Telephone No.">
                        <Input value={form.spouseTelephoneNo} onChange={set("spouseTelephoneNo")} />
                    </FieldRow>
                </div>
            </div>

            <div>
                <SectionHeader title="Father's Name" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldRow label="Surname">
                        <Input value={form.fatherSurname} onChange={set("fatherSurname")} />
                    </FieldRow>
                    <FieldRow label="First Name">
                        <Input value={form.fatherFirstName} onChange={set("fatherFirstName")} />
                    </FieldRow>
                    <FieldRow label="Middle Name">
                        <Input value={form.fatherMiddleName} onChange={set("fatherMiddleName")} />
                    </FieldRow>
                    <FieldRow label="Name Extension">
                        <Input value={form.fatherNameExtension} onChange={set("fatherNameExtension")} placeholder="Jr. / Sr." />
                    </FieldRow>
                </div>
            </div>

            <div>
                <SectionHeader title="Mother's Maiden Name" />
                <div className="grid gap-3 sm:grid-cols-3">
                    <FieldRow label="Maiden Surname">
                        <Input value={form.motherMaidenSurname} onChange={set("motherMaidenSurname")} />
                    </FieldRow>
                    <FieldRow label="First Name">
                        <Input value={form.motherFirstName} onChange={set("motherFirstName")} />
                    </FieldRow>
                    <FieldRow label="Middle Name">
                        <Input value={form.motherMiddleName} onChange={set("motherMiddleName")} />
                    </FieldRow>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save Family Background"}
                </Button>
            </div>
        </form>
    );
}

// ── Children ──────────────────────────────────────────────────────────────────

type ChildRow = { id: string | null; fullName: string; birthDate: string; sortOrder: number };

function ChildrenForm({
    employeeId,
    pdsProfileId,
    campusId,
    pdsChildren,
}: {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    pdsChildren: PdsChild[];
}) {
    const router = useRouter();
    const [rows, setRows] = useState<ChildRow[]>(() =>
        pdsChildren.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            birthDate: c.birthDate?.slice(0, 10) ?? "",
            sortOrder: c.sortOrder,
        }))
    );
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function addRow() {
        setRows((prev) => [...prev, { id: null, fullName: "", birthDate: "", sortOrder: prev.length }]);
    }

    function setField(rowIdx: number, key: keyof ChildRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => {
                const next = [...prev];
                next[rowIdx] = { ...next[rowIdx], [key]: e.target.value };
                return next;
            });
    }

    function saveRow(idx: number) {
        const row = rows[idx];
        setSavingIdx(idx);
        startTransition(async () => {
            const result = await upsertChildAction({
                employeeId,
                pdsProfileId,
                campusId,
                childId: row.id,
                fullName: row.fullName,
                birthDate: row.birthDate || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], id: result.id! };
                    return next;
                });
            }
            setResults((prev) => ({
                ...prev,
                [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error },
            }));
            setSavingIdx(null);
        });
    }

    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteChildAction({ employeeId, pdsProfileId, childId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div>
            <SectionHeader title="Children" />
            <div className="space-y-3">
                {rows.map((row, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">Child {idx + 1}</span>
                            {results[idx] && (
                                <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>
                                    {results[idx].msg}
                                </span>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FieldRow label="Full Name *">
                                <Input value={row.fullName} onChange={setField(idx, "fullName")} />
                            </FieldRow>
                            <FieldRow label="Date of Birth">
                                <Input type="date" value={row.birthDate} onChange={setField(idx, "birthDate")} />
                            </FieldRow>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                                disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                                {pending && deletingIdx === idx ? "Removing…" : "Remove"}
                            </Button>
                            <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                                {pending && savingIdx === idx ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Child</Button>
            </div>
        </div>
    );
}

// ── Education Tab ─────────────────────────────────────────────────────────────

const EDU_LEVEL_OPTIONS: { value: string; label: string }[] = [
    { value: "elementary", label: LEVEL_LABELS.elementary },
    { value: "secondary", label: LEVEL_LABELS.secondary },
    { value: "vocational", label: LEVEL_LABELS.vocational },
    { value: "college", label: LEVEL_LABELS.college },
    { value: "graduate", label: LEVEL_LABELS.graduate },
];

type EduRow = {
    id: string | null;
    level: string;
    schoolName: string;
    degreeCourse: string;
    periodFromYear: string;
    periodToYear: string;
    highestLevelUnits: string;
    yearGraduated: string;
    scholarshipHonors: string;
};

function EducationForm({
    employeeId,
    pdsProfileId,
    campusId,
    education,
}: {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    education: PdsEducation[];
}) {
    const allRows: EduRow[] = EDU_LEVEL_OPTIONS.map(({ value, label }) => {
        const existing = education.find((e) => getEducationLevelLabel(e.level) === label);
        return existing
            ? {
                id: existing.id,
                level: value,
                schoolName: existing.schoolName ?? "",
                degreeCourse: existing.degreeCourse ?? "",
                periodFromYear: existing.periodFromYear?.toString() ?? "",
                periodToYear: existing.periodToYear?.toString() ?? "",
                highestLevelUnits: existing.highestLevelUnits ?? "",
                yearGraduated: existing.yearGraduated?.toString() ?? "",
                scholarshipHonors: existing.scholarshipHonors ?? "",
            }
            : { id: null, level: value, schoolName: "", degreeCourse: "", periodFromYear: "", periodToYear: "", highestLevelUnits: "", yearGraduated: "", scholarshipHonors: "" };
    });

    const [rows, setRows] = useState<EduRow[]>(allRows);
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function setField(rowIdx: number, key: keyof EduRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => {
                const next = [...prev];
                next[rowIdx] = { ...next[rowIdx], [key]: e.target.value };
                return next;
            });
    }

    function saveRow(idx: number) {
        const row = rows[idx];
        setSavingIdx(idx);
        startTransition(async () => {
            const result = await upsertEducationAction({
                employeeId, pdsProfileId, campusId,
                educationId: row.id,
                level: row.level,
                schoolName: row.schoolName || null,
                degreeCourse: row.degreeCourse || null,
                periodFromYear: row.periodFromYear ? parseInt(row.periodFromYear) : null,
                periodToYear: row.periodToYear ? parseInt(row.periodToYear) : null,
                highestLevelUnits: row.highestLevelUnits || null,
                yearGraduated: row.yearGraduated ? parseInt(row.yearGraduated) : null,
                scholarshipHonors: row.scholarshipHonors || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }

    return (
        <div className="space-y-4">
            {rows.map((row, idx) => (
                <div key={row.level} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">{EDU_LEVEL_OPTIONS[idx].label}</h3>
                        {results[idx] && (
                            <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <FieldRow label="School / University">
                            <Input value={row.schoolName} onChange={setField(idx, "schoolName")} />
                        </FieldRow>
                        <FieldRow label="Degree / Course">
                            <Input value={row.degreeCourse} onChange={setField(idx, "degreeCourse")} />
                        </FieldRow>
                        <FieldRow label="Highest Level / Units Earned">
                            <Input value={row.highestLevelUnits} onChange={setField(idx, "highestLevelUnits")} />
                        </FieldRow>
                        <FieldRow label="From (Year)">
                            <Input type="number" min="1900" max="2200" value={row.periodFromYear} onChange={setField(idx, "periodFromYear")} />
                        </FieldRow>
                        <FieldRow label="To (Year)">
                            <Input type="number" min="1900" max="2200" value={row.periodToYear} onChange={setField(idx, "periodToYear")} />
                        </FieldRow>
                        <FieldRow label="Year Graduated">
                            <Input type="number" min="1900" max="2200" value={row.yearGraduated} onChange={setField(idx, "yearGraduated")} />
                        </FieldRow>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Scholarship / Academic Honors">
                                <Input value={row.scholarshipHonors} onChange={setField(idx, "scholarshipHonors")} />
                            </FieldRow>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Eligibility Tab ───────────────────────────────────────────────────────────

type EligRow = {
    id: string | null;
    eligibilityName: string;
    rating: string;
    examinationDate: string;
    examinationPlace: string;
    licenseNumber: string;
    licenseValidUntil: string;
    sortOrder: number;
};

function EligibilityForm({
    employeeId, pdsProfileId, campusId, eligibilities,
}: {
    employeeId: string; pdsProfileId: string; campusId: string; eligibilities: PdsEligibility[];
}) {
    const router = useRouter();
    const [rows, setRows] = useState<EligRow[]>(() =>
        eligibilities.map((e) => ({
            id: e.id,
            eligibilityName: e.eligibilityName,
            rating: e.rating ?? "",
            examinationDate: e.examinationDate?.slice(0, 10) ?? "",
            examinationPlace: e.examinationPlace ?? "",
            licenseNumber: e.licenseNumber ?? "",
            licenseValidUntil: e.licenseValidUntil?.slice(0, 10) ?? "",
            sortOrder: e.sortOrder,
        }))
    );
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function addRow() {
        setRows((prev) => [...prev, { id: null, eligibilityName: "", rating: "", examinationDate: "", examinationPlace: "", licenseNumber: "", licenseValidUntil: "", sortOrder: prev.length }]);
    }
    function setField(rowIdx: number, key: keyof EligRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [key]: e.target.value }; return next; });
    }
    function saveRow(idx: number) {
        setSavingIdx(idx);
        startTransition(async () => {
            const row = rows[idx];
            const result = await upsertEligibilityAction({
                employeeId, pdsProfileId, campusId,
                eligibilityId: row.id,
                eligibilityName: row.eligibilityName,
                rating: row.rating || null,
                examinationDate: row.examinationDate || null,
                examinationPlace: row.examinationPlace || null,
                licenseNumber: row.licenseNumber || null,
                licenseValidUntil: row.licenseValidUntil || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }
    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteEligibilityAction({ employeeId, pdsProfileId, eligibilityId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Eligibility {idx + 1}</span>
                        {results[idx] && <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Career Service / Eligibility *">
                                <Input value={row.eligibilityName} onChange={setField(idx, "eligibilityName")} />
                            </FieldRow>
                        </div>
                        <FieldRow label="Rating"><Input value={row.rating} onChange={setField(idx, "rating")} /></FieldRow>
                        <FieldRow label="Examination Date"><Input type="date" value={row.examinationDate} onChange={setField(idx, "examinationDate")} /></FieldRow>
                        <FieldRow label="Examination Place"><Input value={row.examinationPlace} onChange={setField(idx, "examinationPlace")} /></FieldRow>
                        <FieldRow label="License No."><Input value={row.licenseNumber} onChange={setField(idx, "licenseNumber")} /></FieldRow>
                        <FieldRow label="License Valid Until"><Input type="date" value={row.licenseValidUntil} onChange={setField(idx, "licenseValidUntil")} /></FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                            {pending && deletingIdx === idx ? "Removing…" : "Remove"}
                        </Button>
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Eligibility</Button>
        </div>
    );
}

// ── Work Experience Tab ───────────────────────────────────────────────────────

type WorkRow = {
    id: string | null;
    positionTitle: string;
    departmentAgencyOfficeCompany: string;
    dateFrom: string;
    dateTo: string;
    isCurrent: boolean;
    monthlySalary: string;
    salaryGradeStep: string;
    appointmentStatus: string;
    isGovernmentService: string; // "yes" | "no" | ""
    sortOrder: number;
};

function WorkExperienceForm({
    employeeId, pdsProfileId, campusId, workExperiences,
}: {
    employeeId: string; pdsProfileId: string; campusId: string; workExperiences: PdsWorkExperience[];
}) {
    const router = useRouter();
    const govSvcStr = (v: boolean | null) => v === true ? "yes" : v === false ? "no" : "";
    const [rows, setRows] = useState<WorkRow[]>(() =>
        workExperiences.map((w) => ({
            id: w.id,
            positionTitle: w.positionTitle,
            departmentAgencyOfficeCompany: w.departmentAgencyOfficeCompany ?? "",
            dateFrom: w.dateFrom?.slice(0, 10) ?? "",
            dateTo: w.dateTo?.slice(0, 10) ?? "",
            isCurrent: w.isCurrent,
            monthlySalary: w.monthlySalary?.toString() ?? "",
            salaryGradeStep: w.salaryGradeStep ?? "",
            appointmentStatus: w.appointmentStatus ?? "",
            isGovernmentService: govSvcStr(w.isGovernmentService),
            sortOrder: w.sortOrder,
        }))
    );
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function addRow() {
        setRows((prev) => [...prev, { id: null, positionTitle: "", departmentAgencyOfficeCompany: "", dateFrom: "", dateTo: "", isCurrent: false, monthlySalary: "", salaryGradeStep: "", appointmentStatus: "", isGovernmentService: "", sortOrder: prev.length }]);
    }
    function setField(rowIdx: number, key: keyof WorkRow) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [key]: e.target.value }; return next; });
    }
    function toggleCurrent(rowIdx: number) {
        setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], isCurrent: !next[rowIdx].isCurrent }; return next; });
    }
    function saveRow(idx: number) {
        setSavingIdx(idx);
        startTransition(async () => {
            const row = rows[idx];
            const govSvc = row.isGovernmentService === "yes" ? true : row.isGovernmentService === "no" ? false : null;
            const result = await upsertWorkExperienceAction({
                employeeId, pdsProfileId, campusId,
                workExpId: row.id,
                positionTitle: row.positionTitle,
                departmentAgencyOfficeCompany: row.departmentAgencyOfficeCompany || null,
                dateFrom: row.dateFrom || null,
                dateTo: row.dateTo || null,
                isCurrent: row.isCurrent,
                monthlySalary: row.monthlySalary ? parseFloat(row.monthlySalary) : null,
                salaryGradeStep: row.salaryGradeStep || null,
                appointmentStatus: row.appointmentStatus || null,
                isGovernmentService: govSvc,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }
    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteWorkExperienceAction({ employeeId, pdsProfileId, workExpId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Work Experience {idx + 1}</span>
                        {results[idx] && <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-2">
                            <FieldRow label="Position Title *">
                                <Input value={row.positionTitle} onChange={setField(idx, "positionTitle")} />
                            </FieldRow>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Department / Agency / Office / Company">
                                <Input value={row.departmentAgencyOfficeCompany} onChange={setField(idx, "departmentAgencyOfficeCompany")} />
                            </FieldRow>
                        </div>
                        <FieldRow label="Date From"><Input type="date" value={row.dateFrom} onChange={setField(idx, "dateFrom")} /></FieldRow>
                        <FieldRow label="Date To">
                            <Input type="date" value={row.dateTo} onChange={setField(idx, "dateTo")} disabled={row.isCurrent} />
                        </FieldRow>
                        <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id={`current-${idx}`} checked={row.isCurrent} onChange={() => toggleCurrent(idx)} className="h-4 w-4" />
                            <label htmlFor={`current-${idx}`} className="text-sm">Present</label>
                        </div>
                        <FieldRow label="Monthly Salary">
                            <Input type="number" step="0.01" value={row.monthlySalary} onChange={setField(idx, "monthlySalary")} />
                        </FieldRow>
                        <FieldRow label="Salary Grade / Step">
                            <Input value={row.salaryGradeStep} onChange={setField(idx, "salaryGradeStep")} placeholder="e.g. SG-24 / Step 1" />
                        </FieldRow>
                        <FieldRow label="Appointment Status">
                            <Input value={row.appointmentStatus} onChange={setField(idx, "appointmentStatus")} placeholder="PERMANENT / CASUAL / etc." />
                        </FieldRow>
                        <FieldRow label="Gov. Service?">
                            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                                value={row.isGovernmentService} onChange={setField(idx, "isGovernmentService")}>
                                <option value="">N/A</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </FieldRow>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                            {pending && deletingIdx === idx ? "Removing…" : "Remove"}
                        </Button>
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Work Experience</Button>
        </div>
    );
}

// ── Voluntary Work Tab ────────────────────────────────────────────────────────

type VolWorkRow = {
    id: string | null;
    organizationName: string;
    organizationAddress: string;
    dateFrom: string;
    dateTo: string;
    hoursCount: string;
    positionNatureOfWork: string;
    sortOrder: number;
};

function VoluntaryWorkForm({
    employeeId, pdsProfileId, campusId, voluntaryWork,
}: {
    employeeId: string; pdsProfileId: string; campusId: string; voluntaryWork: PdsVoluntaryWork[];
}) {
    const router = useRouter();
    const [rows, setRows] = useState<VolWorkRow[]>(() =>
        voluntaryWork.map((v) => ({
            id: v.id,
            organizationName: v.organizationName,
            organizationAddress: v.organizationAddress ?? "",
            dateFrom: v.dateFrom?.slice(0, 10) ?? "",
            dateTo: v.dateTo?.slice(0, 10) ?? "",
            hoursCount: v.hoursCount?.toString() ?? "",
            positionNatureOfWork: v.positionNatureOfWork ?? "",
            sortOrder: v.sortOrder,
        }))
    );
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function addRow() {
        setRows((prev) => [...prev, { id: null, organizationName: "", organizationAddress: "", dateFrom: "", dateTo: "", hoursCount: "", positionNatureOfWork: "", sortOrder: prev.length }]);
    }
    function setField(rowIdx: number, key: keyof VolWorkRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [key]: e.target.value }; return next; });
    }
    function saveRow(idx: number) {
        setSavingIdx(idx);
        startTransition(async () => {
            const row = rows[idx];
            const result = await upsertVoluntaryWorkAction({
                employeeId, pdsProfileId, campusId,
                voluntaryWorkId: row.id,
                organizationName: row.organizationName,
                organizationAddress: row.organizationAddress || null,
                dateFrom: row.dateFrom || null,
                dateTo: row.dateTo || null,
                hoursCount: row.hoursCount ? parseFloat(row.hoursCount) : null,
                positionNatureOfWork: row.positionNatureOfWork || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }
    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteVoluntaryWorkAction({ employeeId, pdsProfileId, voluntaryWorkId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Voluntary Work {idx + 1}</span>
                        {results[idx] && <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-2">
                            <FieldRow label="Organization Name *">
                                <Input value={row.organizationName} onChange={setField(idx, "organizationName")} />
                            </FieldRow>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Organization Address">
                                <Input value={row.organizationAddress} onChange={setField(idx, "organizationAddress")} />
                            </FieldRow>
                        </div>
                        <FieldRow label="Date From"><Input type="date" value={row.dateFrom} onChange={setField(idx, "dateFrom")} /></FieldRow>
                        <FieldRow label="Date To"><Input type="date" value={row.dateTo} onChange={setField(idx, "dateTo")} /></FieldRow>
                        <FieldRow label="No. of Hours"><Input type="number" step="0.5" value={row.hoursCount} onChange={setField(idx, "hoursCount")} /></FieldRow>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Position / Nature of Work">
                                <Input value={row.positionNatureOfWork} onChange={setField(idx, "positionNatureOfWork")} />
                            </FieldRow>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                            {pending && deletingIdx === idx ? "Removing…" : "Remove"}
                        </Button>
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Voluntary Work</Button>
        </div>
    );
}

// ── Learning & Development Tab ────────────────────────────────────────────────

type LearnRow = {
    id: string | null;
    title: string;
    dateFrom: string;
    dateTo: string;
    hoursCount: string;
    learningType: string;
    conductedBy: string;
    sortOrder: number;
};

function LearningForm({
    employeeId, pdsProfileId, campusId, learningDevelopment,
}: {
    employeeId: string; pdsProfileId: string; campusId: string; learningDevelopment: PdsLearningDevelopment[];
}) {
    const router = useRouter();
    const [rows, setRows] = useState<LearnRow[]>(() =>
        learningDevelopment.map((l) => ({
            id: l.id,
            title: l.title,
            dateFrom: l.dateFrom?.slice(0, 10) ?? "",
            dateTo: l.dateTo?.slice(0, 10) ?? "",
            hoursCount: l.hoursCount?.toString() ?? "",
            learningType: l.learningType ?? "",
            conductedBy: l.conductedBy ?? "",
            sortOrder: l.sortOrder,
        }))
    );
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function addRow() {
        setRows((prev) => [...prev, { id: null, title: "", dateFrom: "", dateTo: "", hoursCount: "", learningType: "", conductedBy: "", sortOrder: prev.length }]);
    }
    function setField(rowIdx: number, key: keyof LearnRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [key]: e.target.value }; return next; });
    }
    function saveRow(idx: number) {
        setSavingIdx(idx);
        startTransition(async () => {
            const row = rows[idx];
            const result = await upsertLearningAction({
                employeeId, pdsProfileId, campusId,
                learningId: row.id,
                title: row.title,
                dateFrom: row.dateFrom || null,
                dateTo: row.dateTo || null,
                hoursCount: row.hoursCount ? parseFloat(row.hoursCount) : null,
                learningType: row.learningType || null,
                conductedBy: row.conductedBy || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }
    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteLearningAction({ employeeId, pdsProfileId, learningId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Program {idx + 1}</span>
                        {results[idx] && <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-3">
                            <FieldRow label="Title of Learning & Development Intervention *">
                                <Input value={row.title} onChange={setField(idx, "title")} />
                            </FieldRow>
                        </div>
                        <FieldRow label="Date From"><Input type="date" value={row.dateFrom} onChange={setField(idx, "dateFrom")} /></FieldRow>
                        <FieldRow label="Date To"><Input type="date" value={row.dateTo} onChange={setField(idx, "dateTo")} /></FieldRow>
                        <FieldRow label="No. of Hours"><Input type="number" step="0.5" value={row.hoursCount} onChange={setField(idx, "hoursCount")} /></FieldRow>
                        <FieldRow label="Type (Managerial / Technical / etc.)"><Input value={row.learningType} onChange={setField(idx, "learningType")} /></FieldRow>
                        <div className="sm:col-span-2">
                            <FieldRow label="Conducted / Sponsored By"><Input value={row.conductedBy} onChange={setField(idx, "conductedBy")} /></FieldRow>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                            {pending && deletingIdx === idx ? "Removing…" : "Remove"}
                        </Button>
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Program</Button>
        </div>
    );
}

// ── Other Info Tab (Skills / Recognitions / Memberships) ─────────────────────

type SimpleRow = { id: string | null; name: string; sortOrder: number };

function SimpleNameList({
    label,
    addLabel,
    rows,
    onSave,
    onDelete,
    onAdd,
    pending,
    savingIdx,
    deletingIdx,
    results,
}: {
    label: string;
    addLabel: string;
    rows: SimpleRow[];
    onSave: (idx: number) => void;
    onDelete: (idx: number) => void;
    onAdd: () => void;
    pending: boolean;
    savingIdx: number | null;
    deletingIdx: number | null;
    results: Record<number, RowResult>;
}) {
    return (
        <div>
            <SectionHeader title={label} />
            <div className="space-y-2">
                {rows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <Input
                            value={row.name}
                            readOnly
                            className="flex-1"
                            placeholder="(saved)"
                        />
                        {results[idx] && (
                            <span className={`text-xs shrink-0 ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>
                                {results[idx].msg}
                            </span>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0"
                            disabled={pending && deletingIdx === idx} onClick={() => onDelete(idx)}>
                            {pending && deletingIdx === idx ? "…" : "×"}
                        </Button>
                        <Button type="button" size="sm" className="shrink-0" disabled={pending && savingIdx === idx} onClick={() => onSave(idx)}>
                            {pending && savingIdx === idx ? "…" : "Save"}
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onAdd}>{addLabel}</Button>
        </div>
    );
}

function SimpleNameListEditable({
    label,
    addLabel,
    rows,
    setRows,
    onSave,
    onDelete,
    pending,
    savingIdx,
    deletingIdx,
    results,
}: {
    label: string;
    addLabel: string;
    rows: SimpleRow[];
    setRows: React.Dispatch<React.SetStateAction<SimpleRow[]>>;
    onSave: (idx: number) => void;
    onDelete: (idx: number) => void;
    pending: boolean;
    savingIdx: number | null;
    deletingIdx: number | null;
    results: Record<number, RowResult>;
}) {
    void SimpleNameList;
    return (
        <div>
            <SectionHeader title={label} />
            <div className="space-y-2">
                {rows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <Input
                            value={row.name}
                            onChange={(e) => setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], name: e.target.value }; return next; })}
                            className="flex-1"
                        />
                        {results[idx] && (
                            <span className={`text-xs shrink-0 ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0"
                            disabled={pending && deletingIdx === idx} onClick={() => onDelete(idx)}>
                            {pending && deletingIdx === idx ? "…" : "×"}
                        </Button>
                        <Button type="button" size="sm" className="shrink-0" disabled={pending && savingIdx === idx} onClick={() => onSave(idx)}>
                            {pending && savingIdx === idx ? "…" : "Save"}
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setRows((prev) => [...prev, { id: null, name: "", sortOrder: prev.length }])}>{addLabel}</Button>
        </div>
    );
}

function OtherInfoForm({
    employeeId, pdsProfileId, campusId, skills, recognitions, memberships,
}: {
    employeeId: string; pdsProfileId: string; campusId: string;
    skills: PdsSkill[]; recognitions: PdsRecognition[]; memberships: PdsMembership[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [skillRows, setSkillRows] = useState<SimpleRow[]>(() => skills.map((s) => ({ id: s.id, name: s.skillName, sortOrder: s.sortOrder })));
    const [recogRows, setRecogRows] = useState<SimpleRow[]>(() => recognitions.map((r) => ({ id: r.id, name: r.recognitionTitle, sortOrder: r.sortOrder })));
    const [memberRows, setMemberRows] = useState<SimpleRow[]>(() => memberships.map((m) => ({ id: m.id, name: m.organizationName, sortOrder: m.sortOrder })));

    const [skillSavingIdx, setSkillSavingIdx] = useState<number | null>(null);
    const [skillDeletingIdx, setSkillDeletingIdx] = useState<number | null>(null);
    const [skillResults, setSkillResults] = useState<Record<number, RowResult>>({});

    const [recogSavingIdx, setRecogSavingIdx] = useState<number | null>(null);
    const [recogDeletingIdx, setRecogDeletingIdx] = useState<number | null>(null);
    const [recogResults, setRecogResults] = useState<Record<number, RowResult>>({});

    const [memberSavingIdx, setMemberSavingIdx] = useState<number | null>(null);
    const [memberDeletingIdx, setMemberDeletingIdx] = useState<number | null>(null);
    const [memberResults, setMemberResults] = useState<Record<number, RowResult>>({});

    function saveSkill(idx: number) {
        setSkillSavingIdx(idx);
        startTransition(async () => {
            const row = skillRows[idx];
            const result = await upsertSkillAction({ employeeId, pdsProfileId, campusId, skillId: row.id, skillName: row.name, sortOrder: idx });
            if (result.ok && result.id && !row.id) setSkillRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            setSkillResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSkillSavingIdx(null);
        });
    }
    function deleteSkill(idx: number) {
        const row = skillRows[idx];
        if (!row.id) { setSkillRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setSkillDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteSkillAction({ employeeId, pdsProfileId, skillId: row.id! });
            if (result.ok) { setSkillRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setSkillResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setSkillDeletingIdx(null);
        });
    }

    function saveRecog(idx: number) {
        setRecogSavingIdx(idx);
        startTransition(async () => {
            const row = recogRows[idx];
            const result = await upsertRecognitionAction({ employeeId, pdsProfileId, campusId, recognitionId: row.id, recognitionTitle: row.name, sortOrder: idx });
            if (result.ok && result.id && !row.id) setRecogRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            setRecogResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setRecogSavingIdx(null);
        });
    }
    function deleteRecog(idx: number) {
        const row = recogRows[idx];
        if (!row.id) { setRecogRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setRecogDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteRecognitionAction({ employeeId, pdsProfileId, recognitionId: row.id! });
            if (result.ok) { setRecogRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setRecogResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setRecogDeletingIdx(null);
        });
    }

    function saveMember(idx: number) {
        setMemberSavingIdx(idx);
        startTransition(async () => {
            const row = memberRows[idx];
            const result = await upsertMembershipAction({ employeeId, pdsProfileId, campusId, membershipId: row.id, organizationName: row.name, sortOrder: idx });
            if (result.ok && result.id && !row.id) setMemberRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            setMemberResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setMemberSavingIdx(null);
        });
    }
    function deleteMember(idx: number) {
        const row = memberRows[idx];
        if (!row.id) { setMemberRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setMemberDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteMembershipAction({ employeeId, pdsProfileId, membershipId: row.id! });
            if (result.ok) { setMemberRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setMemberResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setMemberDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-8">
            <SimpleNameListEditable
                label="Special Skills / Hobbies"
                addLabel="+ Add Skill"
                rows={skillRows}
                setRows={setSkillRows}
                onSave={saveSkill}
                onDelete={deleteSkill}
                pending={pending}
                savingIdx={skillSavingIdx}
                deletingIdx={skillDeletingIdx}
                results={skillResults}
            />
            <SimpleNameListEditable
                label="Non-Academic Distinctions / Recognitions"
                addLabel="+ Add Recognition"
                rows={recogRows}
                setRows={setRecogRows}
                onSave={saveRecog}
                onDelete={deleteRecog}
                pending={pending}
                savingIdx={recogSavingIdx}
                deletingIdx={recogDeletingIdx}
                results={recogResults}
            />
            <SimpleNameListEditable
                label="Membership in Association / Organization"
                addLabel="+ Add Membership"
                rows={memberRows}
                setRows={setMemberRows}
                onSave={saveMember}
                onDelete={deleteMember}
                pending={pending}
                savingIdx={memberSavingIdx}
                deletingIdx={memberDeletingIdx}
                results={memberResults}
            />
        </div>
    );
}

// ── References Tab ────────────────────────────────────────────────────────────

type RefRow = {
    id: string | null;
    fullName: string;
    address: string;
    telephoneNo: string;
    email: string;
    sortOrder: number;
};

function ReferencesForm({
    employeeId,
    pdsProfileId,
    campusId,
    references,
}: {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    references: PdsReference[];
}) {
    const [rows, setRows] = useState<RefRow[]>(() => {
        const existing: RefRow[] = references.map((r) => ({
            id: r.id,
            fullName: r.fullName,
            address: r.address ?? "",
            telephoneNo: r.telephoneNo ?? "",
            email: r.email ?? "",
            sortOrder: r.sortOrder,
        }));
        while (existing.length < 3) {
            existing.push({ id: null, fullName: "", address: "", telephoneNo: "", email: "", sortOrder: existing.length });
        }
        return existing;
    });

    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, RowResult>>({});

    function setField(rowIdx: number, key: keyof RefRow) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [key]: e.target.value }; return next; });
    }

    function addRow() {
        setRows((prev) => [...prev, { id: null, fullName: "", address: "", telephoneNo: "", email: "", sortOrder: prev.length }]);
    }

    function saveRow(idx: number) {
        const row = rows[idx];
        if (!row.fullName.trim()) {
            setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: "Full name is required." } }));
            return;
        }
        setSavingIdx(idx);
        startTransition(async () => {
            const result = await upsertReferenceAction({
                employeeId, pdsProfileId, campusId,
                referenceId: row.id,
                fullName: row.fullName,
                address: row.address || null,
                telephoneNo: row.telephoneNo || null,
                email: row.email || null,
                sortOrder: idx,
            });
            if (result.ok && result.id && !row.id) {
                setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], id: result.id! }; return next; });
            }
            setResults((prev) => ({ ...prev, [idx]: { ok: result.ok, msg: result.ok ? "Saved." : (result as { ok: false; error: string }).error } }));
            setSavingIdx(null);
        });
    }

    function deleteRow(idx: number) {
        const row = rows[idx];
        if (!row.id) { setRows((prev) => prev.filter((_, i) => i !== idx)); return; }
        setDeletingIdx(idx);
        startTransition(async () => {
            const result = await deleteReferenceAction({ employeeId, pdsProfileId, referenceId: row.id! });
            if (result.ok) { setRows((prev) => prev.filter((_, i) => i !== idx)); router.refresh(); }
            else setResults((prev) => ({ ...prev, [idx]: { ok: false, msg: (result as { ok: false; error: string }).error } }));
            setDeletingIdx(null);
        });
    }

    return (
        <div className="space-y-4">
            {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">Reference {idx + 1}</h3>
                        {results[idx] && <span className={`text-xs ${results[idx].ok ? "text-green-600" : "text-destructive"}`}>{results[idx].msg}</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FieldRow label="Full Name *">
                            <Input value={row.fullName} onChange={setField(idx, "fullName")} placeholder="Juan Dela Cruz" />
                        </FieldRow>
                        <FieldRow label="Telephone No.">
                            <Input value={row.telephoneNo} onChange={setField(idx, "telephoneNo")} />
                        </FieldRow>
                        <div className="sm:col-span-2">
                            <FieldRow label="Address">
                                <Input value={row.address} onChange={setField(idx, "address")} />
                            </FieldRow>
                        </div>
                        <FieldRow label="Email (optional)">
                            <Input type="email" value={row.email} onChange={setField(idx, "email")} />
                        </FieldRow>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                            disabled={pending && deletingIdx === idx} onClick={() => deleteRow(idx)}>
                            {pending && deletingIdx === idx ? "Deleting…" : "Remove"}
                        </Button>
                        <Button type="button" size="sm" disabled={pending && savingIdx === idx} onClick={() => saveRow(idx)}>
                            {pending && savingIdx === idx ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Reference</Button>
        </div>
    );
}

// ── Declaration Tab (items 34–40) ────────────────────────────────────────────

const DECLARATION_QUESTIONS: { key: string; label: string }[] = [
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

function DeclarationForm({
    employeeId,
    pdsProfileId,
    campusId,
    declaration,
    governmentId,
}: {
    employeeId: string;
    pdsProfileId: string;
    campusId: string;
    declaration: PdsDeclaration | null;
    governmentId: PdsGovernmentId | null;
}) {
    const [pending, startTransition] = useTransition();
    const [declError, setDeclError] = useState<string | null>(null);
    const [declSuccess, setDeclSuccess] = useState<string | null>(null);
    const [govError, setGovError] = useState<string | null>(null);
    const [govSuccess, setGovSuccess] = useState<string | null>(null);

    // Declaration state
    const [declarationId, setDeclarationId] = useState<string | null>(declaration?.id ?? null);
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const q of DECLARATION_QUESTIONS) {
            init[q.key] = String(declaration?.answers?.[q.key] ?? "").toUpperCase();
        }
        return init;
    });
    const [explanations, setExplanations] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const q of DECLARATION_QUESTIONS) {
            init[q.key] = String(declaration?.explanations?.[q.key] ?? "");
        }
        return init;
    });
    const [declarationDate, setDeclarationDate] = useState(declaration?.declarationDate?.slice(0, 10) ?? "");
    const [administeringOfficer, setAdministeringOfficer] = useState(declaration?.administeringOfficer ?? "");

    // Government ID state
    const [govIdId, setGovIdId] = useState<string | null>(governmentId?.id ?? null);
    const [govForm, setGovForm] = useState({
        idType: governmentId?.idType ?? "",
        idNumber: governmentId?.idNumber ?? "",
        issuedAt: governmentId?.issuedAt?.slice(0, 10) ?? "",
        issuedPlace: governmentId?.issuedPlace ?? "",
        issuingAgency: governmentId?.issuingAgency ?? "",
    });

    function setAnswer(key: string, val: string) {
        setAnswers((prev) => ({ ...prev, [key]: val }));
    }
    function setExplanation(key: string, val: string) {
        setExplanations((prev) => ({ ...prev, [key]: val }));
    }
    function setGovField(key: keyof typeof govForm) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setGovForm((prev) => ({ ...prev, [key]: e.target.value }));
    }

    function handleSaveDeclaration(e: React.FormEvent) {
        e.preventDefault();
        setDeclError(null);
        setDeclSuccess(null);
        startTransition(async () => {
            const result = await upsertDeclarationAction({
                employeeId,
                pdsProfileId,
                campusId,
                declarationId,
                answers,
                explanations,
                declarationDate: declarationDate || null,
                administeringOfficer: administeringOfficer || null,
            });
            if (result.ok) {
                if (result.id && !declarationId) setDeclarationId(result.id);
                setDeclSuccess("Declaration saved.");
            } else {
                setDeclError(result.error);
            }
        });
    }

    function handleSaveGovId(e: React.FormEvent) {
        e.preventDefault();
        setGovError(null);
        setGovSuccess(null);
        startTransition(async () => {
            const result = await upsertGovernmentIdAction({
                employeeId,
                pdsProfileId,
                campusId,
                governmentIdId: govIdId,
                idType: govForm.idType,
                idNumber: govForm.idNumber,
                issuedAt: govForm.issuedAt || null,
                issuedPlace: govForm.issuedPlace || null,
                issuingAgency: govForm.issuingAgency || null,
                isPrimary: true,
            });
            if (result.ok) {
                if (result.id && !govIdId) setGovIdId(result.id);
                setGovSuccess("Government ID saved.");
            } else {
                setGovError(result.error);
            }
        });
    }

    return (
        <div className="space-y-8">
            {/* Questions 34–40 */}
            <form onSubmit={handleSaveDeclaration} className="space-y-4">
                <SectionHeader title="Legal Questions (Items 34–40)" />
                <ErrorBanner message={declError} />
                <SuccessBanner message={declSuccess} />
                <div className="space-y-3">
                    {DECLARATION_QUESTIONS.map(({ key, label }) => (
                        <div key={key} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                            <p className="text-sm leading-5">{label}</p>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name={key}
                                        value="YES"
                                        checked={answers[key] === "YES"}
                                        onChange={() => setAnswer(key, "YES")}
                                        className="h-4 w-4"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name={key}
                                        value="NO"
                                        checked={answers[key] === "NO"}
                                        onChange={() => setAnswer(key, "NO")}
                                        className="h-4 w-4"
                                    />
                                    No
                                </label>
                            </div>
                            {answers[key] === "YES" && (
                                <FieldRow label="If YES, please give details">
                                    <Input
                                        value={explanations[key]}
                                        onChange={(e) => setExplanation(key, e.target.value)}
                                        placeholder="Provide details…"
                                    />
                                </FieldRow>
                            )}
                        </div>
                    ))}
                </div>
                <div>
                    <SectionHeader title="Declaration Date & Administering Officer" />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FieldRow label="Date of Declaration">
                            <Input type="date" value={declarationDate} onChange={(e) => setDeclarationDate(e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Administering Officer">
                            <Input value={administeringOfficer} onChange={(e) => setAdministeringOfficer(e.target.value)} />
                        </FieldRow>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : "Save Declaration"}
                    </Button>
                </div>
            </form>

            {/* Government-Issued ID */}
            <form onSubmit={handleSaveGovId} className="space-y-4">
                <SectionHeader title="Government-Issued ID" />
                <ErrorBanner message={govError} />
                <SuccessBanner message={govSuccess} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldRow label="ID Type *">
                        <Input value={govForm.idType} onChange={setGovField("idType")} placeholder="e.g. Passport, Driver's License" />
                    </FieldRow>
                    <FieldRow label="ID No. *">
                        <Input value={govForm.idNumber} onChange={setGovField("idNumber")} />
                    </FieldRow>
                    <FieldRow label="Date Issued">
                        <Input type="date" value={govForm.issuedAt} onChange={setGovField("issuedAt")} />
                    </FieldRow>
                    <FieldRow label="Place of Issue">
                        <Input value={govForm.issuedPlace} onChange={setGovField("issuedPlace")} />
                    </FieldRow>
                    <FieldRow label="Issuing Agency">
                        <Input value={govForm.issuingAgency} onChange={setGovField("issuingAgency")} />
                    </FieldRow>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : "Save Government ID"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function PdsEditForm({
    employeeId, pdsProfileId, campusId, personalInfo, familyBackground, pdsChildren,
    education, eligibilities, workExperiences, voluntaryWork, learningDevelopment,
    skills, recognitions, memberships, references, declaration, governmentId,
}: Props) {
    return (
        <Tabs defaultValue="personal" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="family">Family</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                <TabsTrigger value="work">Work</TabsTrigger>
                <TabsTrigger value="voluntary">Voluntary Work</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="other">Other Info</TabsTrigger>
                <TabsTrigger value="references">References</TabsTrigger>
                <TabsTrigger value="declaration">Declaration</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
                <PersonalInfoForm employeeId={employeeId} pdsProfileId={pdsProfileId} personalInfo={personalInfo} />
            </TabsContent>

            <TabsContent value="family" className="space-y-6">
                <FamilyBackgroundForm employeeId={employeeId} pdsProfileId={pdsProfileId} familyBackground={familyBackground} />
                <ChildrenForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} pdsChildren={pdsChildren} />
            </TabsContent>

            <TabsContent value="education">
                <EducationForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} education={education} />
            </TabsContent>

            <TabsContent value="eligibility">
                <EligibilityForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} eligibilities={eligibilities} />
            </TabsContent>

            <TabsContent value="work">
                <WorkExperienceForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} workExperiences={workExperiences} />
            </TabsContent>

            <TabsContent value="voluntary">
                <VoluntaryWorkForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} voluntaryWork={voluntaryWork} />
            </TabsContent>

            <TabsContent value="learning">
                <LearningForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} learningDevelopment={learningDevelopment} />
            </TabsContent>

            <TabsContent value="other">
                <OtherInfoForm
                    employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId}
                    skills={skills} recognitions={recognitions} memberships={memberships}
                />
            </TabsContent>

            <TabsContent value="references">
                <ReferencesForm employeeId={employeeId} pdsProfileId={pdsProfileId} campusId={campusId} references={references} />
            </TabsContent>

            <TabsContent value="declaration">
                <DeclarationForm
                    employeeId={employeeId}
                    pdsProfileId={pdsProfileId}
                    campusId={campusId}
                    declaration={declaration}
                    governmentId={governmentId}
                />
            </TabsContent>
        </Tabs>
    );
}
