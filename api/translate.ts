import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { translateText } from '../server/services/openai';

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

    const translatedText = await translateText(text, targetLanguage);

    res.status(200).json({ translatedText });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      message: error.message || 'Translation failed' 
    });
  }
}
