"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { vacancyFormSchema, type VacancyFormInput } from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";
import {
  createVacancy,
  getVacancyScopeById,
  updateVacancy,
  updateVacancyStatus,
} from "@/features/recruitment/vacancies/repository/vacancies.repository";

type ActionResult = { ok: true; vacancyId?: string } | { ok: false; error: string };

function success(vacancyId?: string): ActionResult {
  return { ok: true, vacancyId };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("audit_log_failed", error);
  }
}

export async function createVacancyAction(input: VacancyFormInput): Promise<ActionResult> {
  const parsed = vacancyFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid vacancy input.");
  if (parsed.data.officeId) {
    const isValid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!isValid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await createVacancy(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create vacancy.");
  if (result.vacancyId) {
    await safeAuditLog({
      eventType: "recruitment.vacancy_created",
      action: "create_vacancy",
      entityType: "recruitment_vacancies",
      entityId: result.vacancyId,
      campusId: parsed.data.campusId,
      metadata: { input: parsed.data },
    });
  }
  revalidatePath("/recruitment/vacancies");
  if (result.vacancyId) revalidatePath(`/recruitment/vacancies/${result.vacancyId}`);
  return success(result.vacancyId ?? undefined);
}

export async function updateVacancyAction(vacancyId: string, input: VacancyFormInput): Promise<ActionResult> {
  const currentScope = await getVacancyScopeById(vacancyId);
  if (!currentScope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: currentScope.campusId,
    officeId: currentScope.officeId,
  });
  const parsed = vacancyFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid vacancy input.");
  if (parsed.data.officeId) {
    const isValid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!isValid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await updateVacancy(vacancyId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update vacancy.");
  await safeAuditLog({
    eventType: "recruitment.vacancy_updated",
    action: "update_vacancy",
    entityType: "recruitment_vacancies",
    entityId: vacancyId,
    campusId: parsed.data.campusId,
    metadata: { input: parsed.data },
  });
  revalidatePath("/recruitment/vacancies");
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  return success(vacancyId);
}

export async function updateVacancyStatusAction(
  vacancyId: string,
  status: VacancyFormInput["status"]
): Promise<ActionResult> {
  const scope = await getVacancyScopeById(vacancyId);
  if (!scope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await updateVacancyStatus(vacancyId, status);
  if (!result.ok) return failure(result.error ?? "Failed to update status.");
  await safeAuditLog({
    eventType: "recruitment.vacancy_status_updated",
    action: "update_vacancy_status",
    entityType: "recruitment_vacancies",
    entityId: vacancyId,
    campusId: scope.campusId,
    metadata: { status },
  });
  revalidatePath("/recruitment/vacancies");
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  return success(vacancyId);
}
