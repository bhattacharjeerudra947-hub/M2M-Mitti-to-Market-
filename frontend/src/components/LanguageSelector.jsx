import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { LANGUAGES, getLanguageByCode, t_key } from '../data/farmerTranslations';

export default function LanguageSelector() {
  const { language, setLanguage } = useFarmerLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = getLanguageByCode(language);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-navy-100 shadow-sm hover:shadow-md transition text-sm font-medium text-navy-800 min-w-[140px]"
        aria-label={t_key(language, 'selectLanguage')}
      >
        <Globe className="w-5 h-5 text-navy-500 shrink-0" />
        <span className="truncate flex-1 text-left">{current.native}</span>
        <ChevronDown
          className={`w-4 h-4 text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-[420px] overflow-y-auto bg-white rounded-2xl border border-navy-100 shadow-2xl z-50 p-2">
          <div className="px-3 py-2 border-b border-navy-50 mb-1">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">
              {t_key(language, 'selectLanguage')}
            </p>
          </div>
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition text-left ${
                  isActive
                    ? 'bg-mustard-50 border border-mustard-200 text-navy-900 font-semibold'
                    : 'hover:bg-navy-50 text-navy-700'
                }`}
              >
                <span className="text-base w-6 text-center">{lang.native.charAt(0)}</span>
                <span className="flex-1">
                  <span className="block font-medium">{lang.native}</span>
                  <span className="block text-xs text-navy-400">{lang.name}</span>
                </span>
                {isActive && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
