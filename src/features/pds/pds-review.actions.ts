"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/features/auth/server/require-permission";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";

export type PdsReviewActionResult = { ok: true } | { ok: false; error: string };

function pdsReviewFailure(): PdsReviewActionResult {
    return { ok: false, error: "We could not update this PDS review right now. Please try again." };
}

export async function approvePdsAction(profileId: string, employeeId: string): Promise<PdsReviewActionResult> {
    const context = await requirePermission({ permission: "pds.review.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error } = await db
        .from("employee_pds_profiles")
        .update({
            status: "verified",
            verified_at: new Date().toISOString(),
            verified_by_user_id: context.appUserId,
            updated_by_user_id: context.appUserId,
        })
        .eq("id", profileId)
        .in("status", ["ready_for_review", "under_hr_review"]);

    if (error) return pdsReviewFailure();

    await writeAuditLog({ eventType: "pds", action: "approve", entityType: "pds_profile", entityId: employeeId });
    revalidatePath("/pds/review");
    revalidatePath(`/employees/${employeeId}/pds`);
    return { ok: true };
}

export async function rejectPdsAction(profileId: string, employeeId: string, reason: string): Promise<PdsReviewActionResult> {
    const context = await requirePermission({ permission: "pds.review.write" });
    const supabase = await createSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error } = await db
        .from("employee_pds_profiles")
        .update({
            status: "returned_for_correction",
            return_reason: reason,
            returned_at: new Date().toISOString(),
            returned_by_user_id: context.appUserId,
            updated_by_user_id: context.appUserId,
        })
        .eq("id", profileId)
        .in("status", ["ready_for_review", "under_hr_review"]);

    if (error) return pdsReviewFailure();

    await writeAuditLog({ eventType: "pds", action: "reject", entityType: "pds_profile", entityId: employeeId, metadata: { reason } });
    revalidatePath("/pds/review");
    revalidatePath(`/employees/${employeeId}/pds`);
    return { ok: true };
}

