import { type VercelRequest, type VercelResponse } from '@vercel/node';

// Translation using MyMemory API (free translation service)
async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'en') {
    return text;
  }

  try {
    // MyMemory API is free and doesn't require API keys
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`,
      {
        headers: {
          'User-Agent': 'ArticleSummarizer/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    } else {
      throw new Error('Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to original text with language indicator
    const languageNames: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'tr': 'Turkish'
    };
    
    const languageName = languageNames[targetLanguage] || targetLanguage;
    return `[Translation service temporarily unavailable. Showing original English text]\n\n${text}`;
  }
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
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      res.status(400).json({ message: 'Text and target language are required' });
      return;
    }

    console.log('Translating to:', targetLanguage);
    
    const translatedText = await translateText(text, targetLanguage);

    res.status(200).json({ translatedText });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      message: error.message || 'Translation failed' 
    });
  }
}
