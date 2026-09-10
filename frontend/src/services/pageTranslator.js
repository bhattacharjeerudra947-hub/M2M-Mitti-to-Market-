/**
 * Universal Page Translator Service
 * -----------------------------------------------------------------------------
 * Translates EVERY piece of content across the entire page into the user's
 * selected language (English + all 22 Eighth Schedule Indian languages).
 *
 * Features:
 * 1. React 19 DOM Safety Patch: prevents NotFoundError / removeChild exceptions
 *    when Google Translate wraps text nodes in <font> tags.
 * 2. Invisible Google Translate Element: silently translates the full DOM without
 *    ugly toolbars, top banners, or layout shifts.
 * 3. Route Change & SPA Support: re-triggers translation automatically when
 *    navigating between pages or when dynamic components mount.
 * 4. Two-way synchronization with LanguageContext and localStorage.
 */

// Mapping internal language codes to Google Translate codes
const GOOGLE_LANG_MAP = {
  en: 'en',
  hi: 'hi',
  bn: 'bn',
  ta: 'ta',
  te: 'te',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  as: 'as',
  ks: 'ks',
  kok: 'gom', // Konkani is 'gom' in Google Translate
  mai: 'mai',
  brx: 'brx',
  doi: 'doi',
  sd: 'sd',
  mni: 'mni-Mtei', // Manipuri / Meiteilon
  ne: 'ne',
  sa: 'sa',
  sat: 'sat',
  ur: 'ur',
};

/**
 * Patch DOM methods so React 19 does not crash when Google Translate wraps
 * text nodes in <font><font> elements.
 */
function applyDomSafetyPatch() {
  if (typeof window === 'undefined' || !window.Node || window.__googleTranslatePatchApplied) {
    return;
  }
  window.__googleTranslatePatchApplied = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
      }
      return this.appendChild(newNode);
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

/**
 * Sets the Google Translate cookie for the current host
 */
function setTranslateCookie(targetLang) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const path = '/';

  if (!targetLang || targetLang === 'en') {
    // Clear cookies
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${host}; path=${path};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${host}; path=${path};`;
    document.cookie = `googtrans=/en/en; path=${path};`;
  } else {
    document.cookie = `googtrans=/en/${targetLang}; path=${path};`;
    document.cookie = `googtrans=/en/${targetLang}; domain=.${host}; path=${path};`;
    document.cookie = `googtrans=/en/${targetLang}; domain=${host}; path=${path};`;
  }
}

let isInitialized = false;
let currentLanguage = 'en';

/**
 * Initialize Google Translate script and DOM container.
 */
export function initPageTranslator() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  applyDomSafetyPatch();

  // Create hidden translate container if missing
  if (!document.getElementById('google_translate_element')) {
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    el.style.display = 'none';
    document.body.appendChild(el);
  }

  // Define global Google Translate initialization callback
  window.googleTranslateElementInit = function () {
    if (window.google && window.google.translate) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        'google_translate_element'
      );

      // Once ready, check if a non-English language was already selected
      setTimeout(() => {
        if (currentLanguage && currentLanguage !== 'en') {
          triggerTranslateElement(currentLanguage);
        }
      }, 300);
    }
  };

  // Inject Google Translate script if not present
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }
}

/**
 * Trigger the hidden Google Translate dropdown combo
 */
function triggerTranslateElement(internalLang) {
  const gLang = GOOGLE_LANG_MAP[internalLang] || internalLang;
  setTranslateCookie(gLang);

  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = gLang === 'en' ? '' : gLang;
    combo.dispatchEvent(new Event('change'));
  } else {
    // If element is not yet created by Google Translate script, poll for it
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const c = document.querySelector('.goog-te-combo');
      if (c) {
        clearInterval(timer);
        c.value = gLang === 'en' ? '' : gLang;
        c.dispatchEvent(new Event('change'));
      } else if (attempts > 30) {
        clearInterval(timer);
      }
    }, 200);
  }
}

/**
 * Apply universal page translation to every text node across the site
 */
export function applyPageTranslation(langCode) {
  currentLanguage = langCode || 'en';
  applyDomSafetyPatch();

  if (!langCode || langCode === 'en') {
    resetPageTranslation();
    return;
  }

  initPageTranslator();
  triggerTranslateElement(langCode);
}

/**
 * Reset page to original English content
 */
export function resetPageTranslation() {
  currentLanguage = 'en';
  setTranslateCookie('en');

  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = '';
    combo.dispatchEvent(new Event('change'));
  }

  // If Google Translate iframe banner exists, click its close/restore button
  try {
    const banner = document.querySelector('.goog-te-banner-frame');
    if (banner && banner.contentWindow) {
      const closeBtn = banner.contentWindow.document.querySelector('.goog-close-link');
      if (closeBtn) closeBtn.click();
    }
  } catch {}
}

/**
 * Re-trigger translation when route changes so newly mounted components
 * are translated.
 */
export function syncRouteTranslation(activeLang) {
  if (!activeLang || activeLang === 'en') return;
  currentLanguage = activeLang;

  // Let React finish mounting the new route's DOM before triggering
  setTimeout(() => {
    triggerTranslateElement(activeLang);
  }, 150);
}

export default {
  initPageTranslator,
  applyPageTranslation,
  resetPageTranslation,
  syncRouteTranslation,
};
