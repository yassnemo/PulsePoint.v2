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
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
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

      const utterance = new SpeechSynthesisUtterance(translatedSummary);
      utterance.lang = selectedLanguage === 'en' ? 'en-US' : selectedLanguage;
      utterance.rate = 0.8;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Change Theme</span>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isDarkMode 
                  ? 'bg-muted-foreground focus:ring-offset-background' 
                  : 'bg-primary focus:ring-offset-background'
              }`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-2xl text-center space-y-8">
          <div>
            <p className="text-sm text-muted-foreground mb-4">AI Powered</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-8">News Article Summarizer</h1>
          </div>
          
          {/* URL Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="url"
              placeholder="Enter an news article URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSummarize()}
              className="flex-1 h-12 px-4 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={summarizeMutation.isPending}
            />
            <Button
              onClick={handleSummarize}
              disabled={summarizeMutation.isPending}
              className="h-12 px-6 bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200"
            >
              {summarizeMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
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
        <footer className="absolute bottom-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025, Designed and Developed by{" "}
            <a 
              href="https://yerradouani.me/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Yassine Erradouani
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
      <div className="flex items-center justify-between p-6 border-b border-border">
        <button
          onClick={() => setArticleData(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Search
        </button>
        
        {/* Theme Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Change Theme</span>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isDarkMode 
                ? 'bg-muted-foreground focus:ring-offset-background' 
                : 'bg-primary focus:ring-offset-background'
            }`}
          >
            <span 
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                isDarkMode ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Article Info */}
        {articleData.imageUrl && (
          <div className="w-full">
            <img
              src={articleData.imageUrl}
              alt="Article featured image"
              className="w-full h-64 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl font-bold mb-2">{articleData.title}</h1>
          {articleData.author && (
            <p className="text-sm text-muted-foreground mb-2">
              By {articleData.author}
            </p>
          )}
          <p className="text-xs text-muted-foreground break-all">{url}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            {isSpeaking ? (
              <>
                <Square className="h-4 w-4" />
                <span className="text-sm">Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Listen</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
              isCopied
                ? 'bg-accent hover:bg-accent/90'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copy</span>
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
        <div className="grid grid-cols-3 gap-4 text-center">
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