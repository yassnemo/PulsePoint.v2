import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed - use POST' });
    return;
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Test basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Test if we can import the GeminiService
    let geminiServiceAvailable = false;
    let geminiError = null;
    
    try {
      const { GeminiService } = await import('./services/gemini');
      geminiServiceAvailable = true;
      
      // Test if we can create an instance
      if (process.env.GEMINI_API_KEY) {
        const service = new GeminiService();
        // Don't actually call the API, just test instantiation
      }
    } catch (error: any) {
      geminiError = error.message;
    }

    // Test basic web scraping
    let scrapingWorks = false;
    let scrapingError = null;
    let scrapedTitle = null;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        scrapedTitle = titleMatch ? titleMatch[1].trim() : 'No title found';
        scrapingWorks = true;
      } else {
        scrapingError = `HTTP ${response.status}`;
      }
    } catch (error: any) {
      scrapingError = error.message;
    }

    res.status(200).json({
      status: 'Debug endpoint working',
      tests: {
        urlValidation: {
          passed: true,
          url: parsedUrl.href
        },
        geminiService: {
          available: geminiServiceAvailable,
          hasApiKey: !!process.env.GEMINI_API_KEY,
          error: geminiError
        },
        webScraping: {
          works: scrapingWorks,
          title: scrapedTitle,
          error: scrapingError
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version
      }
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
