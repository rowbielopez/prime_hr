"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PERFORMANCE_RATING_BAND_RULES } from "@/features/performance/rating-band-config";
import { requireRatingBandAdminAccess } from "@/features/performance/rating-band-authorization";
import { upsertRatingBandConfig, type RatingBandConfigRow } from "@/features/performance/rating-band.repository";

const bandSet = new Set<string>(PERFORMANCE_RATING_BAND_RULES.map((row) => row.band));

const ratingBandConfigSchema = z
  .array(
    z.object({
      band: z.string(),
      minScore: z.coerce.number().min(0).max(5),
      sortOrder: z.coerce.number().int().min(1).max(99),
    })
  )
  .superRefine((rows, ctx) => {
    if (rows.length !== PERFORMANCE_RATING_BAND_RULES.length) {
      ctx.addIssue({ code: "custom", message: "All rating bands must be provided." });
      return;
    }
    const seen = new Set<string>();
    for (const row of rows) {
      if (!bandSet.has(row.band)) {
        ctx.addIssue({ code: "custom", message: `Invalid rating band: ${row.band}` });
        return;
      }
      if (seen.has(row.band)) {
        ctx.addIssue({ code: "custom", message: `Duplicate band: ${row.band}` });
        return;
      }
      seen.add(row.band);
    }
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i].minScore < sorted[i + 1].minScore) {
        ctx.addIssue({
          code: "custom",
          message: "minScore must be non-increasing by sort order (higher bands first).",
        });
        return;
      }
    }
    const lowest = sorted[sorted.length - 1];
    if (!lowest || lowest.minScore !== 0) {
      ctx.addIssue({ code: "custom", message: "Lowest band must start at 0." });
    }
  });

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveRatingBandConfigAction(input: RatingBandConfigRow[]): Promise<ActionResult> {
  const context = await requireRatingBandAdminAccess();
  const parsed = ratingBandConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rating bands." };
  const result = await upsertRatingBandConfig(
    parsed.data.map((row) => ({
      band: row.band as RatingBandConfigRow["band"],
      minScore: row.minScore,
      sortOrder: row.sortOrder,
    })),
    context.appUserId
  );
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to save rating bands." };
  revalidatePath("/performance/rating-bands");
  revalidatePath("/performance/finalizations");
  revalidatePath("/performance/summary");
  return { ok: true };
}

