'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Locale, Direction, LOCALES, DEFAULT_LOCALE } from './types';
import { en } from './translations/en';
import { fr } from './translations/fr';
import { arTN } from './translations/ar-TN';
import { createClient } from '@/lib/supabase/client';

const translations: Record<Locale, Record<string, any>> = {
  en,
  fr,
  'ar-TN': arTN,
};

interface LanguageContextType {
  locale: Locale;
  dir: Direction;
  isRtl: boolean;
  setLocale: (newLocale: Locale) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: string | Date) => string;
  formatNumber: (num: number) => string;
  getRelativeTime: (date: string | Date) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'zec_preferred_locale';
const COOKIE_NAME = 'zec_locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync DOM attributes (lang, dir, class)
  const applyDomAttributes = useCallback((loc: Locale) => {
    if (typeof document === 'undefined') return;
    const dir = LOCALES[loc]?.dir || 'ltr';
    document.documentElement.lang = loc;
    document.documentElement.dir = dir;

    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl-mode');
    } else {
      document.documentElement.classList.remove('rtl-mode');
    }
  }, []);

  // Initialize locale from cookie / localStorage / browser
  useEffect(() => {
    let initialLocale: Locale = DEFAULT_LOCALE;

    // 1. Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale;
      if (stored && LOCALES[stored]) {
        initialLocale = stored;
      }
    } catch {
      // Ignore storage access error
    }

    setLocaleState(initialLocale);
    applyDomAttributes(initialLocale);
    setIsInitialized(true);
  }, [applyDomAttributes]);

  // Sync with Supabase authenticated profile if available
  useEffect(() => {
    if (!isInitialized) return;

    async function syncFromProfile() {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_locale')
            .eq('id', user.id)
            .single();

          if (profile?.preferred_locale && LOCALES[profile.preferred_locale as Locale]) {
            const dbLocale = profile.preferred_locale as Locale;
            setLocaleState((prev) => {
              if (prev !== dbLocale) {
                applyDomAttributes(dbLocale);
                try {
                  localStorage.setItem(STORAGE_KEY, dbLocale);
                  document.cookie = `${COOKIE_NAME}=${dbLocale};path=/;max-age=31536000;SameSite=Lax`;
                } catch {}
                return dbLocale;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync preferred locale from Supabase profile:', err);
      }
    }

    syncFromProfile();
  }, [isInitialized, applyDomAttributes]);

  // Set Locale method
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (!LOCALES[newLocale]) return;

      setLocaleState(newLocale);
      applyDomAttributes(newLocale);

      // Persist in localStorage & cookies
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
        document.cookie = `${COOKIE_NAME}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      } catch (e) {
        console.warn('Could not store locale locally:', e);
      }

      // Persist to Supabase if logged in
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ preferred_locale: newLocale })
              .eq('id', user.id);
          }
        }
      } catch (err) {
        console.warn('Could not update profile preferred_locale in Supabase:', err);
      }
    },
    [applyDomAttributes]
  );

  // Translation lookup function
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      if (!path) return '';

      const keys = path.split('.');
      let currentVal: any = translations[locale];

      // Traverse path in active locale
      for (const k of keys) {
        if (currentVal && typeof currentVal === 'object' && k in currentVal) {
          currentVal = currentVal[k];
        } else {
          currentVal = undefined;
          break;
        }
      }

      // Fallback to English if translation is missing
      if (currentVal === undefined && locale !== 'en') {
        let fallbackVal: any = translations['en'];
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        currentVal = fallbackVal;
      }

      // Final fallback to key path itself
      if (currentVal === undefined) {
        return path;
      }

      let result = String(currentVal);

      // Interpolate parameters {name}, {count}, etc.
      if (params) {
        Object.entries(params).forEach(([pKey, pVal]) => {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        });
      }

      return result;
    },
    [locale]
  );

  // Locale-aware Date Formatter (Africa/Tunis Timezone)
  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        const intlLocale = locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-TN' : 'en-TN';
        return new Intl.DateTimeFormat(intlLocale, {
          timeZone: 'Africa/Tunis',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          ...options,
        }).format(d);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  // Locale-aware Time Formatter
  const formatTime = useCallback(
    (date: string | Date): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        const intlLocale = locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-TN' : 'en-TN';
        return new Intl.DateTimeFormat(intlLocale, {
          timeZone: 'Africa/Tunis',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  // Locale-aware Number Formatter
  const formatNumber = useCallback(
    (num: number): string => {
      try {
        const intlLocale = locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-TN' : 'en-TN';
        return new Intl.NumberFormat(intlLocale).format(num);
      } catch {
        return String(num);
      }
    },
    [locale]
  );

  // Relative Time Formatter
  const getRelativeTime = useCallback(
    (date: string | Date): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        const diffMs = Date.now() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('time.now');
        if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
        if (diffDays === 1) return t('time.yesterday');
        return t('time.daysAgo', { count: diffDays });
      } catch {
        return String(date);
      }
    },
    [t]
  );

  const contextValue = useMemo<LanguageContextType>(
    () => ({
      locale,
      dir: LOCALES[locale]?.dir || 'ltr',
      isRtl: LOCALES[locale]?.dir === 'rtl',
      setLocale,
      t,
      formatDate,
      formatTime,
      formatNumber,
      getRelativeTime,
    }),
    [locale, setLocale, t, formatDate, formatTime, formatNumber, getRelativeTime]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

// Convenient alias
export const useTranslation = useLanguage;
