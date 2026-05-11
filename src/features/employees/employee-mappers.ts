import type { EmployeeFormInput } from "@/features/employees/schemas/employee-form.schema";
import type { EmployeeDetail } from "@/features/employees/types";

export function employeeDetailToFormInput(employee: EmployeeDetail): EmployeeFormInput {
  return {
    employeeNo: employee.employeeNo,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    suffix: employee.suffix,
    birthDate: employee.birthDate,
    sex: employee.sex,
    email: employee.email,
    mobileNo: employee.mobileNo,
    campusId: employee.campusId,
    officeId: employee.officeId,
    positionTitle: employee.positionTitle,
    plantillaItemNo: employee.plantillaItemNo,
    employmentStatus: employee.employmentStatus,
    dateHired: employee.dateHired,
    civilStatus: employee.civilStatus,
    tin: employee.tin,
    gsisNo: employee.gsisNo,
    philhealthNo: employee.philhealthNo,
    pagibigNo: employee.pagibigNo,
    employmentType: employee.employmentType,
    dateSeparated: employee.dateSeparated,
    separationReason: employee.separationReason,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    presentAddress: employee.presentAddress,
    permanentAddress: employee.permanentAddress,
    externalRef: employee.externalRef,
  };
}
