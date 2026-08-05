import { z } from 'zod';

export const webVitalsBodySchema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string(),
  navigationType: z.string(),
  path: z.string(),
});
