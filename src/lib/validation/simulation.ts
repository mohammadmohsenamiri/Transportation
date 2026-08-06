import { z } from "zod";

export const simulateQuerySchema = z.object({
  viewTime: z.string().datetime({ offset: true }).optional(),
});
export type SimulateQueryInput = z.infer<typeof simulateQuerySchema>;
