import { EmployeeListManagement } from "@/components/features/employees/employee-list-management";
import { PageHeader } from "@/components/foundation";
import {
  listEmployeeCampusOptions,
  listEmployeeOfficeOptions,
  listEmployees,
} from "@/features/employees/repository/employees.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function EmployeesPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/employees",
    permission: "employee.records.read",
  });

  const [employees, campuses, offices] = await Promise.all([
    listEmployees(),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <EmployeeListManagement employees={employees} campuses={campuses} offices={offices} />
    </div>
  );
}

