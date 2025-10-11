/**
 * i18n Configuration
 * Sets up i18next for internationalization support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from '../../locales/en/translations.json';
import daTranslations from '../../locales/da/translations.json';

const LANGUAGE_STORAGE_KEY = 'tournament-app-language';
const DEFAULT_LANGUAGE = 'da'; // Danish is the default

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Get the current language synchronously from localStorage, or use default
const getInitialLanguage = (): string => {
  if (!isBrowser) return DEFAULT_LANGUAGE;

  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage) {
    return storedLanguage;
  }

  // No language stored, set Danish as default
  localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
};

const initialLanguage = getInitialLanguage();

// Initialize i18n synchronously without LanguageDetector to prevent FOUC
i18n
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
    lng: initialLanguage, // Set initial language synchronously
    fallbackLng: DEFAULT_LANGUAGE, // Danish is the fallback
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to prevent async loading delays
    },
  });

export default i18n;
export { LANGUAGE_STORAGE_KEY };
