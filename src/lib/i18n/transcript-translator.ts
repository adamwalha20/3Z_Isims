/**
 * Authentic Trilingual Transcript Translator for 3ZERO Club ISIMS
 * Supports:
 * 1. Tunisian Arabic (ar-TN) — Authentic Tunisian Derja in Arabic script (not MSA, not Arabizi)
 * 2. French (fr)
 * 3. English (en)
 * 
 * Supports native speech spoken directly in Tunisian Derja, French, or English,
 * and code-switching across all three languages.
 */

import { executeAICompletion } from '@/lib/ai/provider';

export type SupportedTranscriptLocale = 'ar-TN' | 'fr' | 'en';

/**
 * Detects whether the text is primarily Arabic (Tunisian Derja), French, or English.
 */
export function detectTranscriptLanguage(text: string): SupportedTranscriptLocale {
  if (!text || text.trim().length === 0) return 'en';
  
  // Any Arabic Unicode characters
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar-TN';
  }

  // French accented characters or common French meeting words
  if (
    /[éèêëàâôûùçîï]/i.test(text) ||
    /\b(bonjour|merci|d'accord|bonne chance|bienvenue|réunion|projet|aujourd'hui|demain|oui|non|salut|voilà)\b/i.test(text)
  ) {
    return 'fr';
  }

  return 'en';
}

// -----------------------------------------------------------------------------
// Bidirectional Dictionaries for Instant / Offline Translation
// -----------------------------------------------------------------------------

const DICTIONARY_EN_TO_TUNISIAN: Record<string, string> = {
  'good luck,': 'ربي يوفقك،',
  'good luck': 'ربي يوفقك',
  'stan.': 'ستان.',
  'stan': 'ستان',
  'mm-hmm': 'إي نعم',
  'mmhmm': 'إي نعم',
  'yeah': 'إي نعم',
  'yes': 'إي',
  'no': 'لا',
  'thank you.': 'يعيشك.',
  'thank you': 'يعيشك',
  'thanks.': 'يعيشك.',
  'thanks': 'يعيشك',
  'thanks for watching': 'يعطيكم الصحة عالمتابعة',
  'thanks for watching.': 'يعطيكم الصحة عالمتابعة.',
  'hello': 'عسلامة',
  'hi': 'عسلامة',
  'welcome': 'مرحبا بيكم',
  'good morning': 'صباح الخير',
  'good evening': 'مساء النور',
  'goodbye': 'بسلامة',
  'bye': 'بسلامة',
  'see you soon': 'نتقابلو عن قريب',
  'see you next time': 'نتقابلو المرة الجاية',
  'how are you': 'شنحوالك',
  'how is it going': 'شنيّة الأحوال',
  'okay': 'واضح',
  'alright': 'واضح / باهي',
  'great': 'ممتاز، يعطيكم الصحة',
  'perfect': 'مثالي / ممتاز',
  'we begin': 'نبداو على بركة الله',
  'let us begin': 'نبداو الاجتماع متاعنا',
  'meeting adjourned': 'نختمو الاجتماع هنا',
  'next step': 'الخطوة الجاية',
  'agree': 'متفاهمين',
  'agreed': 'متفاهمين',
  'no problem': 'ما ثمة حتى مشكل',
  'i understand': 'فهمتك',
  'sure': 'أكيد',
  'of course': 'بطبيعة الحال',
  'exactly': 'بالضبط',
  'tomorrow': 'غدوة',
  'today': 'اليوم',
  'next week': 'الجمعة الجاية',
};

const DICTIONARY_EN_TO_FR: Record<string, string> = {
  'good luck,': 'Bonne chance,',
  'good luck': 'Bonne chance',
  'stan.': 'Stan.',
  'stan': 'Stan',
  'mm-hmm': "D'accord",
  'mmhmm': "D'accord",
  'yeah': 'Oui',
  'yes': 'Oui',
  'no': 'Non',
  'thank you.': 'Merci beaucoup.',
  'thank you': 'Merci beaucoup',
  'thanks.': 'Merci.',
  'thanks': 'Merci',
  'thanks for watching': "Merci d'avoir regardé",
  'thanks for watching.': "Merci d'avoir regardé.",
  'hello': 'Bonjour',
  'hi': 'Salut',
  'welcome': 'Bienvenue',
  'good morning': 'Bonjour',
  'good evening': 'Bonsoir',
  'goodbye': 'Au revoir',
  'bye': 'Salut / Au revoir',
  'see you soon': 'À très bientôt',
  'see you next time': 'À la prochaine',
  'how are you': 'Comment ça va ?',
  'how is it going': 'Comment vont les choses ?',
  'okay': "D'accord",
  'alright': 'Très bien',
  'great': 'Excellent',
  'perfect': 'Parfait',
  'we begin': 'Nous commençons',
  'let us begin': 'Commençons la réunion',
  'meeting adjourned': 'La séance est levée',
  'next step': 'Prochaine étape',
  'agree': "D'accord",
  'agreed': "C'est convenu",
  'no problem': 'Pas de problème',
  'i understand': 'Je comprends',
  'sure': 'Bien sûr',
  'of course': 'Certainement',
  'exactly': 'Exactement',
  'tomorrow': 'Demain',
  'today': "Aujourd'hui",
  'next week': 'La semaine prochaine',
};

const DICTIONARY_TUNISIAN_TO_EN: Record<string, string> = {
  'عسلامة': 'Hello',
  'يعيشك': 'Thank you',
  'ربي يوفقك': 'Good luck',
  'يعطيكم الصحة': 'Well done / Thank you all',
  'يعطيكم الصحة عالمتابعة': 'Thanks for watching',
  'إي': 'Yes',
  'إي نعم': 'Yes, exactly',
  'لا': 'No',
  'واضح': 'Understood / Clear',
  'باهي': 'Alright / Okay',
  'متفاهمين': 'Agreed',
  'ما ثمة حتى مشكل': 'No problem',
  'صباح الخير': 'Good morning',
  'مساء النور': 'Good evening',
  'بسلامة': 'Goodbye',
  'شنحوالك': 'How are you',
  'شنيّة الأحوال': 'How is it going',
  'نبداو على بركة الله': "Let's begin",
  'الخطوة الجاية': 'Next step',
  'غدوة': 'Tomorrow',
  'اليوم': 'Today',
  'الجمعة الجاية': 'Next week',
  'ستان.': 'Stan.',
  'ستان': 'Stan',
};

const DICTIONARY_TUNISIAN_TO_FR: Record<string, string> = {
  'عسلامة': 'Bonjour',
  'يعيشك': 'Merci',
  'ربي يوفقك': 'Bonne chance',
  'يعطيكم الصحة': 'Bravo / Merci à tous',
  'يعطيكم الصحة عالمتابعة': "Merci d'avoir regardé",
  'إي': 'Oui',
  'إي نعم': "Oui, d'accord",
  'لا': 'Non',
  'واضح': 'Compris / D’accord',
  'باهي': "D'accord",
  'متفاهمين': "C'est convenu",
  'ما ثمة حتى مشكل': 'Pas de problème',
  'صباح الخير': 'Bonjour',
  'مساء النور': 'Bonsoir',
  'بسلامة': 'Au revoir',
  'شنحوالك': 'Comment ça va ?',
  'شنيّة الأحوال': 'Comment vont les choses ?',
  'نبداو على بركة الله': 'Commençons',
  'الخطوة الجاية': 'Prochaine étape',
  'غدوة': 'Demain',
  'اليوم': "Aujourd'hui",
  'الجمعة الجاية': 'La semaine prochaine',
  'ستان.': 'Stan.',
  'ستان': 'Stan',
};

const DICTIONARY_FR_TO_TUNISIAN: Record<string, string> = {
  'bonjour': 'عسلامة',
  'salut': 'عسلامة',
  'merci': 'يعيشك',
  'merci beaucoup': 'يعيشك برشا',
  'bonne chance': 'ربي يوفقك',
  'bonne chance,': 'ربي يوفقك،',
  "d'accord": 'واضح / باهي',
  'oui': 'إي',
  'non': 'لا',
  'au revoir': 'بسلامة',
  'à bientôt': 'نتقابلو عن قريب',
  'demain': 'غدوة',
  "aujourd'hui": 'اليوم',
  'la semaine prochaine': 'الجمعة الجاية',
  'parfait': 'ممتاز',
  'excellent': 'ممتاز، يعطيكم الصحة',
  'pas de problème': 'ما ثمة حتى مشكل',
  "c'est convenu": 'متفاهمين',
};

const DICTIONARY_FR_TO_EN: Record<string, string> = {
  'bonjour': 'Hello',
  'salut': 'Hi',
  'merci': 'Thank you',
  'merci beaucoup': 'Thank you very much',
  'bonne chance': 'Good luck',
  'bonne chance,': 'Good luck,',
  "d'accord": 'Okay / Agreed',
  'oui': 'Yes',
  'non': 'No',
  'au revoir': 'Goodbye',
  'à bientôt': 'See you soon',
  'demain': 'Tomorrow',
  "aujourd'hui": 'Today',
  'la semaine prochaine': 'Next week',
  'parfait': 'Perfect',
  'excellent': 'Excellent',
  'pas de problème': 'No problem',
  "c'est convenu": 'Agreed',
};

/**
 * Translates speech text into Tunisian Derja (Arabic script), French, or English.
 * Automatically respects the native language of the spoken text.
 */
export function translateTranscriptText(
  text: string,
  targetLang: SupportedTranscriptLocale,
  explicitSourceLang?: string
): string {
  if (!text || text.trim().length === 0) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const sourceLang = explicitSourceLang || detectTranscriptLanguage(trimmed);

  // If already in target language, preserve authentic spoken speech directly!
  if (targetLang === sourceLang) return trimmed;
  if (targetLang === 'ar-TN' && /[\u0600-\u06FF]/.test(trimmed)) return trimmed;
  if (targetLang === 'fr' && sourceLang === 'fr') return trimmed;
  if (targetLang === 'en' && sourceLang === 'en') return trimmed;

  // 1. Spoken in Arabic / Tunisian Derja -> Translate to English or French
  if (sourceLang === 'ar-TN' || /[\u0600-\u06FF]/.test(trimmed)) {
    if (targetLang === 'en') {
      if (DICTIONARY_TUNISIAN_TO_EN[trimmed]) return DICTIONARY_TUNISIAN_TO_EN[trimmed];
      let res = trimmed;
      for (const [arKey, enVal] of Object.entries(DICTIONARY_TUNISIAN_TO_EN)) {
        if (res.includes(arKey)) res = res.replace(arKey, enVal);
      }
      return res;
    }
    if (targetLang === 'fr') {
      if (DICTIONARY_TUNISIAN_TO_FR[trimmed]) return DICTIONARY_TUNISIAN_TO_FR[trimmed];
      let res = trimmed;
      for (const [arKey, frVal] of Object.entries(DICTIONARY_TUNISIAN_TO_FR)) {
        if (res.includes(arKey)) res = res.replace(arKey, frVal);
      }
      return res;
    }
  }

  // 2. Spoken in French -> Translate to Tunisian Derja or English
  if (sourceLang === 'fr') {
    if (targetLang === 'ar-TN') {
      if (DICTIONARY_FR_TO_TUNISIAN[lower]) return DICTIONARY_FR_TO_TUNISIAN[lower];
      let res = trimmed;
      for (const [frKey, arVal] of Object.entries(DICTIONARY_FR_TO_TUNISIAN)) {
        const reg = new RegExp(`\\b${frKey}\\b`, 'gi');
        if (reg.test(res)) res = res.replace(reg, arVal);
      }
      return res;
    }
    if (targetLang === 'en') {
      if (DICTIONARY_FR_TO_EN[lower]) return DICTIONARY_FR_TO_EN[lower];
      let res = trimmed;
      for (const [frKey, enVal] of Object.entries(DICTIONARY_FR_TO_EN)) {
        const reg = new RegExp(`\\b${frKey}\\b`, 'gi');
        if (reg.test(res)) res = res.replace(reg, enVal);
      }
      return res;
    }
  }

  // 3. Spoken in English -> Translate to Tunisian Derja or French
  if (targetLang === 'ar-TN') {
    if (DICTIONARY_EN_TO_TUNISIAN[lower]) return DICTIONARY_EN_TO_TUNISIAN[lower];
    let res = trimmed;
    for (const [enKey, arVal] of Object.entries(DICTIONARY_EN_TO_TUNISIAN)) {
      const reg = new RegExp(`\\b${enKey}\\b`, 'gi');
      if (reg.test(res)) res = res.replace(reg, arVal);
    }
    return res;
  }

  if (targetLang === 'fr') {
    if (DICTIONARY_EN_TO_FR[lower]) return DICTIONARY_EN_TO_FR[lower];
    let res = trimmed;
    for (const [enKey, frVal] of Object.entries(DICTIONARY_EN_TO_FR)) {
      const reg = new RegExp(`\\b${enKey}\\b`, 'gi');
      if (reg.test(res)) res = res.replace(reg, frVal);
    }
    return res;
  }

  return trimmed;
}

/**
 * Returns text for a segment in the requested language, checking stored translations first.
 */
export function getSegmentTextInLanguage(
  segment: {
    content?: string;
    text?: string;
    translations?: Record<string, string> | null;
  },
  locale: SupportedTranscriptLocale
): string {
  const original = segment.content || segment.text || '';
  
  // If segment has stored translation for this locale, use it
  if (segment.translations && segment.translations[locale]) {
    return segment.translations[locale];
  }

  // If the original text is already in Arabic and target is ar-TN, return it directly!
  if (locale === 'ar-TN' && /[\u0600-\u06FF]/.test(original)) {
    return original;
  }

  // Aliases and fallbacks
  if (segment.translations) {
    if (locale === 'ar-TN' && segment.translations['ar']) {
      return segment.translations['ar'];
    }
    if (locale === 'en' && segment.translations['en']) {
      return segment.translations['en'];
    }
    if (locale === 'fr' && segment.translations['fr']) {
      return segment.translations['fr'];
    }
  }

  return translateTranscriptText(original, locale);
}

/**
 * High-accuracy AI Batch Translator for meeting utterances.
 * Uses OpenAI / Gemini when available to understand authentic Tunisian Derja,
 * code-switching, and academic vocabulary.
 */
export async function translateTranscriptBatchWithAI(
  items: Array<{ id: string | number; text: string; speaker?: string }>,
  targetLanguage: SupportedTranscriptLocale
): Promise<Record<string | number, string>> {
  if (!items || items.length === 0) return {};

  try {
    const hasAI = Boolean(
      (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-openai')) ||
      (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your-gemini'))
    );

    if (!hasAI) {
      // Fallback to offline translator
      const out: Record<string | number, string> = {};
      for (const item of items) {
        out[item.id] = translateTranscriptText(item.text, targetLanguage);
      }
      return out;
    }

    let languageTargetPrompt = 'natural English';
    if (targetLanguage === 'ar-TN') {
      languageTargetPrompt =
        'authentic Tunisian Arabic (Derja) written in Arabic script (باللهجة التونسية بالحروف العربية الطبيعية), conversational as spoken in university meetings in Tunisia. Avoid Modern Standard Arabic textbook phrasing and never use Latin Arabizi. If an item is already spoken in Tunisian Arabic, preserve its authentic wording!';
    } else if (targetLanguage === 'fr') {
      languageTargetPrompt = 'natural, professional French suitable for university club records';
    }

    const systemPrompt = `You are an expert multilingual translator for 3ZERO Club ISIMS (Tunisia).
Speakers communicate in Tunisian Arabic (Derja), French, and English, frequently switching between them.
Your task is to translate an array of transcript segments into ${languageTargetPrompt}.
CRITICAL:
- Return ONLY valid JSON as an object mapping each item "id" to its translated string.
- Do NOT add markdown code fences or conversational replies.
Example: {"1": "عسلامة الناس الكل", "2": "متفاهمين"}`;

    const userPrompt = JSON.stringify(
      items.map((it) => ({
        id: String(it.id),
        text: it.text,
      }))
    );

    const completion = await executeAICompletion({
      systemPrompt,
      userPrompt,
    });

    const cleaned = completion.rawJsonText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    const result: Record<string | number, string> = {};
    for (const item of items) {
      const key = String(item.id);
      result[item.id] = parsed[key] || translateTranscriptText(item.text, targetLanguage);
    }
    return result;
  } catch (err) {
    console.warn('AI batch translation fallback:', err);
    const fallback: Record<string | number, string> = {};
    for (const item of items) {
      fallback[item.id] = translateTranscriptText(item.text, targetLanguage);
    }
    return fallback;
  }
}
