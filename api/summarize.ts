import { type VercelRequest, type VercelResponse } from '@vercel/node';
import he from 'he';

// Simplified serverless-optimized summarize function
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
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      res.status(400).json({ message: 'Invalid URL format' });
      return;
    }

    console.log('Processing article:', url);
    
    // Scrape the article
    const scrapedData = await scrapeArticle(url);
    console.log('Scraped content length:', scrapedData.content.length);
    
    // Try Gemini first, fallback to basic if it fails
    let summaryResult;
    let usedAI = false;
    
    // Only try Gemini if we have an API key
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Attempting Gemini summarization...');
        summaryResult = await createGeminiSummary(scrapedData.title, scrapedData.content);
        usedAI = true;
        console.log('AI summary created with Gemini');
      } catch (geminiError: any) {
        console.error('Gemini failed, using fallback:', geminiError.message);
        summaryResult = createBasicSummary(scrapedData.content);
      }
    } else {
      console.log('No Gemini API key found, using basic summarization');
      summaryResult = createBasicSummary(scrapedData.content);
    }

    const originalWords = scrapedData.content.split(/\s+/).length;
    const summaryWords = summaryResult.summary.split(/\s+/).length;
    const compressionRatio = Math.round(
      ((originalWords - summaryWords) / originalWords) * 100
    );

    const response = {
      article: {
        title: scrapedData.title,
        author: scrapedData.author,
        content: scrapedData.content,
        summary: summaryResult.summary,
        keyPoints: summaryResult.keyPoints,
        imageUrl: scrapedData.imageUrl,
        originalWords,
        summaryWords,
        compressionRatio,
        aiPowered: usedAI, // Let frontend know if AI was used
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Summarize API error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to process article',
      details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
}

// Serverless-optimized Gemini function
async function createGeminiSummary(title: string, content: string) {
  // Dynamic import to avoid issues in serverless cold starts
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No Gemini API key available');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
  });

  const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH || '30000');
  const truncatedContent = content.length > maxContentLength 
    ? content.substring(0, maxContentLength) + '...'
    : content;

  const prompt = `Please analyze the following news article and provide:

1. A comprehensive summary in 2-3 sentences that captures the main points
2. 3-5 key bullet points highlighting the most important details

Article Title: ${title}

Article Content: ${truncatedContent}

Please format your response as JSON with the following structure:
{
  "summary": "Your 2-3 sentence summary here",
  "keyPoints": [
    "First key point",
    "Second key point", 
    "Third key point"
  ]
}

Make sure the summary is informative yet concise, and the key points are distinct and important details from the article.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse the JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Gemini response');
  }

  const parsedResult = JSON.parse(jsonMatch[0]);
  
  if (!parsedResult.summary || !Array.isArray(parsedResult.keyPoints)) {
    throw new Error('Invalid response structure from Gemini API');
  }

  return {
    summary: parsedResult.summary.trim(),
    keyPoints: parsedResult.keyPoints
      .filter((point: any) => typeof point === 'string' && point.trim().length > 0)
      .slice(0, 5)
  };
}

// Simple web scraping function
async function scrapeArticle(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    let title = titleMatch ? titleMatch[1].trim() : 'Untitled Article';
    
    // Decode HTML entities in title
    title = he.decode(title);
    
    // Extract image
    const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    let imageUrl = imgMatch ? imgMatch[1] : undefined;
    
    // Make image URL absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).href;
    }
    
    // Extract content (simplified for serverless)
    let cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
      .replace(/<header[^>]*>.*?<\/header>/gi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '');

    let mainContent = cleanHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (mainContent.length < 100) {
      throw new Error('Insufficient content extracted from article');
    }

    // Decode HTML entities in content
    mainContent = he.decode(mainContent);

    return {
      title: title.slice(0, 200),
      content: mainContent.slice(0, 8000),
      author: undefined,
      imageUrl
    };
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Basic summarization fallback
function createBasicSummary(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 400);

  // Simple scoring based on position and length
  const scoredSentences = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: Math.max(0, 100 - index * 2) + (sentence.length > 50 ? 10 : 0)
  }));

  // Get top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, Math.ceil(sentences.length * 0.3)))
    .sort((a, b) => a.index - b.index);

  const summary = topSentences.map(s => s.sentence).join('. ') + '.';
  
  // Create key points
  const keyPoints = scoredSentences
    .filter(s => !topSentences.includes(s))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.sentence)
    .filter(s => s.length > 30);

  return {
    summary: summary.length > 50 ? summary : sentences.slice(0, 2).join('. ') + '.',
    keyPoints: keyPoints.slice(0, 4)
  };
}
