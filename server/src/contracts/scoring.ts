import { z } from 'zod';

/**
 * Shared Zod schema for scoring breakdown.
 * Used by both MediaSearchService (server) and ScoreBreakdownPanel (app).
 */
export const scoringBreakdownSchema = z.object({
  customFormats: z.array(z.object({
    id: z.number(),
    name: z.string(),
    score: z.number(),
  })),
  customFormatScore: z.number(),
  confidenceScore: z.number(),
  indexerPriority: z.number(),
  indexerScore: z.number(),
  seeders: z.number(),
  seedScore: z.number(),
  totalScore: z.number(),
});

export type ScoringBreakdown = z.infer<typeof scoringBreakdownSchema>;
