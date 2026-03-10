import { z } from 'zod';

export const ReviewConfigSchema = z.object({
  categories: z
    .array(z.enum(['bug', 'security', 'logic', 'architecture']))
    .nonempty()
    .default(['bug', 'security', 'logic', 'architecture']),
  ignore: z.array(z.string()).default([]),
  maxChunkLines: z.number().int().positive().default(400),
  minSeverity: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const RevelioConfigSchema = z.object({
  review: ReviewConfigSchema.default({
    categories: ['bug', 'security', 'logic', 'architecture'],
    ignore: [],
    maxChunkLines: 400,
    minSeverity: 'medium',
  }),
});

export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;
export type RevelioConfig = z.infer<typeof RevelioConfigSchema>;

