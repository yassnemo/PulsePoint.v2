import { type VercelRequest, type VercelResponse } from '@vercel/node';

// Simple translation function using basic language mapping
function translateText(text: string, targetLanguage: string): string {
  // For now, return the original text with a note
  // In a real implementation, you would use a translation API
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

  if (targetLanguage === 'en') {
    return text;
  }

  const languageName = languageNames[targetLanguage] || 'the target language';
  return `[Translation to ${languageName} would appear here. For now, showing original text]\n\n${text}`;
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
    
    const translatedText = translateText(text, targetLanguage);

    res.status(200).json({ translatedText });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      message: error.message || 'Translation failed' 
    });
  }
}
