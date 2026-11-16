/**
 * Authentic Trilingual Transcript Translator for 3ZERO Club ISIMS
 * Supports:
 * 1. Tunisian Arabic (ar-TN) — Authentic Tunisian Derja in Arabic script (not MSA, not Arabizi)
 * 2. French (fr)
 * 3. English (en)
 */

export type SupportedTranscriptLocale = 'ar-TN' | 'fr' | 'en';

// Idiomatic speech translation dictionary for Tunisian Derja
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
  'thanks.': 'شكراً / يعيشك.',
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

/**
 * Translates speech text into Tunisian Derja (Arabic script), French, or English.
 */
export function translateTranscriptText(
  text: string,
  targetLang: SupportedTranscriptLocale,
  sourceLang: string = 'en'
): string {
  if (!text || text.trim().length === 0) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // If already target language, return as is
  if (targetLang === sourceLang) return trimmed;

  if (targetLang === 'ar-TN') {
    if (DICTIONARY_EN_TO_TUNISIAN[lower]) {
      return DICTIONARY_EN_TO_TUNISIAN[lower];
    }
    // Check partial phrase matches
    let res = trimmed;
    for (const [enKey, arVal] of Object.entries(DICTIONARY_EN_TO_TUNISIAN)) {
      const reg = new RegExp(`\\b${enKey}\\b`, 'gi');
      if (reg.test(res)) {
        res = res.replace(reg, arVal);
      }
    }
    return res !== trimmed ? res : trimmed;
  }

  if (targetLang === 'fr') {
    if (DICTIONARY_EN_TO_FR[lower]) {
      return DICTIONARY_EN_TO_FR[lower];
    }
    let res = trimmed;
    for (const [enKey, frVal] of Object.entries(DICTIONARY_EN_TO_FR)) {
      const reg = new RegExp(`\\b${enKey}\\b`, 'gi');
      if (reg.test(res)) {
        res = res.replace(reg, frVal);
      }
    }
    return res !== trimmed ? res : trimmed;
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
  if (!segment.translations) {
    return translateTranscriptText(original, locale);
  }

  // Check specific locale key
  if (segment.translations[locale]) {
    return segment.translations[locale];
  }

  // Fallbacks
  if (locale === 'ar-TN' && segment.translations['ar']) {
    return segment.translations['ar'];
  }

  if (locale === 'en' && (segment.translations['en'] || original)) {
    return segment.translations['en'] || original;
  }

  return translateTranscriptText(original, locale);
}
