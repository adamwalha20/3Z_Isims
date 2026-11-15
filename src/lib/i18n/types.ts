/**
 * ZEC Campus Hub — Internationalization Types & Constants
 * Supported: English (en), French (fr), Tunisian Arabic (ar-TN)
 */

export type Locale = 'en' | 'fr' | 'ar-TN';
export type Direction = 'ltr' | 'rtl';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  dir: Direction;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
  },
  'ar-TN': {
    code: 'ar-TN',
    name: 'Tunisian Arabic',
    nativeName: 'العربية التونسية',
    flag: '🇹🇳',
    dir: 'rtl',
  },
};

export const DEFAULT_LOCALE: Locale = 'en';

export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};
