import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  author: text("author"),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  keyPoints: text("key_points").array(),
  imageUrl: text("image_url"),
  originalWords: integer("original_words").notNull(),
  summaryWords: integer("summary_words").notNull(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

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
  }),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>;
