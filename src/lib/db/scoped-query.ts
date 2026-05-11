import type { AuthorizationContext } from "@/features/auth/types";

/**
 * Applies campus scope filters for list/detail queries against tables
 * that use `campus_id` and optional `office_id` columns.
 *
 * We intentionally avoid adding an `office_id IN (...)` clause here because it can
 * hide valid campus-level rows where `office_id` is null. RLS remains the source of
 * truth for final office-level access checks.
 */
export function applyAuthorizationScope<
  QueryT extends { in: (column: string, values: string[]) => QueryT },
>(query: QueryT, context?: AuthorizationContext): QueryT {
  if (!context || context.isSuperAdmin) {
    return query;
  }
  let scoped = query;
  if (context.campusScopes.length > 0) {
    scoped = scoped.in("campus_id", context.campusScopes);
  }
  return scoped;
}
