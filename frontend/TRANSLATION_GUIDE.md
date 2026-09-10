# Site-wide language switching — how it works & how to extend it

## What changed

Previously, language switching only worked on the Farmer Dashboard (via
`FarmerContext` + `farmerTranslations.js`), and the language dropdown
wasn't shown anywhere else.

Now:

- **`src/context/LanguageContext.jsx`** is the one global language
  provider, mounted once at the very top of `App.jsx`. Every page shares
  the same selected language (persisted to `localStorage`).
- **`src/components/LanguageSelector.jsx`** is rendered in the **Navbar**,
  so it's visible on every page, not just the farmer dashboard. (Pass
  `compact` for a small icon-only version, like in the navbar; omit it
  for the larger labeled version.)
- **`src/data/translations/`** is the new, scalable place to add
  translated strings for any page:
  - `index.js` — merges everything into one lookup table and exposes
    `getString(lang, key)` (used internally by the `t()` function).
  - `pages/nav.js`, `pages/footer.js`, `pages/landing.js` — one small
    file per page/section. **Copy this pattern for every other page.**
- The **old system still works exactly as before** — `farmerTranslations.js`,
  `t_key()`, and `useFarmerLanguage()` are untouched / aliased, so the
  Voice Assistant, Trend Insights, Map Route Optimizer, and Farmer
  Dashboard keep working with zero changes.

Pages already fully converted: **Navbar, Footer, Landing**.
Every other page (Marketplace, Login, BusinessDashboard, etc.) still has
hardcoded English text — see below for how to convert them.

## Using translations in a component

```jsx
import { useLanguage } from '../context/LanguageContext';

export default function MyPage() {
  const { t, language, setLanguage } = useLanguage();
  return <h1>{t('myPage.heroTitle')}</h1>;
}
```

- `t('nav.home')` → looks up `home` in the `nav` namespace for the
  current language.
- If that language doesn't have the key yet, it **automatically falls
  back to English** — nothing ever renders blank or crashes.
- If English doesn't have it either, it falls back to showing the raw
  key (e.g. `myPage.heroTitle`) — that's your signal something wasn't
  wired up.

## Adding translations for a new page (step by step)

1. **Create a namespace file**: `src/data/translations/pages/<pageName>.js`.
   Copy the shape of `landing.js`:

   ```js
   const keys = {
     heroTitle: 'Welcome to the Marketplace',
     searchPlaceholder: 'Search for produce...',
     // ...every string on the page
   };

   export default {
     namespace: 'marketplace',
     en: keys,
     hi: {},   // fill in as you translate — empty = falls back to English
     bn: {},
     ta: {},
     te: {},
     mr: {},
     gu: {},
     kn: {},
     ml: {},
     pa: {},
     or: {},
     as: {},
     ks: {},
     kok: {},
     mai: {},
     brx: {},
     doi: {},
     sd: {},
     mni: {},
     ne: {},
     sa: {},
     sat: {},
     ur: {},
   };
   ```

2. **Register it** in `src/data/translations/index.js`:
   ```js
   import marketplace from './pages/marketplace';
   const PAGE_MODULES = [nav, footer, landing, marketplace];
   ```

3. **Replace hardcoded strings** in the page component with `t('marketplace.heroTitle')`
   calls, using the `useLanguage()` hook shown above. For strings inside
   arrays (feature lists, steps, cards), build the array *inside* the
   component function (after calling `useLanguage()`) so it re-runs and
   re-translates whenever the language changes — see how `Landing.jsx`
   does this with `buildFeatures(t)`, `buildSteps(t)`, `buildTestimonials(t)`.

4. **Fill in real translations** for each of the 22 languages, a few at a
   time, in that page's file. You don't have to do all 22 at once —
   anything left as `{}` just falls back to English until you get to it.

## Remaining pages to convert

All 38 pages share this same pattern. Highest-traffic ones to prioritize
first:

- `Marketplace.jsx`, `ExploreMarketplace.jsx`, `ProductDetails.jsx` (buyer-facing, high traffic)
- `Login.jsx`, `Signup.jsx` (first-time user experience)
- `HowItWorks.jsx`, `Pricing.jsx`, `AboutUs.jsx` (public marketing pages)
- `FarmerDashboard.jsx` and related farmer pages — these already use the
  *old* `t_key()`/`farmerTranslations.js` system; you can either keep
  adding keys there (simplest, zero risk) or migrate them to the new
  namespaced system for consistency — both work side by side.
- Business & buyer dashboards (`BusinessDashboard.jsx`, `BuyerRequests.jsx`, etc.)
- Admin pages (lowest priority — internal-only tool)

## Notes

- Language choice persists across page reloads via `localStorage`
  (`mitti2market_lang`). If someone previously used the old farmer-only
  selector, their choice is automatically migrated.
- `LanguageSelector` can be dropped into any page/header, not just the
  Navbar — it always reads/writes the same global language.
- Keep brand names (Mitti2Market) and personal names untranslated unless
  you want transliterations.
