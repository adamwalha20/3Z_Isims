import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, DEFAULT_LOCALE } from '../src/lib/i18n/types.ts';
import { en } from '../src/lib/i18n/translations/en.ts';
import { fr } from '../src/lib/i18n/translations/fr.ts';
import { arTN } from '../src/lib/i18n/translations/ar-TN.ts';

// Helper to recursively collect all dot-notation paths from an object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

// Helper to get nested value by dot path
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// Simple interpolation helper matching the context implementation
function interpolate(template, params = {}) {
  let result = template;
  for (const [key, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

test('ZEC Campus Hub — Multilingual & Internationalization Engine', async (t) => {
  await t.test('1. Supported Locales & Direction Invariants', () => {
    assert.deepEqual(Object.keys(LOCALES).sort(), ['ar-TN', 'en', 'fr']);
    assert.equal(DEFAULT_LOCALE, 'en');

    // English LTR
    assert.equal(LOCALES.en.code, 'en');
    assert.equal(LOCALES.en.dir, 'ltr');
    assert.equal(LOCALES.en.name, 'English');
    assert.equal(LOCALES.en.flag, '🇬🇧');

    // French LTR
    assert.equal(LOCALES.fr.code, 'fr');
    assert.equal(LOCALES.fr.dir, 'ltr');
    assert.equal(LOCALES.fr.name, 'French');
    assert.equal(LOCALES.fr.flag, '🇫🇷');

    // Tunisian Arabic RTL
    assert.equal(LOCALES['ar-TN'].code, 'ar-TN');
    assert.equal(LOCALES['ar-TN'].dir, 'rtl');
    assert.equal(LOCALES['ar-TN'].name, 'Tunisian Arabic');
    assert.equal(LOCALES['ar-TN'].flag, '🇹🇳');
  });

  await t.test('2. Complete Translation Namespace Coverage', () => {
    const requiredNamespaces = [
      'common',
      'auth',
      'nav',
      'dashboard',
      'tasks',
      'meetings',
      'attendance',
      'ranking',
      'bureau',
      'members',
      'projects',
      'events',
      'notifications',
      'profile',
      'admin',
      'time',
    ];

    for (const ns of requiredNamespaces) {
      assert.ok(en[ns], `Namespace "${ns}" must exist in English`);
      assert.ok(fr[ns], `Namespace "${ns}" must exist in French`);
      assert.ok(arTN[ns], `Namespace "${ns}" must exist in Tunisian Arabic`);
    }
  });

  await t.test('3. Exact Key Symmetry & Zero Missing Keys across Locales', () => {
    const enKeys = getAllKeys(en);
    const frKeys = getAllKeys(fr);
    const arKeys = getAllKeys(arTN);

    assert.ok(enKeys.length > 150, `Expected at least 150 translation keys, got ${enKeys.length}`);

    // Check FR against EN
    const missingInFr = enKeys.filter((k) => !frKeys.includes(k));
    assert.deepEqual(
      missingInFr,
      [],
      `French dictionary is missing keys from English: ${missingInFr.join(', ')}`
    );

    // Check AR-TN against EN
    const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
    assert.deepEqual(
      missingInAr,
      [],
      `Tunisian Arabic dictionary is missing keys from English: ${missingInAr.join(', ')}`
    );

    // Ensure no empty string values in any locale
    for (const key of enKeys) {
      const enVal = getNestedValue(en, key);
      const frVal = getNestedValue(fr, key);
      const arVal = getNestedValue(arTN, key);

      assert.ok(typeof enVal === 'string' && enVal.trim().length > 0, `English key "${key}" is empty`);
      assert.ok(typeof frVal === 'string' && frVal.trim().length > 0, `French key "${key}" is empty`);
      assert.ok(typeof arVal === 'string' && arVal.trim().length > 0, `Tunisian Arabic key "${key}" is empty`);
    }
  });

  await t.test('4. Authentic Tunisian Derja Vocabulary & Script Validation', () => {
    // Check specific Tunisian Derja terms
    assert.equal(arTN.common.save, 'سجّل');
    assert.equal(arTN.common.delete, 'فسّخ');
    assert.equal(arTN.common.cancel, 'ألغي');
    assert.equal(arTN.common.back, 'ارجع');
    assert.equal(arTN.common.edit, 'بدّل');

    assert.equal(arTN.tasks.statusCompleted, 'كمّلت');
    assert.equal(arTN.tasks.statusToDo, 'تستنّى باش تبدا');
    assert.equal(arTN.tasks.statusInProgress, 'قاعدين نخدمو فاها');

    assert.equal(arTN.attendance.openScanner, 'حلّ السكانير');
    assert.equal(arTN.attendance.scanSuccess, 'تم تسجيل الحضور بنجاح');

    // Verify Arabic script characters (U+0600 - U+06FF) in text
    const arabicRegex = /[\u0600-\u06FF]/;
    assert.ok(arabicRegex.test(arTN.dashboard.overview));
    assert.ok(arabicRegex.test(arTN.auth.welcomeBack));
    assert.ok(arabicRegex.test(arTN.bureau.title));
  });

  await t.test('5. Dynamic Parameter Interpolation Invariants', () => {
    const greetingEn = interpolate(en.dashboard.welcome, { name: 'Adam' });
    assert.equal(greetingEn, 'Welcome, Adam');

    const greetingFr = interpolate(fr.dashboard.welcome, { name: 'Adam' });
    assert.equal(greetingFr, 'Bienvenue, Adam');

    const greetingAr = interpolate(arTN.dashboard.welcome, { name: 'آدم' });
    assert.equal(greetingAr, 'مرحباً، آدم');

    const xpEn = interpolate(en.attendance.xpAwarded, { xp: 15 });
    assert.equal(xpEn, '+15 XP Awarded');

    const xpAr = interpolate(arTN.attendance.xpAwarded, { xp: 15 });
    assert.equal(xpAr, '+15 XP تزادت في رصيدك');
  });

  await t.test('6. Africa/Tunis Timezone & Date Formatting Readiness', () => {
    const testDate = new Date('2026-11-15T10:00:00Z');
    
    // Format date in English
    const enFormatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Tunis',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(testDate);
    assert.ok(enFormatted.length > 0);

    // Format date in French
    const frFormatted = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Tunis',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(testDate);
    assert.ok(frFormatted.length > 0);

    // Format date in Tunisian Arabic
    const arFormatted = new Intl.DateTimeFormat('ar-TN', {
      timeZone: 'Africa/Tunis',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(testDate);
    assert.ok(arFormatted.length > 0);
  });
});
