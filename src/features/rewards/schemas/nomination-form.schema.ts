import { z } from "zod";

export const rewardNominationFormSchema = z.object({
  awardId: z.string().uuid(),
  nomineeEmployeeId: z.string().uuid(),
  justification: z.string().trim().min(10).max(4000),
  nominatorRemarks: z.string().trim().max(2000).nullable().optional(),
});

export type RewardNominationFormInput = z.infer<typeof rewardNominationFormSchema>;

