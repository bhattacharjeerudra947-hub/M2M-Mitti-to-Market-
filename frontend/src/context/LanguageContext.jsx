import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, plural as pluralFn } from '../locales';
import { getLanguageByCode } from '../data/farmerTranslations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'mitti2market_farmer_lang'; // keep the existing key so saved choices survive
const DEFAULT_LANG = 'en';

/** RTL languages (Urdu, Sindhi) */
const RTL_LANGS = new Set(['ur', 'sd']);

function readSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    /* localStorage unavailable */
  }
  try {
    const nav = (navigator.language || 'en').split('-')[0];
    // Only auto-select a language the site actually supports.
    if (['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'ur'].includes(nav)) return nav;
  } catch {
    /* navigator unavailable */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLang);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage unavailable — silent fail */
    }
  }, []);

  // Keep <html lang> / direction in sync so screen readers, fonts and RTL (Urdu) behave.
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = RTL_LANGS.has(language) ? 'rtl' : 'ltr';
    } catch {
      /* non-DOM environment */
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    /** t('key', { name: 'Rajesh' }) — with {var} interpolation */
    t: (key, vars) => translate(language, key, vars),
    /** plural helper: plural(5, 'listingsAvailable', 'listingsAvailablePlural') */
    plural: (n, keySingular, keyPlural, vars) => pluralFn(language, n, keySingular, keyPlural, vars),
    /** currently selected language metadata */
    langInfo: getLanguageByCode(language),
  }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage — the single source of truth for the selected UI language.
 * Available everywhere because <LanguageProvider> wraps the whole app in App.jsx.
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export default LanguageProvider;
