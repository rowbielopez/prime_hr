"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { EmployeeFormInput, EmployeeSexValue } from "@/features/employees/schemas/employee-form.schema";
import { employeeSexValues } from "@/features/employees/schemas/employee-form.schema";
import type { EmployeeCampusOption, EmployeeOfficeOption } from "@/features/employees/types";

const sexLabels: Record<(typeof employeeSexValues)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  unknown: "Prefer not to say",
};

const employmentStatusOptions = [
  { label: "Active", value: "active" as const },
  { label: "On Leave", value: "on_leave" as const },
  { label: "Separated", value: "separated" as const },
  { label: "Retired", value: "retired" as const },
];

const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V"];

const civilStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
];

const employmentTypeOptions = [
  { value: "permanent", label: "Permanent" },
  { value: "temporary", label: "Temporary" },
  { value: "casual", label: "Casual" },
  { value: "contractual", label: "Contractual" },
  { value: "cos", label: "Contract of Service (COS)" },
  { value: "jo", label: "Job Order (JO)" },
  { value: "coterminous", label: "Coterminous" },
];

/** Common Philippine government HR separation reasons shown as preset options. */
const SEPARATION_REASON_OPTIONS = [
  { value: "Resignation", label: "Resignation" },
  { value: "Compulsory Retirement", label: "Compulsory Retirement" },
  { value: "Optional Retirement", label: "Optional Retirement" },
  { value: "End of Contract", label: "End of Contract" },
  { value: "Expiration of Appointment", label: "Expiration of Appointment" },
  { value: "Dropped from the Rolls", label: "Dropped from the Rolls" },
  { value: "Death", label: "Death" },
  { value: "Dismissal", label: "Dismissal" },
  { value: "Transfer to Another Agency", label: "Transfer to Another Agency" },
  { value: "other", label: "Other (specify below)..." },
];

/** Values that come from SEPARATION_REASON_OPTIONS (excluding the sentinel "other"). */
const PRESET_REASONS = new Set(SEPARATION_REASON_OPTIONS.map((o) => o.value).filter((v) => v !== "other"));

const SEPARATED_STATUSES = new Set(["separated", "retired"]);

type EmployeeFormFieldsProps = {
  formState: EmployeeFormInput;
  setFormState: React.Dispatch<React.SetStateAction<EmployeeFormInput>>;
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
  /** When true, the Additional Details section starts expanded. Default: false */
  defaultExpanded?: boolean;
  /** Optional ref forwarded to the Employee No. input — used for focus management. */
  employeeNoRef?: React.RefObject<HTMLInputElement | null>;
  /** When true, the email field is rendered read-only (non-Super Admin users). */
  emailReadOnly?: boolean;
};

export function EmployeeFormFields({
  formState,
  setFormState,
  campuses,
  offices,
  defaultExpanded = false,
  employeeNoRef,
  emailReadOnly = false,
}: EmployeeFormFieldsProps) {
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(defaultExpanded);
  const internalRef = useRef<HTMLInputElement>(null);
  const resolvedRef = employeeNoRef ?? internalRef;

  const officeOptions = offices.filter((office) => office.campusId === formState.campusId);

  const selectedCampus = campuses.find((c) => c.id === formState.campusId);
  const selectedCampusLabel = selectedCampus ? `${selectedCampus.code} — ${selectedCampus.name}` : "Select campus";

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-no">
              Employee No <span className="text-destructive">*</span>
            </label>
            <Input
              id="emp-no"
              ref={resolvedRef}
              value={formState.employeeNo}
              onChange={(e) => setFormState((prev) => ({ ...prev, employeeNo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-first">
              First Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="emp-first"
              value={formState.firstName}
              onChange={(e) => setFormState((prev) => ({ ...prev, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-middle">
              Middle Name
            </label>
            <Input
              id="emp-middle"
              value={formState.middleName ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, middleName: e.target.value || null }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-last">
              Last Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="emp-last"
              value={formState.lastName}
              onChange={(e) => setFormState((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Suffix</label>
            <Select
              value={formState.suffix ?? "__none__"}
              onValueChange={(v) =>
                v !== null && setFormState((prev) => ({ ...prev, suffix: v === "__none__" ? null : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{formState.suffix ?? "None"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {suffixOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-birth">
              Birth Date
            </label>
            <Input
              id="emp-birth"
              type="date"
              value={formState.birthDate ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, birthDate: e.target.value || null }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sex</label>
            <Select
              value={formState.sex ?? "__none__"}
              onValueChange={(v) =>
                v !== null &&
                setFormState((prev) => ({
                  ...prev,
                  sex: v === "__none__" ? null : (v as EmployeeSexValue),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{formState.sex ? sexLabels[formState.sex] : "Not specified"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {employeeSexValues.map((v) => (
                  <SelectItem key={v} value={v}>
                    {sexLabels[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Civil Status</label>
            <Select
              value={formState.civilStatus ?? "__none__"}
              onValueChange={(v) =>
                v !== null && setFormState((prev) => ({ ...prev, civilStatus: v === "__none__" ? null : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formState.civilStatus
                    ? (civilStatusOptions.find((o) => o.value === formState.civilStatus)?.label ?? formState.civilStatus)
                    : "Not specified"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {civilStatusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Contact Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-email">
              Email
            </label>
            <Input
              id="emp-email"
              type="email"
              autoComplete="email"
              readOnly={emailReadOnly}
              disabled={emailReadOnly}
              value={formState.email ?? ""}
              onChange={emailReadOnly ? undefined : (e) => setFormState((prev) => ({ ...prev, email: e.target.value || null }))}
              className={emailReadOnly ? "cursor-not-allowed opacity-60" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Used for employee account matching and sign-in.{" "}
              {emailReadOnly
                ? "Only Super Admin can update this."
                : "Changes to this field may affect sign-in account matching."}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-mobile">
              Mobile No
            </label>
            <Input
              id="emp-mobile"
              value={formState.mobileNo ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, mobileNo: e.target.value || null }))}
            />
          </div>
        </div>
      </div>

      {/* Assignment */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Assignment</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Campus <span className="text-destructive">*</span>
            </label>
            <Select
              value={formState.campusId}
              onValueChange={(v) =>
                v !== null && setFormState((prev) => ({ ...prev, campusId: v, officeId: null }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{selectedCampusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.code} — {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Office</label>
            {formState.campusId ? (
              <SearchableSelect
                value={formState.officeId ?? null}
                onValueChange={(v) => setFormState((prev) => ({ ...prev, officeId: v }))}
                options={officeOptions.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
                placeholder="No office"
                searchPlaceholder="Search offices..."
                emptyMessage="No offices found for this campus."
              />
            ) : (
              <SearchableSelect
                value={null}
                onValueChange={() => undefined}
                options={[]}
                placeholder="Select a campus first"
                disabled
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-position">
              Position Title
            </label>
            <Input
              id="emp-position"
              value={formState.positionTitle ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, positionTitle: e.target.value || null }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Employment Type</label>
            <p className="text-xs text-muted-foreground">Select the employee&apos;s appointment or engagement type.</p>
            <Select
              value={formState.employmentType ?? "__none__"}
              onValueChange={(v) =>
                v !== null && setFormState((prev) => ({ ...prev, employmentType: v === "__none__" ? null : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formState.employmentType
                    ? (employmentTypeOptions.find((o) => o.value === formState.employmentType)?.label ??
                      formState.employmentType)
                    : "Select type"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {employmentTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Employment Status</label>
            <Select
              value={formState.employmentStatus}
              onValueChange={(v) =>
                v !== null &&
                setFormState((prev) => ({
                  ...prev,
                  employmentStatus: v as EmployeeFormInput["employmentStatus"],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {employmentStatusOptions.find((s) => s.value === formState.employmentStatus)?.label ?? "Active"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employmentStatusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-hired">
              Date Hired
            </label>
            <Input
              id="emp-hired"
              type="date"
              value={formState.dateHired ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, dateHired: e.target.value || null }))}
            />
          </div>
          {SEPARATED_STATUSES.has(formState.employmentStatus) && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="emp-date-sep">
                  Date Separated
                </label>
                <Input
                  id="emp-date-sep"
                  type="date"
                  value={formState.dateSeparated ?? ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, dateSeparated: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Separation Reason</label>
                {/* Preset select — derives the Select value from formState to avoid extra local state */}
                <Select
                  value={
                    PRESET_REASONS.has(formState.separationReason ?? "")
                      ? (formState.separationReason ?? "__none__")
                      : formState.separationReason
                        ? "other"
                        : "__none__"
                  }
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setFormState((prev) => ({ ...prev, separationReason: null }));
                    } else if (v === "other") {
                      // Clear to free-text (user will type in textarea)
                      setFormState((prev) => ({
                        ...prev,
                        separationReason: PRESET_REASONS.has(prev.separationReason ?? "") ? "" : (prev.separationReason ?? ""),
                      }));
                    } else {
                      setFormState((prev) => ({ ...prev, separationReason: v }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {SEPARATION_REASON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Free-text only shown when "Other" is selected or value is non-preset */}
                {(formState.separationReason !== null &&
                  !PRESET_REASONS.has(formState.separationReason ?? "")) && (
                    <Textarea
                      id="emp-sep-reason-custom"
                      placeholder="Describe the reason..."
                      rows={2}
                      value={formState.separationReason ?? ""}
                      onChange={(e) => setFormState((prev) => ({ ...prev, separationReason: e.target.value || null }))}
                    />
                  )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Additional Details (collapsible) */}
      <div>
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm font-semibold"
          onClick={() => setIsAdditionalOpen((prev) => !prev)}
        >
          Additional Details
          {isAdditionalOpen ? (
            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {isAdditionalOpen && (
          <div className="mt-4 space-y-8">
            {/* Employment Details */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Employment Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-plantilla">
                    Plantilla Item No
                  </label>
                  <Input
                    id="emp-plantilla"
                    value={formState.plantillaItemNo ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, plantillaItemNo: e.target.value || null }))}
                  />
                  <p className="text-xs text-muted-foreground">Official item number assigned to a plantilla position.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-cabinet-no">
                    Cabinet No.
                  </label>
                  <Input
                    id="emp-cabinet-no"
                    placeholder="e.g. CAB-01"
                    value={formState.cabinetNo ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, cabinetNo: e.target.value || null }))}
                  />
                  <p className="text-xs text-muted-foreground">Physical filing cabinet reference for the employee&apos;s 201 file.</p>
                </div>
              </div>
            </div>

            {/* Government & Statutory IDs */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Government &amp; Statutory IDs</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-tin">
                    TIN
                  </label>
                  <Input
                    id="emp-tin"
                    value={formState.tin ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, tin: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-gsis">
                    GSIS No
                  </label>
                  <Input
                    id="emp-gsis"
                    value={formState.gsisNo ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, gsisNo: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-ph">
                    PhilHealth No
                  </label>
                  <Input
                    id="emp-ph"
                    value={formState.philhealthNo ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, philhealthNo: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-pi">
                    Pag-IBIG No
                  </label>
                  <Input
                    id="emp-pi"
                    value={formState.pagibigNo ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, pagibigNo: e.target.value || null }))}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Address</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-present">
                    Present Address
                  </label>
                  <Textarea
                    id="emp-present"
                    rows={2}
                    value={formState.presentAddress ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, presentAddress: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-permanent">
                    Permanent Address
                  </label>
                  <Textarea
                    id="emp-permanent"
                    rows={2}
                    value={formState.permanentAddress ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, permanentAddress: e.target.value || null }))}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Emergency Contact</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-ec-name">
                    Name
                  </label>
                  <Input
                    id="emp-ec-name"
                    value={formState.emergencyContactName ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, emergencyContactName: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-ec-phone">
                    Phone
                  </label>
                  <Input
                    id="emp-ec-phone"
                    value={formState.emergencyContactPhone ?? ""}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, emergencyContactPhone: e.target.value || null }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* System */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">System</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="emp-ext">
                    External Reference / Legacy ID
                  </label>
                  <Input
                    id="emp-ext"
                    value={formState.externalRef ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, externalRef: e.target.value || null }))}
                  />
                  <p className="text-xs text-muted-foreground">Used only for records imported from the old HRIS.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
