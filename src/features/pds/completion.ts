import { PDS_SECTIONS } from "@/features/pds/constants";
import type { PdsSectionCompletion, PdsValidationIssue, PdsWorkspaceSummary } from "@/features/pds/types";

export function createInitialPdsWorkspaceSummary(): PdsWorkspaceSummary {
    const sectionCompletions = PDS_SECTIONS.map<PdsSectionCompletion>((section) => ({
        sectionKey: section.key,
        status: section.key === "overview" ? "draft" : "not_started",
        completedRequired: section.key === "overview" ? 1 : 0,
        totalRequired: section.key === "overview" ? 1 : 3,
        issues: [],
    }));

    return {
        profileStatus: "draft",
        completionScore: computePdsCompletionScore(sectionCompletions),
        sectionCompletions,
        lastSavedAt: null,
    };
}

export function computePdsCompletionScore(sectionCompletions: PdsSectionCompletion[]): number {
    const totals = sectionCompletions.reduce(
        (acc, section) => ({
            completed: acc.completed + section.completedRequired,
            required: acc.required + section.totalRequired,
        }),
        { completed: 0, required: 0 },
    );
    if (totals.required === 0) return 0;
    return Math.round((totals.completed / totals.required) * 100);
}

export function getBlockingIssues(issues: PdsValidationIssue[]): PdsValidationIssue[] {
    return issues.filter((issue) => issue.blocking);
}
