import { z } from 'zod';

export const loginBodySchema = z.object({ idToken: z.string().min(1) });
