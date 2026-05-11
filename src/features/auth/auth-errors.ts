export const LOGIN_ERROR_CODES = [
  "unauthorized_domain",
  "unverified_email",
  "invalid_hosted_domain",
  "access_pending",
  "unauthorized_access",
  "ambiguous_employee_match",
  "profile_resolution_failed",
  "oauth_exchange_failed",
  "oauth_code_missing",
  "oauth_user_read_failed",
  "session_reset_failed",
] as const;

export type LoginErrorCode = (typeof LOGIN_ERROR_CODES)[number];

export const FORBIDDEN_REASONS = [
  "unauthorized_access",
  "missing_permission",
  "campus_scope_denied",
  "office_scope_denied",
] as const;

export type ForbiddenReason = (typeof FORBIDDEN_REASONS)[number];

export function buildLoginUrl(input?: { error?: LoginErrorCode; next?: string }): string {
  const params = new URLSearchParams();
  if (input?.error) params.set("error", input.error);
  if (input?.next) params.set("next", input.next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function buildForbiddenUrl(reason: ForbiddenReason): string {
  const params = new URLSearchParams({ reason });
  return `/forbidden?${params.toString()}`;
}

export function getForbiddenReasonMessage(reason?: string): string {
  switch (reason) {
    case "missing_permission":
      return "Your account is authenticated but does not have the required permission for this page or action.";
    case "campus_scope_denied":
      return "Your role does not grant access to the requested campus data scope.";
    case "office_scope_denied":
      return "Your role does not grant access to the requested office data scope.";
    case "unauthorized_access":
    default:
      return "Your account is not yet authorized for this area. Please contact Central HR or your campus HR officer.";
  }
}

