import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeArticle } from "./services/scraper";
import { summarizeArticle, translateText } from "./services/openai";
import { summarizeRequestSchema, type SummarizeResponse } from "@shared/schema";
import * as he from 'he';

// Final cleanup function for HTML entities - last resort
function finalCleanup(text: string): string {
  let cleaned = he.decode(text);
  
  // Additional aggressive cleanup
  cleaned = cleaned
    .replace(/"/g, '"')  // Replace smart quotes
    .replace(/"/g, '"')  // Replace smart quotes
    .replace(/'/g, "'")  // Replace smart apostrophes
    .replace(/'/g, "'")  // Replace smart apostrophes
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
    
  return cleaned;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Summarize article endpoint
  app.post("/api/summarize", async (req, res) => {
    try {
      const validatedData = summarizeRequestSchema.parse(req.body);
      const { url } = validatedData;

      // Check if article already exists in storage
      let existingArticle = await storage.getArticleByUrl(url);
      
      if (existingArticle) {
        const compressionRatio = Math.round(
          ((existingArticle.originalWords - existingArticle.summaryWords) / existingArticle.originalWords) * 100
        );

        const response: SummarizeResponse = {
          article: {
            title: existingArticle.title,
            author: existingArticle.author || undefined,
            content: existingArticle.content,
            summary: existingArticle.summary,
            keyPoints: existingArticle.keyPoints || [],
            imageUrl: existingArticle.imageUrl || undefined,
            originalWords: existingArticle.originalWords,
            summaryWords: existingArticle.summaryWords,
            compressionRatio
          }
        };

        return res.json(response);
      }

      // Scrape the article
      const scrapedArticle = await scrapeArticle(url);
      
      // Generate summary
      const summaryResult = await summarizeArticle(scrapedArticle.content);
      
      // Calculate word counts
      const originalWords = scrapedArticle.content.split(/\s+/).length;
      const summaryWords = summaryResult.summary.split(/\s+/).length;
      const compressionRatio = Math.round(((originalWords - summaryWords) / originalWords) * 100);

      // Store in memory
      const article = await storage.createArticle({
        url,
        title: scrapedArticle.title,
        author: scrapedArticle.author,
        content: scrapedArticle.content,
        summary: summaryResult.summary,
        keyPoints: summaryResult.keyPoints,
        imageUrl: scrapedArticle.imageUrl,
        originalWords,
        summaryWords
      });

      const response: SummarizeResponse = {
        article: {
          title: finalCleanup(article.title),
          author: article.author || undefined,
          content: article.content,
          summary: finalCleanup(article.summary),
          keyPoints: (article.keyPoints || []).map(point => finalCleanup(point)),
          imageUrl: article.imageUrl || undefined,
          originalWords: article.originalWords,
          summaryWords: article.summaryWords,
          compressionRatio
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error("Summarization error:", error);
      
      if (error?.message?.includes('validation')) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      if (error?.message?.includes('fetch') || error?.message?.includes('scrape')) {
        return res.status(400).json({ message: "Unable to access the article. Please check the URL and try again." });
      }

      if (error?.message?.includes('extract')) {
        return res.status(400).json({ message: "Could not extract content from this page. The article might be behind a paywall or require JavaScript." });
      }

      res.status(500).json({ message: "Failed to process the article. Please try again." });
    }
  });

  // Translate summary endpoint
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "Text and target language are required" });
      }

      const translatedText = await translateText(text, targetLanguage);
      res.json({ translatedText });

    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Failed to translate text" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
