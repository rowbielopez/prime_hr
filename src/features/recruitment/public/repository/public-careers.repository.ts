import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PublicVacancyDetail,
  PublicVacancySummary,
} from "@/features/recruitment/public/types";

type PublicVacancyRow = {
  public_slug: string;
  title: string;
  description: string | null;
  qualification_notes: string | null;
  plantilla_item_no: string | null;
  employment_type: string | null;
  item_count: number;
  posted_at: string | null;
  closing_at: string | null;
  updated_at: string;
  required_documents: string[] | null;
  campus_name: string;
  office_name: string | null;
};

function toSummary(row: PublicVacancyRow): PublicVacancySummary {
  return {
    slug: row.public_slug,
    title: row.title,
    campusName: row.campus_name,
    officeName: row.office_name,
    employmentType: row.employment_type,
    itemCount: row.item_count,
    postedAt: row.posted_at,
    closingAt: row.closing_at,
  };
}

function toDetail(row: PublicVacancyRow): PublicVacancyDetail {
  return {
    ...toSummary(row),
    description: row.description,
    qualificationNotes: row.qualification_notes,
    plantillaItemNo: row.plantilla_item_no,
    requiredDocuments: row.required_documents ?? [],
    updatedAt: row.updated_at,
  };
}

/**
 * Lists currently-open vacancies via the anon-safe `public.public_vacancies` view.
 * Uses the service-role admin client purely for query convenience — the view itself
 * already restricts what can be read; no additional data is exposed.
 */
export async function listPublicVacancies(): Promise<PublicVacancySummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("public_vacancies")
    .select(
      "public_slug, title, description, qualification_notes, plantilla_item_no, employment_type, item_count, posted_at, closing_at, updated_at, campus_name, office_name",
    )
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as PublicVacancyRow[]).map(toSummary);
}

export async function getPublicVacancyBySlug(
  slug: string,
): Promise<PublicVacancyDetail | null> {
  if (!slug) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("public_vacancies")
    .select(
      "public_slug, title, description, qualification_notes, plantilla_item_no, employment_type, item_count, posted_at, closing_at, updated_at, required_documents, campus_name, office_name",
    )
    .eq("public_slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return toDetail(data as PublicVacancyRow);
}

/**
 * Resolves a vacancy slug to the internal vacancy id, but ONLY when the vacancy is
 * still publicly visible (open, not deleted, not expired). Used by the submission
 * action — never exposed to the public response surface.
 */
export async function resolvePublicVacancyIdBySlug(slug: string): Promise<{
  vacancyId: string;
  campusId: string;
  title: string;
} | null> {
  if (!slug) return null;
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("recruitment_vacancies")
    .select("id, title, campus_id, status, deleted_at, closing_at, public_slug")
    .eq("public_slug", slug)
    .eq("status", "open")
    .is("deleted_at", null)
    .or(`closing_at.is.null,closing_at.gte.${today}`)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; title: string; campus_id: string };
  return { vacancyId: row.id, campusId: row.campus_id, title: row.title };
}
