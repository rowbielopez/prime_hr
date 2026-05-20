import type { EmployeeSexValue } from "@/features/employees/schemas/employee-form.schema";

export type EmployeeListItem = {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string | null;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  employmentStatus: "active" | "on_leave" | "separated" | "retired";
  positionTitle: string | null;
};

export type EmployeeDetail = {
  id: string;
  employeeNo: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string | null;
  sex: EmployeeSexValue | null;
  email: string | null;
  mobileNo: string | null;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  positionTitle: string | null;
  plantillaItemNo: string | null;
  employmentStatus: "active" | "on_leave" | "separated" | "retired";
  dateHired: string | null;
  civilStatus: string | null;
  tin: string | null;
  gsisNo: string | null;
  philhealthNo: string | null;
  pagibigNo: string | null;
  employmentType: string | null;
  dateSeparated: string | null;
  separationReason: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  cabinetNo: string | null;
  externalRef: string | null;
};

export type EmployeeCampusOption = {
  id: string;
  code: string;
  name: string;
};

export type EmployeeOfficeOption = {
  id: string;
  campusId: string;
  code: string;
  name: string;
};

export type PossibleDuplicateEmployee = {
  id: string;
  employeeNo: string;
  fullName: string;
  campusName: string;
  officeName: string | null;
  matchReason: string;
};

export type LinkedAppUserSummary = {
  id: string;
  email: string;
  status: "active" | "inactive" | "suspended";
  isActive: boolean;
};

export type EmployeeDocumentListItem = {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  status: string;
  createdAt: string;
};
