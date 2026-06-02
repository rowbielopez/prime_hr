import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type { CampusFormInput } from "@/features/admin/organization/schemas/campus-form.schema";
import type {
  CampusListItem,
  CampusOption,
} from "@/features/admin/organization/types";

export type CampusSnapshot = {
  code: string;
  name: string;
  shortName: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CreateCampusResult =
  | { ok: true; campusId: string }
  | { ok: false; error: string };

export type SimpleMutationResult = { ok: true } | { ok: false; error: string };

type CampusListSelectRow = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type CampusOptionSelectRow = {
  id: string;
  name: string;
  code: string;
  short_name: string | null;
  sort_order: number;
};

type CampusSnapshotRow = {
  code: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  is_active: boolean;
};

type CampusIdRow = { id: string };
type QueryError = { message: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };

function typedQuery<T>(value: unknown): QueryResult<T> {
  return value as QueryResult<T>;
}

function isGlobalOrganizationAdmin(context?: AuthorizationContext): boolean {
  return (
    !context ||
    context.isSuperAdmin ||
    context.roles.includes("central_hr_admin")
  );
}

export async function getCampusSnapshot(
  campusId: string,
): Promise<CampusSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<CampusSnapshotRow>(
    await supabase
      .from("campuses")
      .select("code, name, short_name, sort_order, is_active")
      .eq("id", campusId)
      .is("deleted_at", null)
      .maybeSingle(),
  );

  if (error || !data) return null;

  return {
    code: data.code,
    name: data.name,
    shortName: data.short_name,
    sortOrder: data.sort_order,
    isActive: data.is_active,
  };
}

export async function listCampuses(): Promise<CampusListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<CampusListSelectRow[]>(
    await supabase
      .from("campuses")
      .select("id, code, name, short_name, sort_order, is_active, created_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function listCampusOptions(
  context?: AuthorizationContext,
): Promise<CampusOption[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("campuses")
    .select("id, name, code, short_name, sort_order")
    .is("deleted_at", null)
    .eq("is_active", true);
  if (!isGlobalOrganizationAdmin(context) && context?.campusScopes.length) {
    query = query.in("id", context.campusScopes);
  }
  const { data, error } = typedQuery<CampusOptionSelectRow[]>(
    await query
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    shortName: row.short_name,
    sortOrder: row.sort_order,
  }));
}

export async function createCampus(
  input: CampusFormInput,
): Promise<CreateCampusResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<CampusIdRow>(
    await supabase
      .from("campuses")
      .insert({
        code: input.code,
        name: input.name,
        short_name: input.shortName,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      } as never)
      .select("id")
      .single(),
  );

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create campus" };
  }

  return { ok: true, campusId: data.id };
}

export async function updateCampus(
  campusId: string,
  input: CampusFormInput,
): Promise<SimpleMutationResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase
      .from("campuses")
      .update({
        code: input.code,
        name: input.name,
        short_name: input.shortName,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      } as never)
      .eq("id", campusId),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function setCampusActive(
  campusId: string,
  isActive: boolean,
): Promise<SimpleMutationResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase
      .from("campuses")
      .update({ is_active: isActive } as never)
      .eq("id", campusId),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
