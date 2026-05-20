"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { getVacancyScopeById } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import { applicantFormSchema, type ApplicantFormInput } from "@/features/recruitment/applicants/schemas/applicant-form.schema";
import {
  applicationCreateSchema,
  applicationStatusSchema,
  type ApplicationCreateInput,
  type ApplicationStatusInput,
} from "@/features/recruitment/applicants/schemas/application-form.schema";
import {
  interviewRecordSchema,
  screeningResultSchema,
  type InterviewRecordInput,
  type ScreeningResultInput,
} from "@/features/recruitment/applicants/schemas/screening-and-interview.schema";
import {
  convertApplicantToEmployeeSchema,
  stageChangeSchema,
  type ConvertApplicantToEmployeeInput,
  type StageChangeInput,
} from "@/features/recruitment/applicants/schemas/convert-and-stage.schema";
import {
  createInterviewRecord,
  createScreeningResult,
  createApplicant,
  createApplication,
  findActiveEmployeeByEmail,
  findPotentialDuplicateApplicants,
  getApplicantById,
  getApplicantConversionState,
  getApplicantScopeById,
  getApplicationScopeById,
  linkApplicantToEmployeeAndMarkHired,
  updateApplicant,
  updateApplicantStatus,
  updateApplicationStatus,
} from "@/features/recruitment/applicants/repository/applicants.repository";
import { createEmployee } from "@/features/employees/repository/employees.repository";
import type { DuplicateApplicantMatch } from "@/features/recruitment/applicants/types";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function success(id?: string): ActionResult {
  return { ok: true, id };
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

export async function createApplicantAction(input: ApplicantFormInput): Promise<ActionResult> {
  const parsed = applicantFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid applicant input.");
  if (parsed.data.officeId) {
    const valid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!valid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await createApplicant(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create applicant.");
  if (result.applicantId) {
    await safeAuditLog({
      eventType: "recruitment.applicant_created",
      action: "create_applicant",
      entityType: "recruitment_applicants",
      entityId: result.applicantId,
      campusId: parsed.data.campusId,
      metadata: { input: parsed.data },
    });
  }
  revalidatePath("/recruitment/applicants");
  if (result.applicantId) revalidatePath(`/recruitment/applicants/${result.applicantId}`);
  return success(result.applicantId ?? undefined);
}

export async function updateApplicantAction(applicantId: string, input: ApplicantFormInput): Promise<ActionResult> {
  const currentScope = await getApplicantScopeById(applicantId);
  if (!currentScope) return failure("Applicant not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: currentScope.campusId,
    officeId: currentScope.officeId,
  });
  const parsed = applicantFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid applicant input.");
  if (parsed.data.officeId) {
    const valid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!valid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await updateApplicant(applicantId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update applicant.");
  await safeAuditLog({
    eventType: "recruitment.applicant_updated",
    action: "update_applicant",
    entityType: "recruitment_applicants",
    entityId: applicantId,
    campusId: parsed.data.campusId,
    metadata: { input: parsed.data },
  });
  revalidatePath("/recruitment/applicants");
  revalidatePath(`/recruitment/applicants/${applicantId}`);
  return success(applicantId);
}

export async function createApplicationAction(input: ApplicationCreateInput): Promise<ActionResult> {
  const parsed = applicationCreateSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid application input.");
  const [applicantScope, vacancyScope] = await Promise.all([
    getApplicantScopeById(parsed.data.applicantId),
    getVacancyScopeById(parsed.data.vacancyId),
  ]);
  if (!applicantScope) return failure("Applicant not found.");
  if (!vacancyScope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: applicantScope.campusId,
    officeId: applicantScope.officeId,
  });
  await requirePermission({
    permission: "recruitment.vacancies.read",
    campusId: vacancyScope.campusId,
    officeId: vacancyScope.officeId,
  });
  const result = await createApplication(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create application.");
  if (result.applicationId) {
    await safeAuditLog({
      eventType: "recruitment.application_created",
      action: "create_application",
      entityType: "recruitment_applications",
      entityId: result.applicationId,
      campusId: applicantScope.campusId,
      metadata: { input: parsed.data },
    });
  }
  revalidatePath(`/recruitment/applicants/${parsed.data.applicantId}`);
  return success(result.applicationId ?? undefined);
}

export async function updateApplicationStatusAction(applicationId: string, input: ApplicationStatusInput): Promise<ActionResult> {
  const parsed = applicationStatusSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid application status.");
  const scope = await getApplicationScopeById(applicationId);
  if (!scope) return failure("Application not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await updateApplicationStatus(applicationId, parsed.data.status, parsed.data.remarks);
  if (!result.ok) return failure(result.error ?? "Failed to update application status.");
  await safeAuditLog({
    eventType: "recruitment.application_status_updated",
    action: "update_application_status",
    entityType: "recruitment_applications",
    entityId: applicationId,
    campusId: scope.campusId,
    metadata: parsed.data,
  });
  revalidatePath(`/recruitment/applicants/${scope.applicantId}`);
  return success(applicationId);
}

export async function createScreeningResultAction(input: ScreeningResultInput): Promise<ActionResult> {
  const parsed = screeningResultSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid screening result.");
  const scope = await getApplicantScopeById(parsed.data.applicantId);
  if (!scope) return failure("Applicant not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await createScreeningResult(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to record screening result.");
  await safeAuditLog({
    eventType: "recruitment.screening_result_created",
    action: "create_screening_result",
    entityType: "recruitment_screening_results",
    entityId: result.id ?? null,
    campusId: scope.campusId,
    metadata: parsed.data,
  });
  revalidatePath(`/recruitment/applicants/${parsed.data.applicantId}`);
  return success(result.id ?? undefined);
}

export async function createInterviewRecordAction(input: InterviewRecordInput): Promise<ActionResult> {
  const parsed = interviewRecordSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid interview record.");
  const scope = await getApplicantScopeById(parsed.data.applicantId);
  if (!scope) return failure("Applicant not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await createInterviewRecord(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to record interview.");
  await safeAuditLog({
    eventType: "recruitment.interview_record_created",
    action: "create_interview_record",
    entityType: "recruitment_interviews",
    entityId: result.id ?? null,
    campusId: scope.campusId,
    metadata: parsed.data,
  });
  revalidatePath(`/recruitment/applicants/${parsed.data.applicantId}`);
  return success(result.id ?? undefined);
}

// ── Duplicate detection ──────────────────────────────────────────────────────

export async function findPotentialDuplicatesAction(input: {
  email?: string | null;
  mobileNo?: string | null;
  excludeApplicantId?: string | null;
}): Promise<{ ok: true; matches: DuplicateApplicantMatch[] } | { ok: false; error: string }> {
  try {
    const context = await requirePermission({ permission: "recruitment.applicants.read" });
    const matches = await findPotentialDuplicateApplicants(
      {
        email: input.email ?? null,
        mobileNo: input.mobileNo ?? null,
        excludeApplicantId: input.excludeApplicantId ?? null,
      },
      context
    );
    return { ok: true, matches };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to look up duplicates." };
  }
}

// ── Change Stage with remarks ────────────────────────────────────────────────

export async function changeApplicantStageAction(input: StageChangeInput): Promise<ActionResult> {
  const parsed = stageChangeSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid stage change input.");

  const scope = await getApplicantScopeById(parsed.data.applicantId);
  if (!scope) return failure("Applicant not found.");
  await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const current = await getApplicantConversionState(parsed.data.applicantId);
  if (!current) return failure("Applicant not found.");

  if (current.status === parsed.data.status) {
    return failure("Applicant is already at this stage.");
  }

  if (parsed.data.status === "hired" && !current.convertedEmployeeId) {
    return failure(
      'To mark as hired, use "Convert to Employee" to create the employee record.'
    );
  }

  const result = await updateApplicantStatus(parsed.data.applicantId, parsed.data.status);
  if (!result.ok) return failure(result.error ?? "Failed to update stage.");
  await safeAuditLog({
    eventType: "recruitment.applicant_stage_changed",
    action: "change_applicant_stage",
    entityType: "recruitment_applicants",
    entityId: parsed.data.applicantId,
    campusId: scope.campusId,
    metadata: {
      fromStatus: current.status,
      toStatus: parsed.data.status,
      remarks: parsed.data.remarks ?? null,
    },
  });

  revalidatePath(`/recruitment/applicants/${parsed.data.applicantId}`);
  revalidatePath("/recruitment/applicants");
  revalidatePath("/recruitment");
  return success(parsed.data.applicantId);
}

// ── Convert applicant -> employee ────────────────────────────────────────────

type ConvertResult =
  | { ok: true; employeeId: string }
  | { ok: false; error: string };

export async function convertApplicantToEmployeeAction(
  input: ConvertApplicantToEmployeeInput
): Promise<ConvertResult> {
  const parsed = convertApplicantToEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid conversion input." };
  }

  const scope = await getApplicantScopeById(parsed.data.applicantId);
  if (!scope) return { ok: false, error: "Applicant not found." };

  const context = await requirePermission({
    permission: "recruitment.applicants.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  // Also require write on the destination employee scope.
  await requirePermission({
    permission: "employee.records.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId ?? null,
  });

  if (parsed.data.officeId) {
    const valid = await officeBelongsToCampus({
      officeId: parsed.data.officeId,
      campusId: parsed.data.campusId,
    });
    if (!valid) return { ok: false, error: "Selected office does not belong to selected campus." };
  }

  const applicant = await getApplicantById(parsed.data.applicantId);
  if (!applicant) return { ok: false, error: "Applicant not found." };

  if (applicant.convertedEmployeeId) {
    return { ok: false, error: "This applicant has already been converted to an employee." };
  }
  if (applicant.status !== "shortlisted" && applicant.status !== "hired") {
    return { ok: false, error: "Only shortlisted applicants can be converted to employees." };
  }

  if (applicant.email) {
    const dup = await findActiveEmployeeByEmail(applicant.email);
    if (dup) {
      return {
        ok: false,
        error:
          "An active employee with the same email already exists. Resolve the duplicate before converting.",
      };
    }
  }

  const employeeInput = {
    employeeNo: parsed.data.employeeNo,
    firstName: applicant.firstName,
    middleName: applicant.middleName,
    lastName: applicant.lastName,
    suffix: applicant.suffix,
    birthDate: null,
    sex: null,
    email: applicant.email,
    mobileNo: applicant.mobileNo,
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId ?? null,
    positionTitle: parsed.data.positionTitle ?? null,
    plantillaItemNo: null,
    employmentStatus: parsed.data.employmentStatus,
    dateHired: parsed.data.dateHired,
    civilStatus: null,
    tin: null,
    gsisNo: null,
    philhealthNo: null,
    pagibigNo: null,
    employmentType: parsed.data.employmentType ?? null,
    dateSeparated: null,
    separationReason: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    presentAddress: null,
    permanentAddress: null,
    cabinetNo: null,
    externalRef: null,
  };

  const created = await createEmployee(employeeInput, context.appUserId);
  if (!created.ok || !created.employeeId) {
    return { ok: false, error: created.error ?? "Failed to create employee record." };
  }

  const linked = await linkApplicantToEmployeeAndMarkHired(
    parsed.data.applicantId,
    created.employeeId
  );
  if (!linked.ok) {
    return {
      ok: false,
      error:
        linked.error ??
        "Employee was created but linking back to the applicant failed. Please contact your administrator.",
    };
  }

  await safeAuditLog({
    eventType: "recruitment.applicant_converted",
    action: "convert_to_employee",
    entityType: "recruitment_applicants",
    entityId: parsed.data.applicantId,
    campusId: parsed.data.campusId,
    metadata: {
      employeeId: created.employeeId,
      employeeNo: parsed.data.employeeNo,
      employmentStatus: parsed.data.employmentStatus,
      dateHired: parsed.data.dateHired,
    },
  });

  revalidatePath(`/recruitment/applicants/${parsed.data.applicantId}`);
  revalidatePath("/recruitment/applicants");
  revalidatePath("/recruitment");
  revalidatePath("/employees");
  revalidatePath(`/employees/${created.employeeId}`);

  return { ok: true, employeeId: created.employeeId };
}

