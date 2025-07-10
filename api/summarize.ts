import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { scrapeArticle } from '../server/services/scraper';
import { summarizeArticle } from '../server/services/openai';
import { summarizeRequestSchema, type SummarizeResponse } from '../shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const validatedData = summarizeRequestSchema.parse(req.body);
    const { url } = validatedData;

    // Scrape the article
    const scrapedData = await scrapeArticle(url);
    
    if (!scrapedData) {
      res.status(400).json({ message: 'Failed to scrape article content' });
      return;
    }

    // Summarize the article
    const summaryResult = await summarizeArticle(scrapedData.content);

    const originalWords = scrapedData.content.split(/\s+/).length;
    const summaryWords = summaryResult.summary.split(/\s+/).length;
    const compressionRatio = Math.round(
      ((originalWords - summaryWords) / originalWords) * 100
    );

    const response: SummarizeResponse = {
      article: {
        title: scrapedData.title,
        author: scrapedData.author || undefined,
        content: scrapedData.content,
        summary: summaryResult.summary,
        keyPoints: summaryResult.keyPoints || [],
        imageUrl: scrapedData.imageUrl || undefined,
        originalWords,
        summaryWords,
        compressionRatio,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Summarize error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error' 
    });
  }
}
