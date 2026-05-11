import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCampusIdByOfficeId(officeId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offices")
    .select("campus_id")
    .eq("id", officeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { campus_id: string }).campus_id;
}

export async function officeBelongsToCampus(input: { officeId: string; campusId: string }): Promise<boolean> {
  const campusId = await getCampusIdByOfficeId(input.officeId);
  return campusId === input.campusId;
}
