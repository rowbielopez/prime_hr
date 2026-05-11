import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  CompetencyAssessmentDetail,
  CompetencyAssessmentListItem,
  CompetencyAssessmentStatus,
} from "@/features/learning/types";
import type { CompetencyAssessmentFormInput } from "@/features/learning/competencies/schemas/assessment-form.schema";

type EmployeeMini = {
  id: string;
  employee_no: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
};

function nameOf(e: EmployeeMini) {
  return [e.first_name, e.middle_name, e.last_name, e.suffix].filter(Boolean).join(" ");
}

export async function listCompetencyAssessments(context?: AuthorizationContext): Promise<CompetencyAssessmentListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("ld_competency_assessments")
    .select("id, employee_id, campus_id, assessment_date, status, remarks, campus:campuses(name)")
    .order("assessment_date", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    employee_id: string;
    campus_id: string;
    assessment_date: string;
    status: CompetencyAssessmentStatus;
    remarks: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empIds = [...new Set(rows.map((r) => r.employee_id))];
  const { data: emps } = await supabase
    .from("employees")
    .select("id, employee_no, first_name, middle_name, last_name, suffix")
    .in("id", empIds);
  const empMap = new Map(((emps ?? []) as EmployeeMini[]).map((e) => [e.id, e]));
  return rows.map((row) => {
    const e = empMap.get(row.employee_id);
    const campusName = row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "Unknown" : row.campus.name) : "Unknown";
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: e ? nameOf(e) : "Unknown",
      employeeNo: e?.employee_no ?? "?",
      campusId: row.campus_id,
      campusName,
      assessmentDate: row.assessment_date,
      status: row.status,
      remarks: row.remarks,
    };
  });
}

export async function getCompetencyAssessmentById(
  assessmentId: string,
  context?: AuthorizationContext
): Promise<CompetencyAssessmentDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("ld_competency_assessments")
    .select("id, employee_id, campus_id, assessment_date, status, remarks, assessor_employee_id, reviewer_employee_id, campus:campuses(name)")
    .eq("id", assessmentId);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    employee_id: string;
    campus_id: string;
    assessment_date: string;
    status: CompetencyAssessmentStatus;
    remarks: string | null;
    assessor_employee_id: string | null;
    reviewer_employee_id: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
  };
  const { data: empData } = await supabase
    .from("employees")
    .select("id, employee_no, first_name, middle_name, last_name, suffix")
    .eq("id", row.employee_id)
    .maybeSingle();
  const employee = (empData as EmployeeMini | null) ?? null;
  const { data: items } = await supabase
    .from("ld_competency_assessment_items")
    .select("id, competency_id, target_level, current_level, evidence_notes, competency:ld_competencies(code, title)")
    .eq("assessment_id", assessmentId);
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee ? nameOf(employee) : "Unknown",
    employeeNo: employee?.employee_no ?? "?",
    campusId: row.campus_id,
    campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "Unknown" : row.campus.name) : "Unknown",
    assessmentDate: row.assessment_date,
    status: row.status,
    remarks: row.remarks,
    assessorEmployeeId: row.assessor_employee_id,
    reviewerEmployeeId: row.reviewer_employee_id,
    items: ((items ?? []) as Array<{
      id: string;
      competency_id: string;
      target_level: number;
      current_level: number;
      evidence_notes: string | null;
      competency: { code: string; title: string } | Array<{ code: string; title: string }> | null;
    }>).map((item) => ({
      id: item.id,
      competencyId: item.competency_id,
      competencyCode: item.competency ? (Array.isArray(item.competency) ? item.competency[0]?.code ?? "?" : item.competency.code) : "?",
      competencyTitle: item.competency ? (Array.isArray(item.competency) ? item.competency[0]?.title ?? "?" : item.competency.title) : "?",
      targetLevel: item.target_level,
      currentLevel: item.current_level,
      evidenceNotes: item.evidence_notes,
    })),
  };
}

export async function createCompetencyAssessment(input: CompetencyAssessmentFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_competency_assessments")
    .insert({
      employee_id: input.employeeId,
      campus_id: input.campusId,
      office_id: input.officeId,
      assessment_date: input.assessmentDate,
      status: input.status,
      remarks: input.remarks?.trim() ? input.remarks.trim() : null,
    } as never)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create assessment." };
  const assessmentId = (data as { id: string }).id;
  const { error: itemsErr } = await supabase.from("ld_competency_assessment_items").insert(
    input.items.map((item) => ({
      assessment_id: assessmentId,
      competency_id: item.competencyId,
      target_level: item.targetLevel,
      current_level: item.currentLevel,
      evidence_notes: item.evidenceNotes?.trim() ? item.evidenceNotes.trim() : null,
    })) as never
  );
  return { ok: !itemsErr, error: itemsErr?.message, assessmentId };
}

export async function updateCompetencyAssessment(assessmentId: string, input: CompetencyAssessmentFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ld_competency_assessments")
    .update({
      employee_id: input.employeeId,
      campus_id: input.campusId,
      office_id: input.officeId,
      assessment_date: input.assessmentDate,
      status: input.status,
      remarks: input.remarks?.trim() ? input.remarks.trim() : null,
    } as never)
    .eq("id", assessmentId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("ld_competency_assessment_items").delete().eq("assessment_id", assessmentId);
  const { error: itemsErr } = await supabase.from("ld_competency_assessment_items").insert(
    input.items.map((item) => ({
      assessment_id: assessmentId,
      competency_id: item.competencyId,
      target_level: item.targetLevel,
      current_level: item.currentLevel,
      evidence_notes: item.evidenceNotes?.trim() ? item.evidenceNotes.trim() : null,
    })) as never
  );
  return { ok: !itemsErr, error: itemsErr?.message };
}
