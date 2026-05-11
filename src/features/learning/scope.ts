import type { AuthorizationContext } from "@/features/auth/types";

/**
 * Campus officers should see org-wide programs (`campus_id` null) plus programs for their campuses.
 * Central HR with empty campus scopes sees all rows (no extra filter).
 */
// Supabase query builder typing varies by call chain; keep this helper loosely typed.
export function applyLearningProgramScope(query: unknown, context?: AuthorizationContext): unknown {
  const q = query as { or: (filter: string) => unknown };
  if (!context || context.isSuperAdmin) {
    return query;
  }
  if (context.campusScopes.length === 0) {
    return query;
  }
  const ids = context.campusScopes.join(",");
  return q.or(`campus_id.is.null,campus_id.in.(${ids})`);
}
