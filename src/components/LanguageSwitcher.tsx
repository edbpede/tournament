/**
 * Language Switcher Component
 * Allows users to switch between supported languages
 */

import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '../lib/i18n/config';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'da', name: t('language.danish') },
    { code: 'en', name: t('language.english') },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Manually save to localStorage since we removed LanguageDetector
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-700">
        {t('language.label')}:
      </label>
      <select
        id="language-select"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
