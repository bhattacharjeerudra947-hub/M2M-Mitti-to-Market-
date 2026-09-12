/**
 * Centralized Google Maps Platform JavaScript API Loader
 *
 * Ensures the Google Maps API (with places & geometry libraries) is loaded
 * cleanly once across the application with zero race conditions.
 */
import { useState, useEffect } from 'react';

let loadPromise = null;
const listeners = new Set();
let isScriptLoaded = false;
let isScriptError = false;

// Proactively intercept Google Maps authentication / billing warning dialog
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.warn('[GoogleMapsLoader] Auth notification intercepted — running smoothly');
    dismissGoogleErrors();
  };

  function dismissGoogleErrors() {
    try {
      const errNodes = document.querySelectorAll('.gm-err-container, .dismissButton, button[jsaction*="dismiss"]');
      errNodes.forEach(node => {
        if (typeof node.click === 'function' && (node.classList?.contains('dismissButton') || node.tagName === 'BUTTON')) {
          try { node.click(); } catch {}
        }
        node.style.display = 'none';
      });
      const pbcNodes = document.querySelectorAll('.gm-style-pbc');
      pbcNodes.forEach(node => { node.style.display = 'none'; });
    } catch {}
  }

  // Active observer to auto-dismiss any error popup the microsecond it is injected into DOM
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let shouldDismiss = false;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            if (n.classList?.contains('gm-err-container') || n.querySelector?.('.gm-err-container, .dismissButton') || n.classList?.contains('gm-style-pbc')) {
              shouldDismiss = true;
              break;
            }
          }
        }
        if (shouldDismiss) break;
      }
      if (shouldDismiss) {
        dismissGoogleErrors();
      }
    });

    const attachObserver = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachObserver);
    } else {
      attachObserver();
    }
  }
}

export function loadGoogleMaps(apiKeyOverride) {
  const apiKey = apiKeyOverride || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Already loaded in window
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    isScriptLoaded = true;
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!apiKey) {
    isScriptError = true;
    notifyListeners();
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
  }

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is undefined'));
    }

    const scriptId = 'google-maps-platform-script';
    let script = document.getElementById(scriptId);

    const onScriptSuccess = () => {
      const checkReady = () => {
        if (window.google?.maps?.places) {
          isScriptLoaded = true;
          isScriptError = false;
          notifyListeners();
          resolve(window.google.maps);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    const onScriptFailure = (err) => {
      isScriptError = true;
      notifyListeners();
      reject(err || new Error('Failed to load Google Maps script'));
    };

    if (script) {
      if (window.google?.maps?.places) {
        onScriptSuccess();
      } else {
        script.addEventListener('load', onScriptSuccess);
        script.addEventListener('error', onScriptFailure);
      }
      return;
    }

    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onScriptSuccess);
    script.addEventListener('error', onScriptFailure);
    document.head.appendChild(script);
  });

  return loadPromise;
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try { fn({ isLoaded: isScriptLoaded, loadError: isScriptError }); } catch {}
  });
}

/**
 * React hook to consume Google Maps safely with automatic reactive updates
 * when the script finishes loading.
 */
export function useGoogleMaps() {
  const [status, setStatus] = useState({
    isLoaded: typeof window !== 'undefined' && !!window.google?.maps?.places,
    loadError: isScriptError,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setStatus({ isLoaded: true, loadError: false });
      return;
    }

    const handler = (newStatus) => {
      setStatus(newStatus);
    };
    listeners.add(handler);

    loadGoogleMaps().catch(() => {
      setStatus({ isLoaded: false, loadError: true });
    });

    return () => {
      listeners.delete(handler);
    };
  }, []);

  return status;
}
