/**
 * Site-wide translation registry.
 * ---------------------------------------------------------------------
 * This layers a scalable, per-page translation system on top of the
 * existing `farmerTranslations.js` file (kept untouched, so the voice
 * assistant / farmer dashboard keep working exactly as before).
 *
 * HOW IT WORKS
 * - Legacy flat keys (e.g. "dashboard", "listening") still work via
 *   `t_key()` / `getString()` exactly like before.
 * - New page content lives in small files under `./pages/*.js`, each
 *   exporting a `namespace` (e.g. "nav") and one object per language.
 *   Their keys are looked up as `"nav.home"`, `"footer.tagline"`, etc.
 * - If a language is missing a key, we fall back to English. If English
 *   is missing it too, we fall back to the raw key (so nothing ever
 *   renders blank — you'll just see the key name, which is an easy
 *   signal that a translation still needs to be added).
 *
 * HOW TO ADD TRANSLATIONS FOR A NEW PAGE
 * 1. Create `src/data/translations/pages/yourPage.js` (copy the shape
 *    of `nav.js` or `landing.js`).
 * 2. Fill in the `en` object with every string on the page.
 * 3. Fill in as many of the other 22 language objects as you can.
 *    Anything you leave out simply falls back to English for now.
 * 4. Add your file to the `PAGE_MODULES` array below.
 * 5. In the component, use:
 *      const { t } = useLanguage();
 *      <h1>{t('yourPage.heroTitle')}</h1>
 * See TRANSLATION_GUIDE.md at the project root for the full walkthrough.
 */
import legacyTranslations, { LANGUAGES, getLanguageByCode, normaliseLangCode } from '../farmerTranslations.js';

import nav from './pages/nav';
import footer from './pages/footer';
import landing from './pages/landing';

// Add every new per-page translation module here.
const PAGE_MODULES = [nav, footer, landing];

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/**
 * Merge everything into one lookup table:
 *   merged.en['dashboard']       -> legacy flat key
 *   merged.en['nav.home']        -> new namespaced key
 */
function buildMergedDictionary() {
  const merged = {};
  LANGUAGE_CODES.forEach((code) => {
    merged[code] = { ...(legacyTranslations[code] || {}) };
  });

  PAGE_MODULES.forEach((mod) => {
    const { namespace } = mod;
    LANGUAGE_CODES.forEach((code) => {
      const strings = mod[code] || {};
      Object.entries(strings).forEach(([key, value]) => {
        merged[code][`${namespace}.${key}`] = value;
      });
    });
  });

  return merged;
}

const MERGED = buildMergedDictionary();

/** Simple {{placeholder}} interpolation, e.g. t('nav.welcome', { name: 'Asha' }) */
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

/**
 * Look up `key` in `lang`, falling back to English, then to the key
 * itself. This is the function every page/component should use going
 * forward (via `useLanguage().t`).
 */
export function getString(lang, key, vars) {
  const table = MERGED[lang] || MERGED.en;
  const value = table[key] || MERGED.en[key] || key;
  return interpolate(value, vars);
}

// Re-exported for convenience so most files only need to import from here.
export { LANGUAGES, getLanguageByCode, normaliseLangCode };

// Backward-compatible alias — identical behaviour to the old `t_key`.
export const t_key = getString;
