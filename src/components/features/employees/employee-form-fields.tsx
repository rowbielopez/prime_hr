"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

type EmployeeFormFieldsProps = {
  formState: EmployeeFormInput;
  setFormState: React.Dispatch<React.SetStateAction<EmployeeFormInput>>;
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
};

export function EmployeeFormFields({ formState, setFormState, campuses, offices }: EmployeeFormFieldsProps) {
  const officeOptions = offices.filter((office) => office.campusId === formState.campusId);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-no">
              Employee No
            </label>
            <Input
              id="emp-no"
              value={formState.employeeNo}
              onChange={(e) => setFormState((prev) => ({ ...prev, employeeNo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-first">
              First Name
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
              Last Name
            </label>
            <Input
              id="emp-last"
              value={formState.lastName}
              onChange={(e) => setFormState((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-suffix">
              Suffix
            </label>
            <Input
              id="emp-suffix"
              value={formState.suffix ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, suffix: e.target.value || null }))}
            />
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
            <label className="text-sm font-medium" htmlFor="emp-sex">
              Sex
            </label>
            <select
              id="emp-sex"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={formState.sex ?? ""}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  sex: e.target.value === "" ? null : (e.target.value as EmployeeSexValue),
                }))
              }
            >
              <option value="">Not specified</option>
              {employeeSexValues.map((v) => (
                <option key={v} value={v}>
                  {sexLabels[v]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Contact</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-email">
              Email
            </label>
            <Input
              id="emp-email"
              type="email"
              autoComplete="email"
              value={formState.email ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value || null }))}
            />
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

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Assignment</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-campus">
              Campus
            </label>
            <select
              id="emp-campus"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={formState.campusId}
              onChange={(e) => setFormState((prev) => ({ ...prev, campusId: e.target.value, officeId: null }))}
            >
              <option value="">Select campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.code} — {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-office">
              Office
            </label>
            <select
              id="emp-office"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={formState.officeId ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, officeId: e.target.value || null }))}
            >
              <option value="">No office</option>
              {officeOptions.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.code} — {office.name}
                </option>
              ))}
            </select>
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
            <label className="text-sm font-medium" htmlFor="emp-plantilla">
              Plantilla Item No
            </label>
            <Input
              id="emp-plantilla"
              value={formState.plantillaItemNo ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, plantillaItemNo: e.target.value || null }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-emptype">
              Employment Type
            </label>
            <Input
              id="emp-emptype"
              placeholder="e.g. permanent, casual, COS, JO"
              value={formState.employmentType ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, employmentType: e.target.value || null }))}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Employment</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-status">
              Employment Status
            </label>
            <select
              id="emp-status"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={formState.employmentStatus}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  employmentStatus: e.target.value as EmployeeFormInput["employmentStatus"],
                }))
              }
            >
              {employmentStatusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-sep">
              Date Separated
            </label>
            <Input
              id="emp-sep"
              type="date"
              value={formState.dateSeparated ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, dateSeparated: e.target.value || null }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-sep-reason">
              Separation Reason
            </label>
            <Textarea
              id="emp-sep-reason"
              rows={2}
              value={formState.separationReason ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, separationReason: e.target.value || null }))}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Government & statutory IDs</h3>
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
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-civil">
              Civil Status
            </label>
            <Input
              id="emp-civil"
              value={formState.civilStatus ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, civilStatus: e.target.value || null }))}
            />
          </div>
        </div>
      </div>

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

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Emergency contact</h3>
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
              onChange={(e) => setFormState((prev) => ({ ...prev, emergencyContactPhone: e.target.value || null }))}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">System</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="emp-ext">
              External reference / legacy ID
            </label>
            <Input
              id="emp-ext"
              value={formState.externalRef ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, externalRef: e.target.value || null }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
