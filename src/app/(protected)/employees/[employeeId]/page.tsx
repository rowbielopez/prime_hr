import { notFound } from "next/navigation";
import { EmployeeDetailsManagement } from "@/components/features/employees/employee-details-management";
import { PageHeader } from "@/components/foundation";
import {
  getEmployeeById,
  getLinkedAppUserForEmployee,
  listEmployeeCampusOptions,
  listEmployeeDocumentsForEmployee,
  listEmployeeOfficeOptions,
} from "@/features/employees/repository/employees.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/employees",
    permission: "employee.records.read",
  });
  const employee = await getEmployeeById(employeeId);
  if (!employee) notFound();

  const [campuses, offices, linkedAppUser, documents] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
    getLinkedAppUserForEmployee(employeeId),
    listEmployeeDocumentsForEmployee(employeeId),
  ]);

  const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={employeeName || employee.employeeNo}
        subtitle="Employee master data, account link, and document index"
        breadcrumb={[...pageMeta.breadcrumb, { label: employee.employeeNo }]}
      />
      <EmployeeDetailsManagement
        employee={employee}
        campuses={campuses}
        offices={offices}
        linkedAppUser={linkedAppUser}
        documents={documents}
      />
    </div>
  );
}
