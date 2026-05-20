import { type NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/features/auth/server/require-permission";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeePdsData } from "@/features/employees/repository/pds.repository";
import { generatePdsFromTemplate } from "@/features/employees/pds-template-generator";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
    const { employeeId } = await params;

    // Permission check — must have pds.generate permission
    let context: Awaited<ReturnType<typeof requirePermission>>;
    try {
        context = await requirePermission({ permission: "pds.generate" });
    } catch {
        return NextResponse.redirect(new URL("/login", _req.url));
    }

    // Verify the employee exists
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
        return new NextResponse("Employee not found", { status: 404 });
    }

    // Campus-scoping: campus_hr_officer may only download PDS for employees in their campus
    const isCentralOrSuper = context.isSuperAdmin || context.roles.includes("central_hr_admin");
    if (!isCentralOrSuper && context.primaryCampusId && employee.campusId !== context.primaryCampusId) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
        .filter(Boolean)
        .join(" ") || employee.employeeNo;

    const pdsData = await getEmployeePdsData(employeeId);

    if (!pdsData.profileId) {
        return new NextResponse("No PDS profile found for this employee", { status: 404 });
    }

    const buffer = await generatePdsFromTemplate(pdsData, employeeName);
    const bytes = new Uint8Array(buffer);

    const safeName = employeeName.replace(/[^a-zA-Z0-9\s\-_.]/g, "").replace(/\s+/g, "_");
    const filename = `PDS_${safeName}_${employee.employeeNo}.xlsx`;

    return new NextResponse(bytes, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": String(bytes.byteLength),
        },
    });
}
