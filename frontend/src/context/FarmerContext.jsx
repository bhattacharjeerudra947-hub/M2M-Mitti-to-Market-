import { createContext, useContext, useState, useCallback } from 'react';

const FarmerContext = createContext(null);

const STORAGE_KEY = 'mitti2market_farmer_lang';
const DEFAULT_LANG = 'en';

function readSavedLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function FarmerProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLang);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable — silent fail
    }
  }, []);

  return (
    <FarmerContext.Provider value={{ language, setLanguage }}>
      {children}
    </FarmerContext.Provider>
  );
}

export function useFarmerLanguage() {
  const ctx = useContext(FarmerContext);
  if (!ctx) throw new Error('useFarmerLanguage must be used within FarmerProvider');
  return ctx;
}
