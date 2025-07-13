import { z } from "zod";

// API request/response schemas
export const summarizeRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export const summarizeResponseSchema = z.object({
  article: z.object({
    title: z.string(),
    author: z.string().optional(),
    content: z.string(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    imageUrl: z.string().optional(),
    originalWords: z.number(),
    summaryWords: z.number(),
    compressionRatio: z.number(),
    aiPowered: z.boolean().optional(), // New field to indicate if AI was used
  }),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>;
