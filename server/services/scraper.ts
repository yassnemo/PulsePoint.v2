import * as cheerio from 'cheerio';
import * as he from 'he';

export interface ScrapedArticle {
  title: string;
  author?: string;
  content: string;
  imageUrl?: string;
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
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
    const $ = cheerio.load(html);

    // Extract title
    let title = $('h1').first().text().trim() ||
                $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                'Untitled Article';

    // Extract author
    let author = $('meta[name="author"]').attr('content') ||
                 $('[rel="author"]').text().trim() ||
                 $('.author').text().trim() ||
                 $('meta[property="article:author"]').attr('content') ||
                 undefined;

    // Extract featured image
    let imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('img').first().attr('src') ||
                   undefined;

    // Make image URL absolute if it's relative
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).href;
    }

    // Extract main content
    let content = '';
    
    // Try various selectors for article content
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.story-body',
      '.post-body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // Get HTML content and then convert to text to properly handle entities
        const htmlContent = element.html();
        if (htmlContent) {
          // Create a new cheerio instance to parse the HTML content
          const $content = cheerio.load(htmlContent);
          content = $content.text().trim();
          if (content.length > 100) {
            break;
          }
        }
      }
    }

    // Fallback: get all paragraph text
    if (!content || content.length < 100) {
      const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
      content = paragraphs.filter(p => p.length > 50).join('\n\n');
    }

    if (!content || content.length < 100) {
      throw new Error('Could not extract sufficient content from the article');
    }

    // Clean up content - decode HTML entities first, then normalize whitespace
    console.log('Raw content before decode:', content.substring(0, 200));
    content = he.decode(content);
    console.log('Content after he.decode:', content.substring(0, 200));
    
    // Additional aggressive cleanup for BBC and other stubborn sites
    content = content
      .replace(/"/g, '"')  // Replace smart quotes
      .replace(/"/g, '"')  // Replace smart quotes
      .replace(/'/g, "'")  // Replace smart apostrophes
      .replace(/'/g, "'")  // Replace smart apostrophes  
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Content after cleanup:', content.substring(0, 200));
    
    // Clean up title and decode HTML entities
    title = he.decode(title)
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    return {
      title: title.slice(0, 200), // Limit title length
      author: author?.slice(0, 100), // Limit author length
      content,
      imageUrl
    };

  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
