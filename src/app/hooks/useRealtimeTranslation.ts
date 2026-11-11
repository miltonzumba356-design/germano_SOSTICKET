import { useState, useEffect, useCallback, useRef } from 'react';

// Language codes mapping
const LANGUAGE_MAP: Record<string, string> = {
  pt: 'portuguese',
  en: 'english',
  zh: 'mandarin',
  fr: 'french',
  ar: 'Arbëresh (Albanian dialect)',
  th: 'thai',
  alb: 'albanian',
};

// Supported languages for the system
export const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português', native: 'Português' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: '中文 (Mandarim)', native: '中文 (普通话)' },
  { code: 'fr', name: 'Français', native: 'Français' },
  { code: 'ar', name: 'Arbëresh', native: 'Arbërisht' },
  { code: 'th', name: 'Tailandês', native: 'ไทย' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Translation direction
type TranslationDirection = 'pt-to-client' | 'client-to-pt';

// Translation result interface
interface TranslationResult {
  original: string;
  translated: string;
  fromLang: SupportedLanguage;
  toLang: SupportedLanguage;
  status: 'idle' | 'translating' | 'error' | 'fallback';
  error?: string;
  usedDeepseek?: boolean;
}

// Language state management
const DEFAULT_LANGUAGE: SupportedLanguage = { code: 'pt', name: 'Português', native: 'Português' };

// Deepseek configuration
interface DeepseekConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

// Deepseek translation fallback dictionary (common phrases)
const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Portuguese to English common phrases
  ptToEn: {
    'Olá': 'Hello',
    'Como vai?': 'How are you?',
    'Obrigado': 'Thank you',
    'Por favor': 'Please',
    'Desculpe': 'Sorry',
    'Sim': 'Yes',
    'Não': 'No',
    'Como posso ajudar?': 'How can I help?',
    'Qual é o seu problema?': 'What is your problem?',
    'Seu pedido foi recebido': 'Your request has been received',
    'O que está acontecendo?': 'What is happening?',
    'Por favor, aguarde': 'Please wait',
    'Obrigado pela ajuda': 'Thank you for the help',
    'Desculpe o inconveniente': 'Sorry for the inconvenience',
  },
  // English to Portuguese common phrases
  enToPt: {
    'Hello': 'Olá',
    'How are you?': 'Como vai?',
    'Thank you': 'Obrigado',
    'Please': 'Por favor',
    'Sorry': 'Desculpe',
    'Yes': 'Sim',
    'No': 'Não',
    'How can I help?': 'Como posso ajudar?',
    'What is your problem?': 'Qual é o seu problema?',
    'Your request has been received': 'Seu pedido foi recebido',
    'What is happening?': 'O que está acontecendo?',
    'Please wait': 'Por favor, aguarde',
    'Thank you for the help': 'Obrigado pela ajuda',
    'Sorry for the inconvenience': 'Desculpe o inconveniente',
  },
};

// Translation cache to avoid redundant calls
const translationCache: Map<string, TranslationResult> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if cached translation is valid
function isCacheValid(cacheEntry: TranslationResult): boolean {
  if (!cacheEntry.timestamp) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

// Add to cache
function addToCache(key: string, result: TranslationResult): void {
  translationCache.set(key, { ...result, timestamp: Date.now() });
}

// Get from cache
function getFromCache(key: string): TranslationResult | null {
  const cached = translationCache.get(key);
  if (cached && isCacheValid(cached)) {
    return cached;
  }
  translationCache.delete(key);
  return null;
}

// Translate using fallback dictionary
function fallbackTranslate(text: string, from: string, to: string): string {
  // Determine dictionary key
  const dictKey = `${from}-${to}` as keyof typeof FALLBACK_TRANSLATIONS;
  const dict = FALLBACK_TRANSLATIONS[dictKey];

  if (!dict) return text;

  // Try exact match first
  if (text in dict) {
    return dict[text];
  }

  // Try partial match (first sentence)
  const firstSentence = text.split('.')[0];
  if (firstSentence in dict) {
    return dict[firstSentence];
  }

  // Try word-by-word translation for common words
  const words = text.split(' ');
  const translatedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    if (lowerWord in dict) {
      // Preserve capitalization
      const translated = dict[lowerWord];
      if (word[0] >= 'A' && word[0] <= 'Z' && word[0] !== word.toLowerCase()[0]) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      }
      return translated;
    }
    return word;
  });

  return translatedWords.join(' ');
}

// Quick translate function (standalone, no hook state needed)
export const quickTranslate = (
  text: string,
  from: 'pt' | 'en',
  to: SupportedLanguage['code']
): string => {
  if (!text || text.trim() === '') return text;

  const targetLang = to || 'pt';
  const fromPt = from === 'pt';

  if (fromPt && targetLang === 'en') {
    return fallbackTranslate(text, 'pt', 'en');
  }

  if (!fromPt && targetLang === 'pt') {
    return fallbackTranslate(text, 'en', 'pt');
  }

  // If translating between same languages or unsupported, return original
  return text;
};

// Deepseek API client
class DeepseekClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: DeepseekConfig) {
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }

  async translate(text: string, from: string, to: string): Promise<{ translated: string; success: boolean }> {
    if (!text || text.trim() === '') {
      return { translated: text, success: true };
    }

    // If no API key configured, use fallback
    if (!this.apiKey) {
      return { translated: fallbackTranslate(text, from, to), success: false };
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: LANGUAGE_MAP[from]
                ? `Translate the following text from ${LANGUAGE_MAP[from]} to ${LANGUAGE_MAP[to] || to}. Provide only the translation, no explanations.`
                : `Detect the language of the following text and translate it to ${LANGUAGE_MAP[to] || to}. Provide only the translation, no explanations.`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3,
        }),
        timeout: 8000,
      });

      if (!response.ok) {
        // If API fails, fall back to dictionary
        const fallbackText = fallbackTranslate(text, from, to);
        return { translated: fallbackText, success: false };
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        return { translated: fallbackTranslate(text, from, to), success: false };
      }

      return { translated: translatedText, success: true };
    } catch (error) {
      // Network error or API issue - use fallback
      const fallbackText = fallbackTranslate(text, from, to);
      return { translated: fallbackText, success: false };
    }
  }
}

// Deepseek translation hook
export function useDeepseekTranslation(apiKey?: string, model?: string) {
  const [isConfigured, setIsConfigured] = useState(!!apiKey);
  const deepseek = useRef<DeepseekClient>(new DeepseekClient({ apiKey: apiKey, model }));

  const translate = useCallback(async (text: string, from: string, to: string) => {
    if (!text || text.trim() === '') {
      return { translated: '', success: true };
    }

    // Try Deepseek API
    const result = await deepseek.current.translate(text, from, to);

    if (result.success && isConfigured) {
      return { translated: result.translated, success: true, usedDeepseek: true };
    }

    // Fallback to dictionary
    const fallbackText = fallbackTranslate(text, from, to);
    return { translated: fallbackText, success: true, usedDeepseek: false };
  }, [isConfigured]);

  return {
    isConfigured,
    translate,
    quickTranslate: (text: string, from: 'pt' | 'en', to: SupportedLanguage['code']) =>
      quickTranslate(text, from, to),
    model: deepseek.current.model,
  };
}

// Main translation hook
const AUTO_TRANSLATE_KEY = 'sosticket_auto_translate';
const LANGUAGE_KEY = 'sosticket_language';

export function useRealtimeTranslation(deepseekApiKey?: string, deepseekModel?: string) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const guardado = localStorage.getItem(LANGUAGE_KEY);
      return SUPPORTED_LANGUAGES.find((l) => l.code === guardado) || DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  // Persiste o idioma escolhido pelo utilizador
  const setLanguage = useCallback((value: SupportedLanguage) => {
    setLanguageState(value);
    try {
      localStorage.setItem(LANGUAGE_KEY, value.code);
    } catch {
      // localStorage indisponível — mantém apenas em memória
    }
  }, []);

  const [autoTranslate, setAutoTranslateState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_TRANSLATE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [translationResult, setTranslationResult] = useState<TranslationResult>({
    original: '',
    translated: '',
    fromLang: DEFAULT_LANGUAGE,
    toLang: DEFAULT_LANGUAGE,
    status: 'idle',
  });

  // Persiste a escolha de tradução automática do utilizador
  const setAutoTranslate = useCallback((value: boolean) => {
    setAutoTranslateState(value);
    try {
      localStorage.setItem(AUTO_TRANSLATE_KEY, value ? '1' : '0');
    } catch {
      // localStorage indisponível — mantém apenas em memória
    }
  }, []);

  // Deepseek translation hook
  const { isConfigured: deepseekConfigured, translate: deepseekTranslate } = useDeepseekTranslation(
    deepseekApiKey,
    deepseekModel
  );

  // Translate text
  const translate = useCallback(async (text: string, direction: TranslationDirection = 'pt-to-client') => {
    if (!text || text.trim() === '') {
      setTranslationResult({
        original: '',
        translated: '',
        fromLang: DEFAULT_LANGUAGE,
        toLang: DEFAULT_LANGUAGE,
        status: 'idle',
      });
      return;
    }

    // Determine languages based on direction and current language
    let fromLang: string;
    let toLang: string;

    if (direction === 'pt-to-client') {
      fromLang = 'pt';
      toLang = language.code;
    } else {
      fromLang = language.code === 'pt' ? 'en' : language.code;
      toLang = 'pt';
    }

    // Check cache first
    const cacheKey = `${text}-${direction}-${language.code}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      setTranslationResult(cached);
      return;
    }

    setTranslationResult({
      original: text,
      translated: '',
      fromLang: language,
      toLang: DEFAULT_LANGUAGE,
      status: 'translating',
    });

    // Perform translation using Deepseek if configured, otherwise fallback
    let translatedText: string;
    let usedDeepseek = false;

    try {
      const result = await deepseekTranslate(text, fromLang, toLang);

      if (result.success && deepseekConfigured) {
        translatedText = result.translated;
        usedDeepseek = true;
      } else {
        // Use fallback
        translatedText = fallbackTranslate(text, fromLang, toLang);
      }
    } catch (error) {
      // API error - use fallback
      translatedText = fallbackTranslate(text, fromLang, toLang);
    }

    // Update result
    const result: TranslationResult = {
      original: text,
      translated: translatedText,
      fromLang: language,
      toLang: DEFAULT_LANGUAGE,
      status: 'translated',
      usedDeepseek: usedDeepseek,
    };

    addToCache(cacheKey, result);
    setTranslationResult(result);
  }, [language, deepseekConfigured, deepseekTranslate]);

  // Tradução directa de um texto para o idioma seleccionado (usada pelo chat).
  // Devolve sempre uma string e reutiliza a cache para não repetir chamadas à API.
  const translateText = useCallback(async (
    text: string,
    fromCode: string = 'pt',
    toCode: string = language.code
  ): Promise<string> => {
    if (!text || !text.trim()) return text;

    // Se origem e destino coincidem, deixa o Deepseek detectar o idioma de origem.
    const origem = fromCode === toCode ? 'auto' : fromCode;

    const cacheKey = `${text}-auto-${origem}-${toCode}`;
    const cached = getFromCache(cacheKey);
    if (cached?.translated) return cached.translated;

    let translated = text;
    let usedDeepseek = false;

    try {
      const result = await deepseekTranslate(text, origem, toCode);
      if (result.success && deepseekConfigured) {
        translated = result.translated;
        usedDeepseek = true;
      } else {
        translated = fallbackTranslate(text, origem, toCode);
      }
    } catch {
      translated = fallbackTranslate(text, origem, toCode);
    }

    addToCache(cacheKey, {
      original: text,
      translated,
      fromLang: language,
      toLang: DEFAULT_LANGUAGE,
      status: 'translated',
      usedDeepseek,
    });

    return translated;
  }, [language, deepseekConfigured, deepseekTranslate]);

  // Auto-translate when language changes (manual trigger needed)
  useEffect(() => {
    // No auto-translate on init - user must trigger via translate() call
  }, [language]);

  // Helper to get direction based on languages
  const getDirection = useCallback((): TranslationDirection => {
    if (language.code === 'pt') return 'pt-to-client';
    if (language.code === 'en') return 'en-to-pt';
    return 'pt-to-client'; // default
  }, [language]);

  return {
    language,
    setLanguage,
    translationResult,
    translate,
    translateText,
    autoTranslate,
    setAutoTranslate,
    getDirection,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isTranslating: translationResult.status === 'translating',
    isError: translationResult.status === 'error',
    isFallback: translationResult.status === 'fallback',
    deepseekConfigured,
  };
}

// Export language utilities
export const getLanguageName = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
};

export const getLanguageNativeName = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.native : code;
};

// Deepseek configuration helper
export const createDeepseekConfig = (apiKey: string, model?: string): DeepseekConfig => ({
  apiKey,
  model: model || 'deepseek-chat',
});