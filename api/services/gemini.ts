import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
    });
  }

  async summarizeArticle(
    title: string, 
    content: string, 
    maxContentLength: number = 30000
  ): Promise<SummarizationResult> {
    try {
      // Truncate content if too long to respect API limits
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

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      try {
        // Clean the response text to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        const parsedResult = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (!parsedResult.summary || !Array.isArray(parsedResult.keyPoints)) {
          throw new Error('Invalid response structure from Gemini API');
        }

        return {
          summary: parsedResult.summary.trim(),
          keyPoints: parsedResult.keyPoints
            .filter((point: any) => typeof point === 'string' && point.trim().length > 0)
            .slice(0, 5) // Limit to 5 key points max
        };

      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Raw response:', text);
        
        // Fallback: extract content manually if JSON parsing fails
        return this.fallbackParsing(text);
      }

    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Handle specific API errors
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      }
      
      if (error.message?.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      }
      
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private fallbackParsing(text: string): SummarizationResult {
    // Simple fallback parsing if JSON fails
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let summary = '';
    const keyPoints: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for summary-like content (longer lines)
      if (trimmedLine.length > 50 && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('•')) {
        if (!summary) {
          summary = trimmedLine;
        }
      }
      
      // Look for bullet points
      if ((trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) && keyPoints.length < 5) {
        const point = trimmedLine.replace(/^[-•]\s*/, '').trim();
        if (point.length > 10) {
          keyPoints.push(point);
        }
      }
    }
    
    return {
      summary: summary || 'Unable to generate summary',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Key points could not be extracted']
    };
  }

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Say "Hello, I am working!" in exactly those words.');
      const response = await result.response;
      const text = response.text();
      return text.includes('Hello, I am working!');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}
