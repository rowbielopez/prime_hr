/**
 * Server-side logging helpers that strip personally identifiable information
 * (PII) before anything reaches stdout / log drains.
 *
 * Why: Supabase / Postgres errors frequently embed row values in their
 * `message`, `details`, and `hint` fields (e.g. a unique-violation reads
 * `Key (email)=(jane@csu.edu.ph) already exists`). Logging the raw error object
 * therefore leaks employee/applicant PII, which AGENTS.md §G forbids.
 *
 * These helpers log only non-sensitive diagnostic fields — the Postgres
 * SQLSTATE `code` and the error `name` — never free-text messages or details.
 */

export type RedactedError = {
  code?: string;
  name?: string;
};

/**
 * Reduces an unknown error to a PII-safe shape containing only the SQLSTATE
 * code (when present) and the error name. Free-text fields that may embed row
 * values (`message`, `details`, `hint`) are intentionally discarded.
 */
export function redactError(error: unknown): RedactedError {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; name?: unknown };
    const redacted: RedactedError = {};
    if (typeof candidate.code === "string" && candidate.code.length > 0) {
      redacted.code = candidate.code;
    }
    if (typeof candidate.name === "string" && candidate.name.length > 0) {
      redacted.name = candidate.name;
    }
    return redacted;
  }
  return {};
}

/**
 * Logs a server-side error under a stable scope label without leaking PII.
 * Use this instead of `console.error(scope, error)` anywhere the error may
 * originate from a database call.
 */
export function logServerError(scope: string, error: unknown): void {
  console.error(scope, redactError(error));
}
