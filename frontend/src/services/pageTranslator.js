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

// Known translated phrases for Mitti2Market across various Indian languages
const KNOWN_TRANSLATED_NAMES = [
  'मिट्टी से बाज़ार',
  'मिट्टी से बाजार',
  'मिट्टी 2 बाजार',
  'मिट्टी2बाजार',
  'मिट्टी2मार्केट',
  'मिट्टी 2 मार्केट',
  'माटी ते बाजार',
  'मातीतून बाजारपेठ',
  'মাটি থেকে বাজার',
  'মিত্তি২মার্কেট',
  'மண்ணிலிருந்து சந்தைக்கு',
  'மண்ணிலிருந்து சந்தை',
  'మట్టి నుండి మార్కెట్',
  'మట్టి నుంచి మార్కెట్',
  'మాతీయిందా మార్కెట్',
  'ಮಣ್ಣಿನಿಂದ ಮಾರುಕಟ್ಟೆಗೆ',
  'മണ്ണിൽ നിന്ന് വിപണിയിലേക്ക്',
  'માટીથી બજાર',
  'మిట్టి 2 మార్కెట్',
  'Mitti 2 Market',
  'Mitti to Market',
];

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

// Apply safety patch immediately upon module import
applyDomSafetyPatch();

/**
 * Sets the Google Translate cookie for the current host
 */
function setTranslateCookie(targetLang) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const path = '/';

  if (!targetLang || targetLang === 'en') {
    // Clear cookies
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    document.cookie = `googtrans=/en/en; path=${path};`;
    document.cookie = `googtrans=/auto/en; path=${path};`;
    if (!isLocal) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${host}; path=${path};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${host}; path=${path};`;
      document.cookie = `googtrans=/en/en; domain=.${host}; path=${path};`;
      document.cookie = `googtrans=/en/en; domain=${host}; path=${path};`;
    }
  } else {
    document.cookie = `googtrans=/en/${targetLang}; path=${path};`;
    document.cookie = `googtrans=/auto/${targetLang}; path=${path};`;
    if (!isLocal) {
      document.cookie = `googtrans=/en/${targetLang}; domain=.${host}; path=${path};`;
      document.cookie = `googtrans=/en/${targetLang}; domain=${host}; path=${path};`;
      document.cookie = `googtrans=/auto/${targetLang}; domain=.${host}; path=${path};`;
      document.cookie = `googtrans=/auto/${targetLang}; domain=${host}; path=${path};`;
    }
  }
}

/**
 * Ensures any element or text node displaying "Mitti2Market" retains
 * its untranslated English brand name.
 */
let isScanningBrand = false;
export function protectBrandNames() {
  if (typeof document === 'undefined' || isScanningBrand) return;
  isScanningBrand = true;

  try {
    // 1. Protect elements that directly display "Mitti2Market"
    const candidates = document.querySelectorAll(
      'span, a, p, h1, h2, h3, h4, h5, h6, div, b, strong, button'
    );
    for (const el of candidates) {
      if (el.children.length === 0 && el.textContent && el.textContent.includes('Mitti2Market')) {
        if (!el.classList.contains('notranslate')) {
          el.classList.add('notranslate');
        }
        if (el.getAttribute('translate') !== 'no') {
          el.setAttribute('translate', 'no');
        }
      }
    }

    // 2. Revert any mistakenly translated phrases in text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodesToCheck = [];
    while (walker.nextNode()) {
      nodesToCheck.push(walker.currentNode);
    }

    for (const node of nodesToCheck) {
      if (!node.nodeValue) continue;
      let val = node.nodeValue;
      let changed = false;

      for (const pattern of KNOWN_TRANSLATED_NAMES) {
        if (val.includes(pattern)) {
          val = val.split(pattern).join('Mitti2Market');
          changed = true;
        }
      }

      if (changed) {
        node.nodeValue = val;
      }
    }
  } catch (err) {
    // Silent fail to ensure app never crashes
  } finally {
    isScanningBrand = false;
  }
}

let brandObserver = null;
function setupBrandObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined' || brandObserver) return;

  brandObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      protectBrandNames();
    }
  });

  if (document.body) {
    brandObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
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
  setupBrandObserver();

  // Create hidden translate container if missing
  if (!document.getElementById('google_translate_element')) {
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    document.body.appendChild(el);
  }

  // Setup global Google Translate initialization callback
  const prevInit = window.googleTranslateElementInit;
  window.googleTranslateElementInit = function () {
    if (typeof prevInit === 'function') {
      try { prevInit(); } catch {}
    }
    if (window.google && window.google.translate) {
      if (!document.querySelector('.goog-te-combo')) {
        try {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        } catch {}
      }

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
  } else if (window.google && window.google.translate) {
    // If already loaded
    window.googleTranslateElementInit();
  }
}

/**
 * Trigger the Google Translate dropdown combo
 */
function triggerTranslateElement(internalLang) {
  const gLang = GOOGLE_LANG_MAP[internalLang] || internalLang;
  setTranslateCookie(gLang);
  protectBrandNames();

  const selectAndTrigger = (combo) => {
    const targetVal = gLang === 'en' ? '' : gLang;
    if (combo.value !== targetVal) {
      combo.value = targetVal;
      combo.dispatchEvent(new Event('change'));
    }
    setTimeout(protectBrandNames, 200);
    setTimeout(protectBrandNames, 600);
  };

  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    selectAndTrigger(combo);
  } else {
    // If element is not yet created by Google Translate script, poll for it
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const c = document.querySelector('.goog-te-combo');
      if (c) {
        clearInterval(timer);
        selectAndTrigger(c);
      } else if (attempts > 40) {
        clearInterval(timer);
      }
    }, 150);
  }
}

/**
 * Apply universal page translation to every text node across the site
 */
export function applyPageTranslation(langCode) {
  currentLanguage = langCode || 'en';
  applyDomSafetyPatch();
  setupBrandObserver();

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

  setTimeout(protectBrandNames, 100);
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
  }, 200);
}

export default {
  initPageTranslator,
  applyPageTranslation,
  resetPageTranslation,
  syncRouteTranslation,
  protectBrandNames,
};
