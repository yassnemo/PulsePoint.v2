// Using Hugging Face's free inference API
const HF_API_URL = "https://api-inference.huggingface.co/models";

async function queryHuggingFace(model: string, inputs: any, options: any = {}) {
  const response = await fetch(`${HF_API_URL}/${model}`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      inputs,
      options: {
        wait_for_model: true,
        ...options
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.status}`);
  }

  return response.json();
}

function createExtractiveSummary(text: string): { summary: string; keyPoints: string[] } {
  // Clean and split into sentences with better parsing
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 300)
    .filter(s => /[a-zA-Z]/.test(s)) // Must contain letters
    .map(s => s.charAt(0).toUpperCase() + s.slice(1)); // Capitalize first letter

  if (sentences.length === 0) {
    return { summary: "Unable to generate summary from the provided content.", keyPoints: [] };
  }

  // Enhanced scoring system for better content selection
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    const lowerSentence = sentence.toLowerCase();
    const words = lowerSentence.split(/\s+/);
    
    // Position scoring - opening and closing sentences are often important
    if (index === 0) score += 4; // First sentence often contains main topic
    if (index === 1) score += 2; // Second sentence often has context
    if (index >= sentences.length - 2) score += 2; // Conclusion sentences
    
    // Content quality scoring
    const importantWords = [
      'announced', 'revealed', 'confirmed', 'reported', 'found', 'discovered', 
      'launched', 'released', 'according', 'study', 'research', 'shows', 'indicates',
      'important', 'significant', 'major', 'key', 'critical', 'essential', 'main', 
      'primary', 'breakthrough', 'new', 'first', 'latest', 'recent', 'expert',
      'government', 'company', 'organization', 'official', 'president', 'ceo',
      'will', 'plans', 'expects', 'aims', 'goal', 'target', 'increase', 'decrease',
      'growth', 'decline', 'change', 'impact', 'effect', 'result', 'outcome'
    ];
    
    // Count important keywords
    const keywordCount = importantWords.filter(keyword => 
      lowerSentence.includes(keyword)
    ).length;
    score += keywordCount * 1.5;
    
    // Numbers and statistics boost (data-driven content)
    const numberPatterns = [
      /\d+%/g, /\$\d+/g, /\d+ million/g, /\d+ billion/g, /\d+ thousand/g,
      /\d+ years?/g, /\d+ months?/g, /\d+ days?/g, /\d+ hours?/g,
      /\d+ people/g, /\d+ users/g, /\d+ customers/g, /\d+ companies/g
    ];
    
    const numberMatches = numberPatterns.reduce((count, pattern) => {
      return count + (sentence.match(pattern) || []).length;
    }, 0);
    score += numberMatches * 2;
    
    // Sentence quality scoring
    const wordCount = words.length;
    if (wordCount >= 8 && wordCount <= 25) score += 2; // Optimal length
    if (wordCount >= 6 && wordCount <= 30) score += 1; // Good length
    
    // Penalize very short or very long sentences
    if (wordCount < 6) score -= 1;
    if (wordCount > 35) score -= 1;
    
    // Content density (ratio of meaningful words)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'do', 'does', 'did', 'get', 'got', 'make', 'made', 'take', 'took', 'come', 'came', 'go', 'went', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'say', 'said', 'tell', 'told', 'give', 'gave', 'find', 'found', 'use', 'used', 'work', 'worked', 'call', 'called', 'try', 'tried', 'ask', 'asked', 'need', 'needed', 'feel', 'felt', 'become', 'became', 'leave', 'left', 'put', 'seem', 'seemed', 'look', 'looked', 'turn', 'turned', 'start', 'started', 'show', 'showed', 'play', 'played', 'run', 'ran', 'move', 'moved', 'live', 'lived', 'believe', 'believed', 'bring', 'brought', 'happen', 'happened', 'write', 'wrote', 'provide', 'provided', 'sit', 'sat', 'stand', 'stood', 'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'included', 'continue', 'continued', 'set', 'let', 'follow', 'followed', 'stop', 'stopped', 'create', 'created', 'speak', 'spoke', 'read', 'allow', 'allowed', 'add', 'added', 'spend', 'spent', 'grow', 'grew', 'open', 'opened', 'walk', 'walked', 'win', 'won', 'offer', 'offered', 'remember', 'remembered', 'love', 'loved', 'consider', 'considered', 'appear', 'appeared', 'buy', 'bought', 'wait', 'waited', 'serve', 'served', 'die', 'died', 'send', 'sent', 'expect', 'expected', 'build', 'built', 'stay', 'stayed', 'fall', 'fell', 'cut', 'reach', 'reached', 'kill', 'killed', 'remain', 'remained'];
    
    const contentWords = words.filter(word => !stopWords.includes(word));
    const contentRatio = contentWords.length / words.length;
    score += contentRatio * 2;
    
    // Boost sentences with proper nouns (names, places, organizations)
    const properNounCount = (sentence.match(/[A-Z][a-z]+/g) || []).length;
    score += properNounCount * 0.5;
    
    return { sentence, score, index };
  });

  // Sort by score and select the best sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, Math.max(2, Math.ceil(sentences.length * 0.3))))
    .sort((a, b) => a.index - b.index); // Maintain original order

  // Create a coherent summary with proper flow
  let summary = '';
  topSentences.forEach((sentenceObj, index) => {
    let sentence = sentenceObj.sentence;
    
    // Ensure proper punctuation
    if (!sentence.match(/[.!?]$/)) {
      sentence += '.';
    }
    
    // Add transitional phrases for better flow (but not too many)
    if (index > 0 && index < topSentences.length - 1 && Math.random() > 0.6) {
      const transitions = ['Additionally', 'Furthermore', 'Moreover', 'Meanwhile', 'However'];
      const transition = transitions[Math.floor(Math.random() * transitions.length)];
      sentence = transition + ', ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }
    
    if (index === 0) {
      summary += sentence + ' ';
    } else {
      summary += sentence + ' ';
    }
  });

  // Extract key points (most important individual insights)
  const keyPoints = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, Math.ceil(sentences.length * 0.2)))
    .map(s => {
      let point = s.sentence.trim();
      // Ensure proper punctuation
      if (!point.match(/[.!?]$/)) {
        point += '.';
      }
      // Keep key points concise
      if (point.length > 120) {
        point = point.substring(0, 120) + '...';
      }
      return point;
    })
    .filter(point => point.length > 20) // Remove too short points
    .slice(0, 5); // Limit to 5 key points

  return { 
    summary: summary.trim(), 
    keyPoints 
  };
}

export async function summarizeArticle(text: string): Promise<{ summary: string; keyPoints: string[] }> {
  try {
    // Try Hugging Face first (but expect it to fail without auth)
    const maxLength = 1000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    
    const result = await queryHuggingFace(
      "facebook/bart-large-cnn",
      truncatedText,
      {
        max_length: 200,
        min_length: 50
      }
    );

    const hfSummary = result[0]?.summary_text;
    if (hfSummary) {
      // Extract key points from original text even if HF works
      const { keyPoints } = createExtractiveSummary(text);
      return { summary: hfSummary, keyPoints };
    }
  } catch (error) {
    console.error("Hugging Face summarization error:", error);
  }
  
  // Fallback to enhanced extractive summary
  return createExtractiveSummary(text);
}

// Simple translation fallback using basic word replacements for common terms
function basicTranslate(text: string, targetLanguage: string): string {
  if (targetLanguage === 'en') return text;
  
  const translations: { [key: string]: { [key: string]: string } } = {
    'es': {
      'and': 'y', 'the': 'el/la', 'of': 'de', 'to': 'a', 'in': 'en',
      'is': 'es', 'was': 'fue', 'that': 'que', 'for': 'para', 'with': 'con'
    },
    'fr': {
      'and': 'et', 'the': 'le/la', 'of': 'de', 'to': 'à', 'in': 'dans',
      'is': 'est', 'was': 'était', 'that': 'que', 'for': 'pour', 'with': 'avec'
    },
    'de': {
      'and': 'und', 'the': 'der/die/das', 'of': 'von', 'to': 'zu', 'in': 'in',
      'is': 'ist', 'was': 'war', 'that': 'dass', 'for': 'für', 'with': 'mit'
    },
    'it': {
      'and': 'e', 'the': 'il/la', 'of': 'di', 'to': 'a', 'in': 'in',
      'is': 'è', 'was': 'era', 'that': 'che', 'for': 'per', 'with': 'con'
    },
    'pt': {
      'and': 'e', 'the': 'o/a', 'of': 'de', 'to': 'para', 'in': 'em',
      'is': 'é', 'was': 'foi', 'that': 'que', 'for': 'para', 'with': 'com'
    },
    'ru': {
      'and': 'и', 'the': '', 'of': 'из', 'to': 'к', 'in': 'в',
      'is': 'есть', 'was': 'был', 'that': 'что', 'for': 'для', 'with': 'с'
    }
  };

  // For unsupported languages, just return original text
  return text;
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'it', 'pt', 'ru', 'ar', 'hi', 'ko', 'nl', 'sv', 'tr'];
    
    if (!supportedLanguages.includes(targetLanguage) || targetLanguage === 'en') {
      return text;
    }

    // Try Hugging Face first
    const modelName = `Helsinki-NLP/opus-mt-en-${targetLanguage}`;
    const result = await queryHuggingFace(modelName, text);
    
    return result[0]?.translation_text || text;
  } catch (error) {
    console.error("Translation error:", error);
    
    // Fallback to basic translation for common languages
    return basicTranslate(text, targetLanguage);
  }
}
