import { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES, getLanguageByCode } from '../data/translations';

/**
 * Site-wide language switcher. Rendered in the Navbar so it's available
 * on every page (dashboards can also drop it into their own header/sidebar
 * if useful — it always reflects/controls the same global language).
 *
 * `compact`: smaller footprint for the navbar; omit for the larger
 * standalone style (e.g. inside a dashboard header).
 */
export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const searchInputRef = useRef(null);
  const current = getLanguageByCode(language);

  // Focus search input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filteredLanguages = useMemo(() => {
    if (!query.trim()) return LANGUAGES;
    const q = query.toLowerCase().trim();
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative notranslate" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 bg-white rounded-xl border border-navy-100 shadow-sm hover:shadow-md transition text-sm font-medium text-navy-800 ${
          compact ? 'px-2.5 py-2 min-w-0' : 'px-3 py-2.5 min-w-[140px]'
        }`}
        aria-label={t('selectLanguage')}
        type="button"
      >
        <Globe className="w-5 h-5 text-navy-500 shrink-0" />
        {!compact && <span className="truncate flex-1 text-left font-semibold">{current.native}</span>}
        {compact && <span className="text-xs font-semibold text-navy-700 sm:hidden">{current.code.toUpperCase()}</span>}
        {compact && <span className="hidden sm:inline-block text-xs font-semibold text-navy-700">{current.native}</span>}
        <ChevronDown
          className={`w-4 h-4 text-navy-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-[440px] flex flex-col bg-white rounded-2xl border border-navy-100 shadow-2xl z-50 p-2 overflow-hidden">
          {/* Header & Search */}
          <div className="px-2 pt-1 pb-2 border-b border-navy-50">
            <p className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-2">
              {t('selectLanguage') || 'Select Language'}
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search language / भाषा खोजें..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-navy-50/70 rounded-lg border border-navy-100 focus:outline-none focus:border-navy-400 text-navy-900 placeholder:text-navy-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Languages list */}
          <div className="overflow-y-auto max-h-[320px] py-1 space-y-0.5">
            {filteredLanguages.length === 0 ? (
              <p className="text-xs text-navy-400 text-center py-4">No language found</p>
            ) : (
              filteredLanguages.map((lang) => {
                const isActive = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition text-left ${
                      isActive
                        ? 'bg-mustard-50 border border-mustard-300 text-navy-900 font-bold'
                        : 'hover:bg-navy-50 text-navy-700'
                    }`}
                  >
                    <span className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-lg bg-navy-100/60 text-navy-800 shrink-0">
                      {lang.native.charAt(0)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{lang.native}</span>
                      <span className="block text-[11px] text-navy-400">{lang.name}</span>
                    </span>
                    {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
