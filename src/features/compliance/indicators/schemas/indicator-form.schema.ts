import { z } from "zod";

export const indicatorFormSchema = z.object({
  areaId: z.string().uuid("Area is required"),
  code: z.string().trim().min(2, "Indicator code is required").max(40, "Indicator code is too long"),
  title: z.string().trim().min(3, "Indicator title is required").max(200, "Indicator title is too long"),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long")
    .transform((value) => (value.length > 0 ? value : null)),
  isActive: z.boolean().default(true),
});

export type IndicatorFormInput = z.infer<typeof indicatorFormSchema>;
