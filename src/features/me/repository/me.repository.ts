import { getEmployeeById, listEmployeeDocumentsForEmployee } from "@/features/employees/repository/employees.repository";
import { getEmployeeIdForAppUser } from "@/features/auth/server/employee-link";
import type { EmployeeDetail, EmployeeDocumentListItem } from "@/features/employees/types";

export type MyEmployeeContext = {
    employeeId: string;
    employee: EmployeeDetail | null;
};

/**
 * Resolves the employee record linked to the given app_user, if any.
 * Returns `null` when the account is not yet linked to an employee.
 */
export async function getMyEmployee(appUserId: string): Promise<MyEmployeeContext | null> {
    const employeeId = await getEmployeeIdForAppUser(appUserId);
    if (!employeeId) return null;
    const employee = await getEmployeeById(employeeId);
    return { employeeId, employee };
}

export async function getMyDocuments(employeeId: string): Promise<EmployeeDocumentListItem[]> {
    return listEmployeeDocumentsForEmployee(employeeId);
}
