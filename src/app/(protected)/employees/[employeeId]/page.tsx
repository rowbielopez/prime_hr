import { notFound } from "next/navigation";
import { EmployeeDetailsManagement } from "@/components/features/employees/employee-details-management";
import { PageHeader } from "@/components/foundation";
import {
  buildEmployeeProfileHubSummary,
  getEmployeeById,
  getEmployeePdsSummary,
  getEmployeeRecruitmentSummary,
  getLinkedAppUserForEmployee,
  listEmployeeCampusOptions,
  listEmployeeDocumentsForEmployee,
  listEmployeeOfficeOptions,
} from "@/features/employees/repository/employees.repository";
import { getEmployeeServiceRecordDetail } from "@/features/service-records/repository/service-records.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  userMgmtCanAccessCampus,
  userMgmtCanAccessOffice,
} from "@/features/admin/users/server/user-management-access";
import { hasPermission } from "@/lib/rbac/scopes";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/employees",
    permission: "employee.records.read",
  });
  const employee = await getEmployeeById(employeeId);
  if (!employee) notFound();

  const [
    campuses,
    offices,
    linkedAppUser,
    documents,
    pdsSummary,
    serviceRecordDetail,
    recruitmentSummary,
  ] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
    getLinkedAppUserForEmployee(employeeId),
    listEmployeeDocumentsForEmployee(employeeId),
    getEmployeePdsSummary(employeeId),
    getEmployeeServiceRecordDetail(employeeId),
    getEmployeeRecruitmentSummary(employeeId),
  ]);

  const profileSummary = buildEmployeeProfileHubSummary({
    employee,
    linkedAppUser,
    documents,
    pds: pdsSummary,
    serviceRecordDetail,
    recruitment: recruitmentSummary,
  });

  const employeeName = [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const canAssignLoginEmail =
    (hasPermission(context, "admin.users.write") ||
      hasPermission(context, "admin.campus.users.write")) &&
    userMgmtCanAccessCampus(context, employee.campusId) &&
    userMgmtCanAccessOffice(context, employee.campusId, employee.officeId);

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
        profileSummary={profileSummary}
        isSuperAdmin={context.roles.includes("super_admin")}
        canAssignLoginEmail={canAssignLoginEmail}
      />
    </div>
  );
}
