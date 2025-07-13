import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Play, Square, Copy, Check, Volume2, Github, Linkedin, Twitter, ChevronDown } from "lucide-react";
import type { SummarizeRequest, SummarizeResponse } from "@shared/schema";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [url, setUrl] = useState("");
  const [articleData, setArticleData] = useState<SummarizeResponse["article"] | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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
    setIsDropdownOpen(false);
    if (articleData && language !== "en") {
      translateMutation.mutate({
        text: articleData.summary,
        targetLanguage: language,
      });
    } else if (articleData) {
      setTranslatedSummary(articleData.summary);
    }
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
    { code: "nl", name: "Dutch" },
    { code: "sv", name: "Swedish" },
    { code: "tr", name: "Turkish" },
  ];

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
            console.log('Speech event:', event);
            setIsSpeaking(false);
            
            // Only show error toast for actual errors, not user cancellations or interruptions
            if (event.error && !['canceled', 'interrupted'].includes(event.error)) {
              toast({
                title: "Speech Error",
                description: "Failed to play text-to-speech. Try again.",
                variant: "destructive",
              });
            }
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
        <div className="absolute top-5 sm:top-7 left-2 sm:left-3 flex items-start justify-start w-16 h-16 sm:w-20 sm:h-20">
          <div className="logo-container w-12 h-12 sm:w-16 sm:h-16">
            <div className="logo-wrapper">
              <img 
                src="/logo.svg" 
                alt="PulsePoint Logo" 
                className="logo-base"
              />
              <div className="logo-fill-overlay"></div>
            </div>
          </div>
        </div>

        {/* Theme Toggle - Top Right */}
        <div className="absolute top-6 sm:top-8 right-4 sm:right-6">
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
          <div className="space-y-3">
            {/* Social Links */}
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/yassnemo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/in/yassine-erradouani"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/erradouanii"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="X (Twitter)"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
            
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
          </div>
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{articleData.title}</h1>
          {articleData.author && (
            <p className="text-sm text-muted-foreground mb-2">
              By {articleData.author}
            </p>
          )}
          <p className="text-xs text-muted-foreground break-all">{url}</p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-4">
          {/* Custom Language Dropdown */}
          <div className="relative flex-[2] sm:flex-1 language-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-border bg-background text-foreground hover:border-primary dark:hover:border-[#00EEFF] transition-colors duration-200 text-xs sm:text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary dropdown-trigger"
            >
              <span>{languages.find(lang => lang.code === selectedLanguage)?.name}</span>
              <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin dropdown-panel">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`w-full px-2 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted dark:hover:bg-muted/80 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg dropdown-item ${
                      selectedLanguage === language.code ? 'bg-primary/10 text-primary selected-item' : 'text-foreground'
                    }`}
                  >
                    {language.name}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full"></span>
            Summary
          </h2>
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
            <div className="text-2xl font-bold text-accent dark:text-accent/70">{articleData.summaryWords.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Summary Words</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-500">{articleData.compressionRatio}%</div>
            <div className="text-sm text-muted-foreground">Compression</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border text-center">
          <div className="space-y-3">
            {/* Social Links */}
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/yassnemo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/in/yassine-erradouani"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/erradouanii"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-black dark:hover:text-[#00EEFF] transition-colors duration-200 transform hover:scale-110"
                aria-label="X (Twitter)"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
            
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
          </div>
        </footer>
      </div>
    </div>
  );
}