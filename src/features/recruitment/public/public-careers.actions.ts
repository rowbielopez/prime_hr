"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { resolvePublicVacancyIdBySlug } from "@/features/recruitment/public/repository/public-careers.repository";
import { publicApplicationSchema } from "@/features/recruitment/public/schemas/public-application.schema";
import {
  checkIpRateLimit,
  checkEmailVacancyRateLimit,
} from "@/lib/security/rate-limiter";
import type { PublicApplicationResult } from "@/features/recruitment/public/types";

async function nextReferenceNumber(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<string | null> {
  // Backed by `public.next_application_reference_no()` (migration 0057).
  const { data, error } = await supabase.rpc(
    "next_application_reference_no" as never,
  );
  const value = data as unknown;
  if (error || typeof value !== "string" || value.length === 0) return null;
  return value;
}

/**
 * Extracts the client IP from request headers for rate limiting.
 *
 * Prefers `x-real-ip`, which the trusted reverse proxy (Vercel / nginx) sets to
 * the actual connecting socket address and the client cannot influence. Only
 * when it is absent do we fall back to `x-forwarded-for` — and there we take the
 * RIGHTMOST entry, the hop appended by our own proxy, rather than the leftmost
 * value, which a client can spoof by sending its own `X-Forwarded-For` header.
 * Returns "unknown" when neither header is present.
 */
async function getClientIp(): Promise<string> {
  try {
    const hdrs = await headers();

    const realIp = hdrs.get("x-real-ip")?.trim();
    if (realIp) {
      return realIp;
    }

    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) {
      const hops = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (hops.length > 0) {
        // Rightmost hop is the one our proxy appended; it cannot be forged by
        // the client (which can only prepend entries on the left).
        return hops[hops.length - 1];
      }
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function submitPublicApplicationAction(
  input: unknown,
): Promise<PublicApplicationResult> {
  try {
    const parsed = publicApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "validation_error",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }
    const data = parsed.data;

    // Honeypot: if the hidden field is filled, it is almost certainly a bot.
    // Return a generic vacancy_unavailable so bots get no useful signal.
    if (data._hp && data._hp.trim().length > 0) {
      return { status: "vacancy_unavailable" };
    }

    // IP rate limit check (burst + daily).
    const ip = await getClientIp();
    if (!(await checkIpRateLimit(ip))) {
      return { status: "rate_limited" };
    }

    // Email + vacancy rate limit (prevents repeated resubmission with same address).
    if (!(await checkEmailVacancyRateLimit(data.email, data.vacancySlug))) {
      return { status: "rate_limited" };
    }

    const vacancy = await resolvePublicVacancyIdBySlug(data.vacancySlug);
    if (!vacancy) {
      return { status: "vacancy_unavailable" };
    }

    const supabase = createSupabaseAdminClient();
    const normalizedEmail = data.email.toLowerCase();

    // Duplicate guard: same email already applied to same vacancy (non-deleted).
    const { data: existing } = await supabase
      .from("recruitment_applications")
      .select("id, reference_no, applicant:recruitment_applicants!inner(email)")
      .eq("vacancy_id", vacancy.vacancyId)
      .is("deleted_at", null)
      .eq("applicant.email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (existing) {
      const dup = existing as { id: string; reference_no: string | null };
      return {
        status: "duplicate",
        referenceNo: dup.reference_no ?? "—",
      };
    }

    // Insert applicant.
    const applicantInsert = {
      first_name: data.firstName,
      middle_name: data.middleName || null,
      last_name: data.lastName,
      suffix: data.suffix || null,
      email: normalizedEmail,
      mobile_no: data.mobileNo,
      campus_id: vacancy.campusId,
      office_id: null,
      status: "new",
      notes: data.coverNote || null,
      source: "public_careers",
    };
    const { data: applicantRow, error: applicantError } = await supabase
      .from("recruitment_applicants")
      .insert(applicantInsert as never)
      .select("id")
      .single();
    if (applicantError || !applicantRow) {
      return {
        status: "error",
        message:
          "We could not record your application. Please try again later.",
      };
    }
    const applicantId = (applicantRow as { id: string }).id;

    // Generate reference number.
    const referenceNo = await nextReferenceNumber(supabase);
    if (!referenceNo) {
      // Roll back applicant insert to avoid orphaning.
      await supabase
        .from("recruitment_applicants")
        .delete()
        .eq("id", applicantId);
      return {
        status: "error",
        message: "Unable to issue a reference number. Please try again.",
      };
    }

    // Insert application. The DB trigger `sync_and_validate_application_scope`
    // will overwrite campus_id/office_id from the vacancy.
    const applicationInsert = {
      applicant_id: applicantId,
      vacancy_id: vacancy.vacancyId,
      campus_id: vacancy.campusId,
      office_id: null,
      status: "submitted",
      applied_at: new Date().toISOString().slice(0, 10),
      remarks: null,
      reference_no: referenceNo,
    };
    const { error: applicationError } = await supabase
      .from("recruitment_applications")
      .insert(applicationInsert as never);
    if (applicationError) {
      await supabase
        .from("recruitment_applicants")
        .delete()
        .eq("id", applicantId);
      return {
        status: "error",
        message:
          "We could not record your application. Please try again later.",
      };
    }

    try {
      await writeAuditLog({
        eventType: "recruitment.public_application_submitted",
        action: "create",
        entityType: "recruitment_application",
        entityId: undefined,
        campusId: vacancy.campusId,
        metadata: {
          vacancy_slug: data.vacancySlug,
          vacancy_title: vacancy.title,
          reference_no: referenceNo,
          source: "public_careers",
        },
      });
    } catch {
      // Audit log failure must not abort the submission once persisted.
    }

    return { status: "ok", referenceNo };
  } catch {
    return {
      status: "error",
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}
