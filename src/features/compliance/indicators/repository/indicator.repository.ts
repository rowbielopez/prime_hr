import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IndicatorFormInput } from "@/features/compliance/indicators/schemas/indicator-form.schema";
import type { ComplianceIndicatorAdminItem, PrimeAreaOption } from "@/features/compliance/indicators/types";

type QueryError = { message: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };

function typedQuery<T>(value: unknown): QueryResult<T> {
  return value as QueryResult<T>;
}

type AreaRow = {
  id: string;
  code: string;
  name: string;
};

type IndicatorRow = {
  id: string;
  area_id: string;
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  area: { code: string; name: string } | Array<{ code: string; name: string }> | null;
};

type IndicatorSnapshot = {
  area_id: string;
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
};

type IndicatorIdRow = { id: string };

function resolveSingle<T>(input: T | T[] | null): T | null {
  if (!input) return null;
  return Array.isArray(input) ? (input[0] ?? null) : input;
}

export async function listPrimeAreaOptions(): Promise<PrimeAreaOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<AreaRow[]>(
    await supabase
      .from("compliance_areas")
      .select("id, code, name")
      .is("deleted_at", null)
      .order("code", { ascending: true }),
  );
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
}

export async function listComplianceIndicatorsAdmin(): Promise<ComplianceIndicatorAdminItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<IndicatorRow[]>(
    await supabase
      .from("compliance_indicators")
      .select("id, area_id, code, title, description, is_active, created_at, area:compliance_areas(code,name)")
      .is("deleted_at", null)
      .order("code", { ascending: true }),
  );
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const area = resolveSingle(row.area);
    return {
      id: row.id,
      areaId: row.area_id,
      areaCode: area?.code ?? "N/A",
      areaName: area?.name ?? "Unknown Area",
      code: row.code,
      title: row.title,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  });
}

export async function getIndicatorSnapshot(indicatorId: string): Promise<IndicatorSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<IndicatorSnapshot>(
    await supabase
      .from("compliance_indicators")
      .select("area_id, code, title, description, is_active")
      .eq("id", indicatorId)
      .is("deleted_at", null)
      .maybeSingle(),
  );
  if (error || !data) return null;
  return data;
}

export async function createComplianceIndicator(input: IndicatorFormInput): Promise<{ ok: true; indicatorId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = typedQuery<IndicatorIdRow>(
    await supabase
      .from("compliance_indicators")
      .insert({
        area_id: input.areaId,
        code: input.code,
        title: input.title,
        description: input.description,
        is_active: input.isActive,
      } as never)
      .select("id")
      .single(),
  );

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create compliance indicator." };
  return { ok: true, indicatorId: data.id };
}

export async function updateComplianceIndicator(
  indicatorId: string,
  input: IndicatorFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase
      .from("compliance_indicators")
      .update({
        area_id: input.areaId,
        code: input.code,
        title: input.title,
        description: input.description,
        is_active: input.isActive,
      } as never)
      .eq("id", indicatorId),
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setComplianceIndicatorActive(
  indicatorId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = typedQuery<null>(
    await supabase
      .from("compliance_indicators")
      .update({ is_active: isActive } as never)
      .eq("id", indicatorId),
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
