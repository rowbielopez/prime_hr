import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OfficeFormInput, OfficeTypeValue } from "@/features/admin/organization/schemas/office-form.schema";
import type { OfficeListItem } from "@/features/admin/organization/types";

export type OfficeSnapshot = {
  campusId: string;
  code: string;
  name: string;
  officeType: OfficeTypeValue;
  sortOrder: number;
  isActive: boolean;
};

export type CreateOfficeResult = { ok: true; officeId: string } | { ok: false; error: string };

export type SimpleMutationResult = { ok: true } | { ok: false; error: string };

type OfficeRow = {
  id: string;
  campus_id: string;
  code: string;
  name: string;
  sort_order: number;
  office_type: OfficeTypeValue;
  is_active: boolean;
  created_at: string;
  campus: { name: string; sort_order: number } | null;
};

type OfficeSnapshotRow = {
  campus_id: string;
  code: string;
  name: string;
  office_type: OfficeTypeValue;
  sort_order: number;
  is_active: boolean;
};

type OfficeIdRow = { id: string };
type QueryError = { message: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };

function typedQuery<T>(value: unknown): QueryResult<T> {
  return value as QueryResult<T>;
}

function mapOfficeRow(row: OfficeRow): OfficeListItem {
  const campusName = row.campus?.name ?? "";
  const campusSortOrder = row.campus?.sort_order ?? 0;
  return {
    id: row.id,
    campusId: row.campus_id,
    campusName,
    campusSortOrder,
    code: row.code,
    name: row.name,
    officeType: row.office_type,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function sortOfficeListItems(items: OfficeListItem[]): OfficeListItem[] {
  return [...items].sort((a, b) => {
    if (a.campusSortOrder !== b.campusSortOrder) {
      return a.campusSortOrder - b.campusSortOrder;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function getOfficeSnapshot(officeId: string): Promise<OfficeSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<OfficeSnapshotRow>(
    await supabase
      .from("offices")
      .select("campus_id, code, name, office_type, sort_order, is_active")
      .eq("id", officeId)
      .is("deleted_at", null)
      .maybeSingle(),
  );

  if (error || !data) return null;

  return {
    campusId: data.campus_id,
    code: data.code,
    name: data.name,
    officeType: data.office_type as OfficeTypeValue,
    sortOrder: data.sort_order,
    isActive: data.is_active,
  };
}

export async function listOffices(): Promise<OfficeListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<OfficeRow[]>(
    await supabase
      .from("offices")
      .select(
        "id, campus_id, code, name, sort_order, office_type, is_active, created_at, campus:campuses(name, sort_order)",
      )
      .is("deleted_at", null),
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  return sortOfficeListItems(rows.map(mapOfficeRow));
}

export async function createOffice(input: OfficeFormInput): Promise<CreateOfficeResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<OfficeIdRow>(
    await supabase
      .from("offices")
      .insert({
        campus_id: input.campusId,
        code: input.code,
        name: input.name,
        office_type: input.officeType,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      } as never)
      .select("id")
      .single(),
  );

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create office" };
  }

  return { ok: true, officeId: data.id };
}

export async function updateOffice(officeId: string, input: OfficeFormInput): Promise<SimpleMutationResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase
      .from("offices")
      .update({
        campus_id: input.campusId,
        code: input.code,
        name: input.name,
        office_type: input.officeType,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      } as never)
      .eq("id", officeId),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function setOfficeActive(officeId: string, isActive: boolean): Promise<SimpleMutationResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase.from("offices").update({ is_active: isActive } as never).eq("id", officeId),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
