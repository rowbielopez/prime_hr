import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEmployeeIdForAppUser(appUserId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("app_users").select("employee_id").eq("id", appUserId).maybeSingle();
  if (error || !data) return null;
  return (data as { employee_id: string | null }).employee_id ?? null;
}

/** Campus for the linked employee record (training requests must stay within this campus in MVP). */
export async function getLinkedEmployeeCampus(appUserId: string): Promise<{ employeeId: string; campusId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userRow, error: userErr } = await supabase
    .from("app_users")
    .select("employee_id")
    .eq("id", appUserId)
    .maybeSingle();
  if (userErr || !userRow) return null;
  const employeeId = (userRow as { employee_id: string | null }).employee_id;
  if (!employeeId) return null;
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("campus_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (empErr || !emp) return null;
  const campusId = (emp as { campus_id: string }).campus_id;
  return { employeeId, campusId };
}
