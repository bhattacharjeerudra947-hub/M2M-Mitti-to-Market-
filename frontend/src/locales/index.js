/**
 * Central i18n engine — single source of truth for lookups.
 *
 * - Every locale lives in its own file in this folder.
 * - `en` is the source of truth: every key used by the UI must exist there.
 * - Rare languages fall back to a closely-related "sister" language, so the
 *   UI is never a mix of English and the selected language.
 * - t(key, vars) supports `{name}` interpolation.
 * - plural(n, key, keyPlural) picks the right string and interpolates `{count}`.
 */
import en from './en';
import hi from './hi';
import bn from './bn';
import ta from './ta';
import te from './te';
import mr from './mr';
import gu from './gu';
import kn from './kn';
import ml from './ml';
import pa from './pa';
import or from './or';
import ur from './ur';
import { sisterOverrides } from './sisterOverrides';

export const dictionaries = {
  en, hi, bn, ta, te, mr, gu, kn, ml, pa, or, ur,
};

/**
 * Sister-language fallback chains for languages the UI supports in the
 * selector but that do not yet have a full dictionary. The chain ends at a
 * fully-translated language, so no English ever leaks through.
 */
export const FALLBACK_CHAINS = {
  as: ['as', 'bn'],        // Assamese → Bengali
  mni: ['mni', 'bn'],      // Manipuri → Bengali
  ks: ['ks', 'ur'],        // Kashmiri → Urdu
  sd: ['sd', 'ur'],        // Sindhi → Urdu
  kok: ['kok', 'mr'],      // Konkani → Marathi
  mai: ['mai', 'hi'],      // Maithili → Hindi
  brx: ['brx', 'hi'],      // Bodo → Hindi
  doi: ['doi', 'hi'],      // Dogri → Hindi
  ne: ['ne', 'hi'],        // Nepali → Hindi
  sa: ['sa', 'hi'],        // Sanskrit → Hindi
  sat: ['sat', 'hi'],      // Santali → Hindi
};

const enDict = en;

function lookupDict(code) {
  return dictionaries[code] || null;
}

/** Translate a key for a language code, following fallback chains, then English. */
export function translate(langCode, key, vars) {
  const chain = FALLBACK_CHAINS[langCode] || [langCode, 'en'];
  for (const code of chain) {
    const dict = lookupDict(code);
    if (dict && dict[key] != null) {
      return interpolate(dict[key], vars);
    }
  }
  if (enDict[key] != null) return interpolate(enDict[key], vars);
  return key;
}

/** Translate a key applying the native-language override layer for sister languages. */
function translateWithOverrides(langCode, key, vars) {
  const overrides = sisterOverrides[langCode];
  if (overrides && overrides[key] != null) {
    return interpolate(overrides[key], vars);
  }
  return translate(langCode, key, vars);
}

export function t_raw(langCode, key, vars) {
  return translateWithOverrides(langCode, key, vars);
}

/** Replace `{var}` placeholders. */
function interpolate(str, vars) {
  if (!vars || !str || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : m,
  );
}

/**
 * Pick singular vs plural and translate.
 * plural(language, 5, 'listingsAvailable', 'listingsAvailablePlural')
 */
export function plural(langCode, n, keySingular, keyPlural, vars = {}) {
  const key = n === 1 ? keySingular : (keyPlural || keySingular);
  return translateWithOverrides(langCode, key, { ...vars, count: n });
}

/** Non-React helper so non-component modules can localize too. */
export function makeT(langCode) {
  return (key, vars) => translateWithOverrides(langCode, key, vars);
}
