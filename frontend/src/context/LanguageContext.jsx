import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getString } from '../data/translations';
import { applyPageTranslation, resetPageTranslation, syncRouteTranslation } from '../services/pageTranslator';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'mitti2market_lang';
const LEGACY_STORAGE_KEY = 'mitti2market_farmer_lang'; // old farmer-only key, kept for migration
const DEFAULT_LANG = 'en';

function readSavedLang() {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY) ||
      DEFAULT_LANG
    );
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * Site-wide language provider. Mount this ONCE, at the top of the app
 * (see App.jsx), so every page and component shares the same selected
 * language and the same `t()` translator.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLang);

  // Synchronize universal page translation on mount if a non-English language was saved
  useEffect(() => {
    if (language && language !== DEFAULT_LANG) {
      applyPageTranslation(language);
    }
  }, []);

  const setLanguage = useCallback((lang) => {
    const validLang = lang || DEFAULT_LANG;
    setLanguageState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch {
      // localStorage unavailable — silent fail
    }

    if (validLang === DEFAULT_LANG) {
      resetPageTranslation();
    } else {
      applyPageTranslation(validLang);
    }
  }, []);

  // t('namespace.key') looks up the current language, falling back to
  // English, and finally to the key itself so missing strings never
  // render as blank/undefined.
  const t = useCallback((key, vars) => getString(language, key, vars), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Component to place inside <Router> to ensure page translation persists
 * across route navigations.
 */
export function LanguageRouteSync() {
  const { language } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    if (language && language !== 'en') {
      syncRouteTranslation(language);
    }
  }, [location.pathname, language]);

  return null;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
