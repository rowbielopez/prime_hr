"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import {
  campusFormSchema,
  type CampusFormInput,
} from "@/features/admin/organization/schemas/campus-form.schema";
import {
  officeFormSchema,
  type OfficeFormInput,
} from "@/features/admin/organization/schemas/office-form.schema";
import {
  createCampus,
  getCampusSnapshot,
  setCampusActive,
  updateCampus,
} from "@/features/admin/organization/repository/campus.repository";
import {
  createOffice,
  getOfficeSnapshot,
  setOfficeActive,
  updateOffice,
} from "@/features/admin/organization/repository/office.repository";
import { getCampusIdByOfficeId } from "@/features/admin/organization/repository/scope.repository";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import { canAccessCampus, hasPermission } from "@/lib/rbac/scopes";
import { redirect } from "next/navigation";

type ActionResult = { ok: true } | { ok: false; error: string };

function success(): ActionResult {
  return { ok: true };
}

function failure(message: string): ActionResult {
  return { ok: false, error: message };
}

async function requireOfficeOrganizationWritePermission(
  campusId?: string | null,
) {
  const context = await requireAuthorizedUser();
  const canWriteGlobalOrganization = hasPermission(
    context,
    "admin.organization.write",
  );
  const canWriteCampusOrganization = hasPermission(
    context,
    "admin.campus.organization.write",
  );
  if (!canWriteGlobalOrganization && !canWriteCampusOrganization) {
    redirect(buildForbiddenUrl("missing_permission"));
  }
  if (!canAccessCampus(context, campusId)) {
    redirect(buildForbiddenUrl("campus_scope_denied"));
  }
  return context;
}

export async function createCampusAction(
  input: CampusFormInput,
): Promise<ActionResult> {
  await requirePermission({ permission: "admin.organization.write" });
  const parsed = campusFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Invalid campus input");
  const result = await createCampus(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create campus");
  if (result.campusId) {
    try {
      await writeAuditLog({
        eventType: "admin.campus_created",
        action: "create_campus",
        entityType: "campuses",
        entityId: result.campusId,
        metadata: { input: parsed.data },
      });
    } catch (e) {
      logServerError("audit_log_failed", e);
    }
  }
  revalidatePath("/admin/campuses");
  return success();
}

export async function updateCampusAction(
  campusId: string,
  input: CampusFormInput,
): Promise<ActionResult> {
  await requirePermission({ permission: "admin.organization.write", campusId });
  const parsed = campusFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Invalid campus input");
  const before = await getCampusSnapshot(campusId);
  const result = await updateCampus(campusId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update campus");
  try {
    await writeAuditLog({
      eventType: "admin.campus_updated",
      action: "update_campus",
      entityType: "campuses",
      entityId: campusId,
      metadata: { before, after: parsed.data },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/admin/campuses");
  return success();
}

export async function toggleCampusStatusAction(
  campusId: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requirePermission({ permission: "admin.organization.write", campusId });
  const before = await getCampusSnapshot(campusId);
  const result = await setCampusActive(campusId, isActive);
  if (!result.ok)
    return failure(result.error ?? "Failed to update campus status");
  try {
    await writeAuditLog({
      eventType: "admin.campus_status_toggled",
      action: "toggle_campus_status",
      entityType: "campuses",
      entityId: campusId,
      metadata: { before, isActive, previousIsActive: before?.isActive },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/admin/campuses");
  return success();
}

export async function createOfficeAction(
  input: OfficeFormInput,
): Promise<ActionResult> {
  await requireOfficeOrganizationWritePermission(input.campusId);
  const parsed = officeFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Invalid office input");
  const result = await createOffice(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create office");
  if (result.officeId) {
    try {
      await writeAuditLog({
        eventType: "admin.office_created",
        action: "create_office",
        entityType: "offices",
        entityId: result.officeId,
        campusId: parsed.data.campusId,
        metadata: { input: parsed.data },
      });
    } catch (e) {
      logServerError("audit_log_failed", e);
    }
  }
  revalidatePath("/admin/offices");
  return success();
}

export async function updateOfficeAction(
  officeId: string,
  input: OfficeFormInput,
): Promise<ActionResult> {
  const currentCampusId = await getCampusIdByOfficeId(officeId);
  if (currentCampusId) {
    await requireOfficeOrganizationWritePermission(currentCampusId);
  }
  await requireOfficeOrganizationWritePermission(input.campusId);
  const parsed = officeFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Invalid office input");
  const before = await getOfficeSnapshot(officeId);
  const result = await updateOffice(officeId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update office");
  try {
    await writeAuditLog({
      eventType: "admin.office_updated",
      action: "update_office",
      entityType: "offices",
      entityId: officeId,
      campusId: parsed.data.campusId,
      metadata: { before, after: parsed.data },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/admin/offices");
  return success();
}

export async function toggleOfficeStatusAction(
  officeId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const campusId = await getCampusIdByOfficeId(officeId);
  if (campusId) {
    await requireOfficeOrganizationWritePermission(campusId);
  } else {
    await requirePermission({ permission: "admin.organization.write" });
  }
  const before = await getOfficeSnapshot(officeId);
  const result = await setOfficeActive(officeId, isActive);
  if (!result.ok)
    return failure(result.error ?? "Failed to update office status");
  try {
    await writeAuditLog({
      eventType: "admin.office_status_toggled",
      action: "toggle_office_status",
      entityType: "offices",
      entityId: officeId,
      campusId: campusId ?? undefined,
      metadata: { before, isActive, previousIsActive: before?.isActive },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/admin/offices");
  return success();
}
