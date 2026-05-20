import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";

export type RecruitmentDashboardSummary = {
    totals: {
        totalApplicants: number;
        newThisMonth: number;
        shortlisted: number;
        inInterview: number;
        hired: number;
        openVacancies: number;
    };
    recentApplicants: Array<{
        id: string;
        fullName: string;
        status: string;
        campusName: string;
        updatedAt: string;
        convertedEmployeeId: string | null;
    }>;
    upcomingInterviews: Array<{
        id: string;
        applicantId: string;
        applicantName: string;
        scheduledAt: string;
        mode: string;
        outcome: string;
    }>;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
    if (!input) return null;
    if (Array.isArray(input)) return input[0]?.name ?? null;
    return input.name ?? null;
}

function fullName(input: { first_name: string; middle_name: string | null; last_name: string; suffix: string | null }) {
    return [input.first_name, input.middle_name, input.last_name, input.suffix].filter(Boolean).join(" ");
}

export async function getRecruitmentDashboardSummary(
    context?: AuthorizationContext
): Promise<RecruitmentDashboardSummary> {
    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const nowIso = now.toISOString();

    // Build all queries up-front, then run in parallel
    const totalApplicantsQ = supabase
        .from("recruitment_applicants")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

    const newThisMonthQ = supabase
        .from("recruitment_applicants")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("created_at", startOfMonth);

    const shortlistedQ = supabase
        .from("recruitment_applicants")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "shortlisted");

    const hiredQ = supabase
        .from("recruitment_applicants")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "hired");

    const interviewQ = supabase
        .from("recruitment_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "interview");

    const vacanciesQ = supabase
        .from("recruitment_vacancies")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "open");

    const recentQ = supabase
        .from("recruitment_applicants")
        .select(
            "id, first_name, middle_name, last_name, suffix, status, converted_employee_id, updated_at, campus:campuses(name)"
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);

    const upcomingQ = supabase
        .from("recruitment_interviews")
        .select(
            "id, applicant_id, scheduled_at, interview_mode, outcome, applicant:recruitment_applicants!inner(id, first_name, middle_name, last_name, suffix, campus_id, office_id)"
        )
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(5);

    const [
        { count: totalApplicants },
        { count: newThisMonth },
        { count: shortlisted },
        { count: hired },
        { count: inInterview },
        { count: openVacancies },
        { data: recentData },
        { data: upcomingData },
    ] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(totalApplicantsQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(newThisMonthQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(shortlistedQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(hiredQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(interviewQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(vacanciesQ, context) as unknown as Promise<{ count: number | null }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyAuthorizationScope(recentQ, context) as unknown as Promise<{ data: unknown[] | null }>,
        upcomingQ as unknown as Promise<{ data: unknown[] | null }>,
    ]);

    const recentApplicants = (recentData ?? []).map((row) => {
        const r = row as {
            id: string;
            first_name: string;
            middle_name: string | null;
            last_name: string;
            suffix: string | null;
            status: string;
            converted_employee_id: string | null;
            updated_at: string;
            campus: { name: string } | Array<{ name: string }> | null;
        };
        return {
            id: r.id,
            fullName: fullName(r),
            status: r.status,
            campusName: resolveName(r.campus) ?? "Unknown",
            updatedAt: r.updated_at,
            convertedEmployeeId: r.converted_employee_id,
        };
    });

    // Upcoming interviews (RLS handles scope; recruitment_interviews has no campus_id column)
    const upcomingInterviews = (upcomingData ?? []).map((row) => {
        const r = row as {
            id: string;
            applicant_id: string;
            scheduled_at: string;
            interview_mode: string;
            outcome: string;
            applicant: {
                id: string;
                first_name: string;
                middle_name: string | null;
                last_name: string;
                suffix: string | null;
            } | Array<{ id: string; first_name: string; middle_name: string | null; last_name: string; suffix: string | null }>;
        };
        const ap = Array.isArray(r.applicant) ? r.applicant[0] : r.applicant;
        return {
            id: r.id,
            applicantId: r.applicant_id,
            applicantName: ap
                ? [ap.first_name, ap.middle_name, ap.last_name, ap.suffix].filter(Boolean).join(" ")
                : "Unknown applicant",
            scheduledAt: r.scheduled_at,
            mode: r.interview_mode,
            outcome: r.outcome,
        };
    });

    return {
        totals: {
            totalApplicants: totalApplicants ?? 0,
            newThisMonth: newThisMonth ?? 0,
            shortlisted: shortlisted ?? 0,
            inInterview: inInterview ?? 0,
            hired: hired ?? 0,
            openVacancies: openVacancies ?? 0,
        },
        recentApplicants,
        upcomingInterviews,
    };
}
