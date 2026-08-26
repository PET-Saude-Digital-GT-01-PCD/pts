import { z } from "zod";

export const muralInputSchema = z.object({
  texto: z.string().trim().min(1).max(4000),
});
