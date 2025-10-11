/**
 * i18n Configuration
 * Sets up i18next for internationalization support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../../locales/en/translations.json';
import daTranslations from '../../locales/da/translations.json';

const LANGUAGE_STORAGE_KEY = 'tournament-app-language';
const DEFAULT_LANGUAGE = 'da'; // Danish is the default

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// If no language is stored, set Danish as default
if (isBrowser && !localStorage.getItem(LANGUAGE_STORAGE_KEY)) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);
}

// Custom language detector that uses localStorage
const languageDetector = new LanguageDetector(null, {
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: LANGUAGE_STORAGE_KEY,
  caches: ['localStorage'],
});

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      da: {
        translation: daTranslations,
      },
    },
    fallbackLng: DEFAULT_LANGUAGE, // Danish is the fallback
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;
export { LANGUAGE_STORAGE_KEY };
