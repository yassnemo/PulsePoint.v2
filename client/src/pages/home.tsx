import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Play, Square, Copy, Check, Volume2 } from "lucide-react";
import type { SummarizeRequest, SummarizeResponse } from "@shared/schema";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [url, setUrl] = useState("");
  const [articleData, setArticleData] = useState<SummarizeResponse["article"] | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add("dark");
      body.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      body.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: async (data: SummarizeRequest) => {
      const response = await apiRequest("POST", "/api/summarize", data);
      return response.json() as Promise<SummarizeResponse>;
    },
    onSuccess: (data) => {
      setArticleData(data.article);
      setTranslatedSummary(data.article.summary);
      setSelectedLanguage("en");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process the article",
        variant: "destructive",
      });
    },
  });

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async (data: { text: string; targetLanguage: string }) => {
      const response = await apiRequest("POST", "/api/translate", data);
      return response.json() as Promise<{ translatedText: string }>;
    },
    onSuccess: (data) => {
      setTranslatedSummary(data.translatedText);
    },
    onError: () => {
      toast({
        title: "Translation Error",
        description: "Failed to translate the summary",
        variant: "destructive",
      });
    },
  });

  const handleSummarize = () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid article URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Error",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    summarizeMutation.mutate({ url });
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (articleData && language !== "en") {
      translateMutation.mutate({
        text: articleData.summary,
        targetLanguage: language,
      });
    } else if (articleData) {
      setTranslatedSummary(articleData.summary);
    }
  };

  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      try {
        // Wait for voices to be loaded
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          
          const utterance = new SpeechSynthesisUtterance(translatedSummary);
          
          // Set language code
          const langCode = selectedLanguage === 'en' ? 'en-US' : selectedLanguage;
          utterance.lang = langCode;
          
          // Try to find a voice for the selected language
          const voice = voices.find(v => v.lang.startsWith(langCode)) || 
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices[0];
          
          if (voice) {
            utterance.voice = voice;
          }
          
          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 1;

          utterance.onstart = () => {
            console.log('Speech started');
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            console.log('Speech ended');
            setIsSpeaking(false);
          };
          
          utterance.onerror = (event) => {
            console.error('Speech error:', event);
            setIsSpeaking(false);
            toast({
              title: "Speech Error",
              description: "Failed to play text-to-speech. Try again.",
              variant: "destructive",
            });
          };

          // Cancel any existing speech and speak
          window.speechSynthesis.cancel();
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 100);
        };

        // Check if voices are already loaded
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          loadVoices();
        } else {
          // Wait for voices to load
          window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
          // Fallback timeout
          setTimeout(loadVoices, 1000);
        }
        
      } catch (error) {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Text-to-speech failed to initialize",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedSummary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Summary copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!articleData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 pb-16 sm:pb-20">
        {/* PulsePoint Logo - Top Left */}
        <div className="absolute top-0 left-4 sm:left-6 flex items-start justify-start w-24 h-24 sm:w-28 sm:h-28">
          <img 
            src="/logo.svg" 
            alt="PulsePoint Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24"
          />
        </div>

        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6">
          <button
            className="theme-toggle"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            <svg aria-hidden className="theme-toggle-svg" width="38" height="38" viewBox="0 0 38 38">
              <defs>
                <mask id="theme-toggle-mask">
                  <circle className="theme-toggle-circle" data-mask="true" cx="19" cy="19" r="13" />
                  <circle className="theme-toggle-mask" cx="25" cy="14" r="9" />
                </mask>
              </defs>
              <path
                className="theme-toggle-path"
                d="M19 3v7M19 35v-7M32.856 11l-6.062 3.5M5.144 27l6.062-3.5M5.144 11l6.062 3.5M32.856 27l-6.062-3.5"
              />
              <circle
                className="theme-toggle-circle"
                mask="url(#theme-toggle-mask)"
                cx="19"
                cy="19"
                r="12"
              />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-2xl text-center space-y-8">
          <div>
            <p className="text-sm text-muted-foreground mb-4">AI Powered</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8">News Article Summarizer</h1>
          </div>
          
          {/* URL Input */}
          <div className="flex gap-2 sm:gap-3">
            <Input
              type="url"
              placeholder="Enter a news article URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSummarize()}
              className="flex-1 h-12 px-3 sm:px-4 text-sm sm:text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={summarizeMutation.isPending}
            />
            <Button
              onClick={handleSummarize}
              disabled={summarizeMutation.isPending}
              className="h-12 px-4 sm:px-6 bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200 flex-shrink-0"
            >
              {summarizeMutation.isPending ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>

          {/* Loading State */}
          {summarizeMutation.isPending && (
            <div className="mt-8">
              <div className="inline-flex items-center gap-3 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing article...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 sm:bottom-6 text-center">
          <p className="text-sm text-muted-foreground">
            Developed by{" "}
            <a 
              href="https://yerradouani.me/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors duration-200 relative inline-block group"
              style={{ textDecoration: 'none' }}
            >
              Yassine Erradouani
              <span 
                className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"
              ></span>
            </a>
          </p>
        </footer>
      </div>
    );
  }

  // Results view
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setArticleData(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Search
          </button>
          
          {/* Compact PulsePoint Logo */}
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center justify-center w-14 h-14">
              <img 
                src="/logo.svg" 
                alt="PulsePoint Logo" 
                className="w-12 h-12"
              />
            </div>
          </div>
        </div>
        
        {/* Hamish Williams Theme Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">Change Theme</span>
          <button
            className="theme-toggle"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            <svg aria-hidden className="theme-toggle-svg" width="38" height="38" viewBox="0 0 38 38">
              <defs>
                <mask id="theme-toggle-mask-2">
                  <circle className="theme-toggle-circle" data-mask="true" cx="19" cy="19" r="13" />
                  <circle className="theme-toggle-mask" cx="25" cy="14" r="9" />
                </mask>
              </defs>
              <path
                className="theme-toggle-path"
                d="M19 3v7M19 35v-7M32.856 11l-6.062 3.5M5.144 27l6.062-3.5M5.144 11l6.062 3.5M32.856 27l-6.062-3.5"
              />
              <circle
                className="theme-toggle-circle"
                mask="url(#theme-toggle-mask-2)"
                cx="19"
                cy="19"
                r="12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Article Info */}
        {articleData.imageUrl && (
          <div className="w-full">
            <img
              src={articleData.imageUrl}
              alt="Article featured image"
              className="w-full h-64 sm:h-[28rem] object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">{articleData.title}</h1>
          {articleData.author && (
            <p className="text-sm text-muted-foreground mb-2">
              By {articleData.author}
            </p>
          )}
          <p className="text-xs text-muted-foreground break-all">{url}</p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-4">
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="flex-[2] sm:flex-1 px-2 sm:px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="nl">Dutch</option>
            <option value="sv">Swedish</option>
            <option value="tr">Turkish</option>
          </select>

          <Button
            onClick={handleTextToSpeech}
            className="flex-none px-2 sm:px-3 py-2 bg-accent hover:bg-accent/90 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
          >
            {isSpeaking ? (
              <>
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs hidden sm:inline">Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs hidden sm:inline">Listen</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleCopy}
            className={`flex-none px-2 sm:px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 ${
              isCopied
                ? 'bg-accent hover:bg-accent/90'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs hidden sm:inline">Copy</span>
              </>
            )}
          </Button>
        </div>

        {/* Key Points */}
        {articleData.keyPoints && articleData.keyPoints.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-6 border border-primary/20">
            <h2 className="text-lg font-semibold mb-4 text-primary">Key Points</h2>
            <div className="space-y-3">
              {articleData.keyPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-semibold text-primary-foreground">{index + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          {translateMutation.isPending ? (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Translating...</span>
            </div>
          ) : (
            <p className="leading-relaxed">{translatedSummary}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{articleData.originalWords.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Original Words</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-accent">{articleData.summaryWords.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Summary Words</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-500">{articleData.compressionRatio}%</div>
            <div className="text-sm text-muted-foreground">Compression</div>
          </div>
        </div>
      </div>
    </div>
  );
}