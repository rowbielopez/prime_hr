import type { ProgramStatus } from "@/features/learning/types";

const transitions: Record<ProgramStatus, ProgramStatus[]> = {
  draft: ["active", "archived"],
  active: ["draft", "archived"],
  archived: ["draft", "active"],
};

/** Allowed one-step status changes for training programs. */
export function canTransitionProgramStatus(from: ProgramStatus, to: ProgramStatus): boolean {
  if (from === to) return true;
  return transitions[from]?.includes(to) ?? false;
}
