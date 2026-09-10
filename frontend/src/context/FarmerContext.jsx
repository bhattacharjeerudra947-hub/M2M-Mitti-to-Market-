import { useLanguage } from './LanguageContext';

/**
 * Backward-compatible shim — FarmerContext used to own the language state but
 * was only mounted inside farmer routes, so public pages could not read it.
 * Language state now lives in LanguageProvider (mounted globally in App.jsx).
 * This shim keeps the old useFarmerLanguage() hook working everywhere, now
 * app-wide, backed by the same single source of truth.
 */
export function FarmerProvider({ children }) {
  return children;
}

export function useFarmerLanguage() {
  return useLanguage();
}
