"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import {
  vacancyFormSchema,
  type VacancyFormInput,
} from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";
import {
  createVacancy,
  getVacancyById,
  getVacancyScopeById,
  updateVacancy,
  updateVacancyStatus,
} from "@/features/recruitment/vacancies/repository/vacancies.repository";
import type {
  VacancyDetail,
  VacancyStatus,
} from "@/features/recruitment/vacancies/types";

type ActionResult =
  | { ok: true; vacancyId?: string }
  | { ok: false; error: string };

function success(vacancyId?: string): ActionResult {
  return { ok: true, vacancyId };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

function todayLocalDate() {
  return new Date().toISOString().slice(0, 10);
}

function isBlank(input: string | null | undefined) {
  return !input || input.trim().length === 0;
}

function validatePublishReadiness(vacancy: VacancyDetail): string | null {
  if (vacancy.status === "open")
    return "This job vacancy is already published.";
  if (isBlank(vacancy.title))
    return "Vacancy title is required before publishing.";
  if (isBlank(vacancy.campusId)) return "Campus is required before publishing.";
  if (isBlank(vacancy.employmentType))
    return "Employment type is required before publishing.";
  if (vacancy.itemCount < 1)
    return "Number of slots is required before publishing.";
  if (isBlank(vacancy.postedAt))
    return "Posting date is required before publishing.";
  if (isBlank(vacancy.closingAt))
    return "Application deadline is required before publishing.";
  if (
    vacancy.postedAt &&
    vacancy.closingAt &&
    vacancy.closingAt < vacancy.postedAt
  ) {
    return "Application deadline cannot be earlier than the posting date.";
  }
  if (vacancy.closingAt && vacancy.closingAt < todayLocalDate()) {
    return "The application deadline cannot be earlier than today.";
  }
  if (isBlank(vacancy.qualificationNotes) && isBlank(vacancy.description)) {
    return "Please add qualifications or a job description before publishing.";
  }
  return null;
}

function statusLabel(status: VacancyStatus) {
  const labels: Record<VacancyStatus, string> = {
    draft: "Draft",
    for_review: "For Review",
    open: "Published",
    filled: "Filled",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
}

async function changeVacancyStatusWithAudit(input: {
  vacancyId: string;
  status: VacancyStatus;
  action: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const scope = await getVacancyScopeById(input.vacancyId);
  if (!scope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await updateVacancyStatus(input.vacancyId, input.status);
  if (!result.ok)
    return failure(`Failed to update vacancy to ${statusLabel(input.status)}.`);
  await safeAuditLog({
    eventType: input.eventType,
    action: input.action,
    entityType: "recruitment_vacancies",
    entityId: input.vacancyId,
    campusId: scope.campusId,
    metadata: { status: input.status, ...input.metadata },
  });
  revalidatePath("/recruitment/vacancies");
  revalidatePath(`/recruitment/vacancies/${input.vacancyId}`);
  revalidatePath("/recruitment/applicants");
  return success(input.vacancyId);
}

export async function createVacancyAction(
  input: VacancyFormInput,
): Promise<ActionResult> {
  const parsed = vacancyFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Invalid vacancy input.");
  if (parsed.data.officeId) {
    const isValid = await officeBelongsToCampus({
      officeId: parsed.data.officeId,
      campusId: parsed.data.campusId,
    });
    if (!isValid)
      return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await createVacancy(parsed.data);
  if (!result.ok)
    return failure(
      "Failed to create vacancy. Please review the vacancy details and try again.",
    );
  if (result.vacancyId) {
    await safeAuditLog({
      eventType: "recruitment.vacancy_created",
      action: "create_vacancy",
      entityType: "recruitment_vacancies",
      entityId: result.vacancyId,
      campusId: parsed.data.campusId,
      metadata: {
        status: parsed.data.status,
        officeId: parsed.data.officeId ?? null,
      },
    });
  }
  revalidatePath("/recruitment/vacancies");
  if (result.vacancyId)
    revalidatePath(`/recruitment/vacancies/${result.vacancyId}`);
  return success(result.vacancyId ?? undefined);
}

export async function updateVacancyAction(
  vacancyId: string,
  input: VacancyFormInput,
): Promise<ActionResult> {
  const currentScope = await getVacancyScopeById(vacancyId);
  if (!currentScope) return failure("We could not find this job vacancy.");
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: currentScope.campusId,
    officeId: currentScope.officeId,
  });
  const parsed = vacancyFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ??
        "Please complete the required vacancy details before saving.",
    );
  if (parsed.data.officeId) {
    const isValid = await officeBelongsToCampus({
      officeId: parsed.data.officeId,
      campusId: parsed.data.campusId,
    });
    if (!isValid)
      return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await updateVacancy(vacancyId, parsed.data);
  if (!result.ok)
    return failure(
      "We could not save your changes right now. Please try again.",
    );
  await safeAuditLog({
    eventType: "recruitment.vacancy_updated",
    action: "update_vacancy",
    entityType: "recruitment_vacancies",
    entityId: vacancyId,
    campusId: parsed.data.campusId,
    metadata: {
      status: parsed.data.status,
      officeId: parsed.data.officeId ?? null,
    },
  });
  revalidatePath("/recruitment/vacancies");
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  revalidatePath(`/recruitment/vacancies/${vacancyId}/edit`);
  return success(vacancyId);
}

export async function updateVacancyStatusAction(
  vacancyId: string,
  status: VacancyFormInput["status"],
): Promise<ActionResult> {
  return changeVacancyStatusWithAudit({
    vacancyId,
    status,
    action: "update_vacancy_status",
    eventType: "recruitment.vacancy_status_updated",
  });
}

export async function submitVacancyForReviewAction(
  vacancyId: string,
): Promise<ActionResult> {
  return changeVacancyStatusWithAudit({
    vacancyId,
    status: "for_review",
    action: "submit_vacancy_for_review",
    eventType: "recruitment.vacancy_submitted_for_review",
  });
}

export async function publishVacancyAction(
  vacancyId: string,
): Promise<ActionResult> {
  const scope = await getVacancyScopeById(vacancyId);
  if (!scope) return failure("Vacancy not found.");
  const context = await requirePermission({
    permission: "recruitment.vacancies.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const vacancy = await getVacancyById(vacancyId, context);
  if (!vacancy) return failure("Vacancy not found.");
  const readinessError = validatePublishReadiness(vacancy);
  if (readinessError) return failure(readinessError);
  const result = await updateVacancyStatus(vacancyId, "open");
  if (!result.ok) return failure("Failed to publish job vacancy.");
  await safeAuditLog({
    eventType: "recruitment.vacancy_published",
    action: "publish_vacancy",
    entityType: "recruitment_vacancies",
    entityId: vacancyId,
    campusId: scope.campusId,
    metadata: { status: "open" },
  });
  revalidatePath("/recruitment/vacancies");
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  return success(vacancyId);
}

export async function closeVacancyAction(
  vacancyId: string,
): Promise<ActionResult> {
  return changeVacancyStatusWithAudit({
    vacancyId,
    status: "closed",
    action: "close_vacancy",
    eventType: "recruitment.vacancy_closed",
  });
}

export async function markVacancyFilledAction(
  vacancyId: string,
): Promise<ActionResult> {
  return changeVacancyStatusWithAudit({
    vacancyId,
    status: "filled",
    action: "mark_vacancy_filled",
    eventType: "recruitment.vacancy_filled",
  });
}

export async function cancelVacancyAction(
  vacancyId: string,
): Promise<ActionResult> {
  return changeVacancyStatusWithAudit({
    vacancyId,
    status: "cancelled",
    action: "cancel_vacancy",
    eventType: "recruitment.vacancy_cancelled",
  });
}
