import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PERFORMANCE_RATING_BAND_RULES } from "@/features/performance/rating-band-config";
import type { PerformanceRatingBand } from "@/features/performance/types";

export type RatingBandConfigRow = {
  band: PerformanceRatingBand;
  minScore: number;
  sortOrder: number;
};

export type RatingBandConfigAudit = {
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
};

export async function listRatingBandConfig(): Promise<RatingBandConfigRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("performance_rating_band_config")
    .select("band, min_score, sort_order")
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) {
    return PERFORMANCE_RATING_BAND_RULES.map((row) => ({
      band: row.band,
      minScore: row.minScore,
      sortOrder: row.sortOrder,
    }));
  }
  return (data as Array<{ band: PerformanceRatingBand; min_score: number | string; sort_order: number }>).map((row) => ({
    band: row.band,
    minScore: Number(row.min_score),
    sortOrder: row.sort_order,
  }));
}

export async function upsertRatingBandConfig(rows: RatingBandConfigRow[], updatedByUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("performance_rating_band_config").upsert(
    rows.map((row) => ({
      band: row.band,
      min_score: row.minScore,
      sort_order: row.sortOrder,
      updated_at: new Date().toISOString(),
      updated_by_user_id: updatedByUserId,
    })) as never,
    { onConflict: "band" }
  );
  return { ok: !error, error: error?.message };
}

export async function getRatingBandConfigAudit(): Promise<RatingBandConfigAudit> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("performance_rating_band_config")
    .select("updated_at, updated_by_user_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { updated_at: string | null; updated_by_user_id: string | null } | null;
  if (!row) return { updatedAt: null, updatedByUserId: null, updatedByName: null };
  if (!row.updated_by_user_id) {
    return { updatedAt: row.updated_at, updatedByUserId: null, updatedByName: null };
  }

  const { data: user } = await supabase
    .from("app_users")
    .select("id, first_name, middle_name, last_name, suffix, email")
    .eq("id", row.updated_by_user_id)
    .maybeSingle();
  const userRow = user as
    | {
        id: string;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
        suffix: string | null;
        email: string | null;
      }
    | null;
  const fullName = userRow
    ? [userRow.first_name, userRow.middle_name, userRow.last_name, userRow.suffix].filter(Boolean).join(" ").trim()
    : "";
  return {
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
    updatedByName: fullName || userRow?.email || row.updated_by_user_id,
  };
}

