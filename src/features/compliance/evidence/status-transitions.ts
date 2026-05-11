import type { EvidenceStatus } from "@/features/compliance/evidence/types";

const BASE: Record<EvidenceStatus, EvidenceStatus[]> = {
  draft: ["draft", "submitted"],
  submitted: ["submitted", "approved", "rejected"],
  rejected: ["rejected", "submitted"],
  approved: [],
};

/**
 * Allowed target statuses for the status dialog and server-side validation.
 * Approved rows are locked for non–central-admin users (see DB trigger + actions).
 */
export function getAllowedEvidenceStatusTransitions(
  current: EvidenceStatus,
  isGlobalAdmin: boolean
): EvidenceStatus[] {
  // Privileged users can reopen, but the DB requires remarks for overrides.
  if (isGlobalAdmin && (current === "approved" || current === "submitted" || current === "rejected")) {
    return [current, "draft", "submitted", "approved", "rejected"];
  }
  return BASE[current] ?? [];
}

export function assertValidEvidenceStatusTransition(
  from: EvidenceStatus,
  to: EvidenceStatus,
  isGlobalAdmin: boolean
): { ok: true } | { ok: false; error: string } {
  const allowed = getAllowedEvidenceStatusTransitions(from, isGlobalAdmin);
  if (!allowed.includes(to)) {
    return { ok: false, error: `Cannot change status from "${from}" to "${to}".` };
  }
  return { ok: true };
}

/** Filters workflow targets by write vs review permissions; always includes the current status. */
export function filterEvidenceStatusOptionsForActor(
  allowed: EvidenceStatus[],
  current: EvidenceStatus,
  canWriteEvidence: boolean,
  canReview: boolean
): EvidenceStatus[] {
  const out = new Set<EvidenceStatus>();
  for (const s of allowed) {
    if (s === current) {
      out.add(s);
      continue;
    }
    if (s === "approved" || s === "rejected") {
      if (canReview) out.add(s);
    } else if (canWriteEvidence) {
      out.add(s);
    }
  }
  out.add(current);
  return Array.from(out);
}
