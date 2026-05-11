"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/features/auth/server/require-permission";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import {
  competencyFormSchema,
  type CompetencyFormInput,
} from "@/features/learning/competencies/schemas/competency-form.schema";
import {
  competencyAssessmentFormSchema,
  type CompetencyAssessmentFormInput,
} from "@/features/learning/competencies/schemas/assessment-form.schema";
import { createCompetency, updateCompetency } from "@/features/learning/competencies/repository/competencies.repository";
import {
  createCompetencyAssessment,
  getCompetencyAssessmentById,
  updateCompetencyAssessment,
} from "@/features/learning/competencies/repository/assessments.repository";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function createCompetencyAction(input: CompetencyFormInput): Promise<ActionResult> {
  const parsed = competencyFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid competency.");
  await requirePermission({ permission: "learning.competencies.write", campusId: parsed.data.campusId ?? undefined });
  const result = await createCompetency(parsed.data);
  if (!result.ok || !result.competencyId) return fail(result.error ?? "Failed to create competency.");
  await writeAuditLog({
    eventType: "learning.competencies.create",
    action: "create",
    entityType: "ld_competencies",
    entityId: result.competencyId,
    metadata: { code: parsed.data.code },
  });
  revalidatePath("/learning/competencies");
  return { ok: true, id: result.competencyId };
}

export async function updateCompetencyAction(competencyId: string, input: CompetencyFormInput): Promise<ActionResult> {
  const parsed = competencyFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid competency.");
  await requirePermission({ permission: "learning.competencies.write", campusId: parsed.data.campusId ?? undefined });
  const result = await updateCompetency(competencyId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to update competency.");
  await writeAuditLog({
    eventType: "learning.competencies.update",
    action: "update",
    entityType: "ld_competencies",
    entityId: competencyId,
    metadata: { code: parsed.data.code },
  });
  revalidatePath("/learning/competencies");
  revalidatePath(`/learning/competencies/${competencyId}`);
  return { ok: true, id: competencyId };
}

export async function createCompetencyAssessmentAction(input: CompetencyAssessmentFormInput): Promise<ActionResult> {
  const parsed = competencyAssessmentFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid assessment.");
  await requirePermission({ permission: "learning.competencies.assess.write", campusId: parsed.data.campusId });
  const result = await createCompetencyAssessment(parsed.data);
  if (!result.ok || !result.assessmentId) return fail(result.error ?? "Failed to create assessment.");
  await writeAuditLog({
    eventType: "learning.competencies.assessment.create",
    action: "create",
    entityType: "ld_competency_assessments",
    entityId: result.assessmentId,
  });
  revalidatePath("/learning/competencies/assessments");
  return { ok: true, id: result.assessmentId };
}

export async function updateCompetencyAssessmentAction(
  assessmentId: string,
  input: CompetencyAssessmentFormInput
): Promise<ActionResult> {
  const parsed = competencyAssessmentFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid assessment.");
  const existing = await getCompetencyAssessmentById(assessmentId);
  await requirePermission({
    permission: "learning.competencies.assess.write",
    campusId: existing?.campusId ?? parsed.data.campusId,
  });
  const result = await updateCompetencyAssessment(assessmentId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to update assessment.");
  await writeAuditLog({
    eventType: "learning.competencies.assessment.update",
    action: "update",
    entityType: "ld_competency_assessments",
    entityId: assessmentId,
  });
  revalidatePath("/learning/competencies/assessments");
  revalidatePath(`/learning/competencies/assessments/${assessmentId}`);
  return { ok: true, id: assessmentId };
}
