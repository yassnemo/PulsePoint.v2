import { type VercelRequest, type VercelResponse } from '@vercel/node';

// Simple web scraping function for serverless environment
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
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Article';
    
    // Extract image
    const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    let imageUrl = imgMatch ? imgMatch[1] : undefined;
    
    // Make image URL absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).href;
    }
    
    // Extract text content with much better filtering
    // First, remove all scripts, styles, and other non-content elements
    let cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>.*?<\/noscript>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
      .replace(/<header[^>]*>.*?<\/header>/gi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gi, '')
      .replace(/<form[^>]*>.*?<\/form>/gi, '')
      .replace(/<!--.*?-->/gi, '');

    // Try to find main content areas first
    let mainContent = '';
    
    // Look for common article container selectors
    const articleSelectors = [
      /<article[^>]*>(.*?)<\/article>/gi,
      /<div[^>]*class="[^"]*story[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<main[^>]*>(.*?)<\/main>/gi
    ];

    for (const selector of articleSelectors) {
      const matches = cleanHtml.match(selector);
      if (matches && matches.length > 0) {
        const content = matches.join(' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (content.length > mainContent.length && content.length > 200) {
          mainContent = content;
        }
      }
    }

    // If no main content found, extract from paragraphs more carefully
    if (!mainContent || mainContent.length < 200) {
      const paragraphMatches = cleanHtml.match(/<p[^>]*>([^<]*(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*[^<]*)<\/p>/gi);
      if (paragraphMatches && paragraphMatches.length > 0) {
        const paragraphTexts = paragraphMatches
          .map(p => p.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(p => {
            // Filter out common non-content patterns
            const lowerP = p.toLowerCase();
            return p.length > 30 && 
                   !lowerP.includes('cookie') &&
                   !lowerP.includes('subscribe') &&
                   !lowerP.includes('newsletter') &&
                   !lowerP.includes('advertisement') &&
                   !lowerP.includes('javascript') &&
                   !lowerP.includes('css') &&
                   !lowerP.includes('@media') &&
                   !lowerP.includes('keyframes') &&
                   !lowerP.includes('window.') &&
                   !lowerP.includes('function(') &&
                   !/^\s*\d+%\s*{/.test(lowerP) && // CSS rules
                   !/^\s*@/.test(lowerP) && // CSS at-rules
                   !/enabled\s*=\s*\(\)/.test(lowerP); // JS functions
          });
        
        mainContent = paragraphTexts.join(' ');
      }
    }

    // Final fallback - extract all text but with better filtering
    if (!mainContent || mainContent.length < 100) {
      mainContent = cleanHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(word => {
          // Filter out obvious JavaScript/CSS keywords
          const lowerWord = word.toLowerCase();
          return !lowerWord.includes('function') &&
                 !lowerWord.includes('window') &&
                 !lowerWord.includes('document') &&
                 !lowerWord.includes('keyframes') &&
                 !lowerWord.includes('opacity') &&
                 !lowerWord.includes('webkit') &&
                 word.length > 2;
        })
        .join(' ')
        .trim();
    }

    if (mainContent.length < 100) {
      throw new Error('Insufficient content extracted from article');
    }

    return {
      title: title.slice(0, 200),
      content: mainContent.slice(0, 8000), // Limit content size for processing
      author: undefined,
      imageUrl
    };
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Enhanced summarization function
function createSummary(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => {
      // More aggressive filtering of non-content
      const lowerS = s.toLowerCase();
      return s.length > 25 && 
             s.length < 400 &&
             /[a-zA-Z]/.test(s) &&
             !lowerS.includes('function') &&
             !lowerS.includes('window.') &&
             !lowerS.includes('document.') &&
             !lowerS.includes('keyframes') &&
             !lowerS.includes('opacity') &&
             !lowerS.includes('webkit') &&
             !lowerS.includes('promise') &&
             !lowerS.includes('console') &&
             !lowerS.includes('enabled') &&
             !lowerS.includes('getadtag') &&
             !/^\s*\d+%/.test(lowerS) && // CSS percentages
             !/cmd:\s*\[\]/.test(lowerS) && // JS array syntax
             !/r\s*=>\s*r\(/.test(lowerS); // Arrow functions
    });

  if (sentences.length === 0) {
    return {
      summary: "Unable to extract meaningful content from the article.",
      keyPoints: []
    };
  }

  // Score sentences for importance
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    const lowerSentence = sentence.toLowerCase();
    
    // Position scoring
    if (index === 0) score += 3; // First sentence
    if (index < 3) score += 2; // Early sentences
    if (index >= sentences.length - 2) score += 1; // Conclusion
    
    // Content scoring
    const importantWords = [
      'announced', 'revealed', 'discovered', 'found', 'study', 'research',
      'important', 'significant', 'major', 'key', 'main', 'new', 'first',
      'trump', 'brazil', 'president', 'tariffs', 'political', 'government'
    ];
    
    importantWords.forEach(word => {
      if (lowerSentence.includes(word)) score += 1;
    });
    
    // Length bonus for substantial sentences
    if (sentence.length > 80 && sentence.length < 200) score += 1;
    
    return { sentence, score, index };
  });

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(4, Math.ceil(sentences.length * 0.3)))
    .sort((a, b) => a.index - b.index);

  const summary = topSentences.map(s => s.sentence).join('. ') + '.';
  
  // Create key points from remaining high-scoring sentences
  const keyPoints = scoredSentences
    .filter(s => !topSentences.includes(s))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.sentence)
    .filter(s => s.length > 30);

  return {
    summary: summary.length > 50 ? summary : sentences.slice(0, 2).join('. ') + '.',
    keyPoints: keyPoints.slice(0, 5)
  };
}

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
    
    // Create summary
    const summaryResult = createSummary(scrapedData.content);
    console.log('Summary created');

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
