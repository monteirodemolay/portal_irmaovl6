import { z } from 'zod';

export const personalTaskSchema = z.object({
  titulo: z.string().min(1).max(200),
});

export type PersonalTaskFormValues = z.infer<typeof personalTaskSchema>;
