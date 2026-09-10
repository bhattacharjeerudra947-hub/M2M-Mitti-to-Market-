/**
 * DEPRECATED: language state now lives in LanguageContext.jsx and is
 * provided once, site-wide, from App.jsx.
 *
 * This file only exists so older imports (`FarmerProvider`,
 * `useFarmerLanguage`) keep working without touching every file that
 * still references them. New code should import from
 * `context/LanguageContext.jsx` directly (`LanguageProvider`, `useLanguage`).
 */
import { useLanguage } from './LanguageContext';

// No-op passthrough — the real provider is mounted once in App.jsx.
export function FarmerProvider({ children }) {
  return children;
}

export function useFarmerLanguage() {
  return useLanguage();
}
