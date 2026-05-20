import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeePdsData } from "@/features/employees/repository/pds.repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PdsEditForm } from "@/components/features/employees/pds-edit-form";

type PageProps = {
    params: Promise<{ employeeId: string }>;
};

export default async function EmployeePdsEditPage({ params }: PageProps) {
    const { employeeId } = await params;

    await withProtectedPageMeta({
        pathname: "/employees",
        permission: "employee.records.write",
    });

    const [employee, pdsData] = await Promise.all([
        getEmployeeById(employeeId),
        getEmployeePdsData(employeeId),
    ]);

    if (!employee) notFound();
    if (!pdsData.profileId) notFound();

    // Fetch the campus_id for this profile (needed by child insert actions)
    const supabase = await createSupabaseServerClient();
    const { data: profileRow } = await supabase
        .from("employee_pds_profiles")
        .select("campus_id")
        .eq("id", pdsData.profileId)
        .maybeSingle();
    const campusId = (profileRow as { campus_id: string } | null)?.campus_id ?? employee.campusId;

    const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Edit PDS — ${employeeName || employee.employeeNo}`}
                subtitle="Admin edit of Personal Data Sheet (CSC Form No. 212)"
                breadcrumb={[
                    { label: "Employees", href: "/employees" },
                    { label: employeeName || employee.employeeNo, href: `/employees/${employee.id}` },
                    { label: "PDS", href: `/employees/${employee.id}/pds` },
                    { label: "Edit" },
                ]}
            />
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href={`/employees/${employee.id}/pds`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                    ← Back to PDS View
                </Link>
            </div>
            <PdsEditForm
                employeeId={employee.id}
                pdsProfileId={pdsData.profileId}
                campusId={campusId}
                personalInfo={pdsData.personalInfo}
                familyBackground={pdsData.familyBackground}
                pdsChildren={pdsData.children}
                education={pdsData.education}
                eligibilities={pdsData.eligibilities}
                workExperiences={pdsData.workExperiences}
                voluntaryWork={pdsData.voluntaryWork}
                learningDevelopment={pdsData.learningDevelopment}
                skills={pdsData.skills}
                recognitions={pdsData.recognitions}
                memberships={pdsData.memberships}
                references={pdsData.references}
                declaration={pdsData.declaration}
                governmentId={pdsData.governmentId}
            />
        </div>
    );
}
