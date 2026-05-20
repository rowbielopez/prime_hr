"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { getEmployeeIdForAppUser } from "@/features/auth/server/employee-link";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
    safeContactInfoSchema,
    type SafeContactInfoInput,
} from "@/features/me/schemas/safe-contact.schema";

type ActionResult = { ok: true } | { ok: false; error: string };

function failure(message: string): ActionResult {
    return { ok: false, error: message };
}

/**
 * Updates the calling employee's own safe contact fields.
 *
 * Security:
 * - Requires an authenticated, authorized session.
 * - Only writes the five whitelisted columns; cannot alter status, scope,
 *   name, or any compliance-sensitive field.
 * - The target row is constrained to the app_user's own employee_id link.
 */
export async function updateMyContactInfoAction(
    input: SafeContactInfoInput,
): Promise<ActionResult> {
    const context = await requireAuthorizedUser();
    const employeeId = await getEmployeeIdForAppUser(context.appUserId);
    if (!employeeId) {
        return failure("Your account is not yet linked to an employee record. Please contact HR.");
    }

    const parsed = safeContactInfoSchema.safeParse(input);
    if (!parsed.success) {
        return failure(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const admin = createSupabaseAdminClient();
    const updatePayload = {
        mobile_no: parsed.data.mobileNo,
        present_address: parsed.data.presentAddress,
        permanent_address: parsed.data.permanentAddress,
        emergency_contact_name: parsed.data.emergencyContactName,
        emergency_contact_phone: parsed.data.emergencyContactPhone,
    };
    const { error } = await admin
        .from("employees")
        .update(updatePayload as never)
        .eq("id", employeeId)
        .is("deleted_at", null);

    if (error) {
        return failure("Could not save your changes. Please try again.");
    }

    try {
        await writeAuditLog({
            eventType: "employee.self_updated",
            action: "update_self_contact",
            entityType: "employees",
            entityId: employeeId,
            metadata: {
                fields: [
                    "mobile_no",
                    "present_address",
                    "permanent_address",
                    "emergency_contact_name",
                    "emergency_contact_phone",
                ],
            },
        });
    } catch (e) {
        console.error("audit_log_failed", e);
    }

    revalidatePath("/me");
    revalidatePath("/me/profile");
    return { ok: true };
}
