import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  const pageLinks = [
    { labelKey: 'nav.home', to: '/' },
    { labelKey: 'nav.howItWorks', to: '/how-it-works' },
    { labelKey: 'nav.marketplace', to: '/marketplace' },
    { labelKey: 'nav.pricing', to: '/pricing' },
    { labelKey: 'nav.aboutUs', to: '/about-us' },
  ];

  return (
    <footer className="bg-navy-950 text-navy-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:items-start">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.png" onError={(e) => { e.currentTarget.src = "https://i.postimg.cc/L89VZ3GK/icon.png"; }} alt="Mitti2Market logo" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold text-sm notranslate" translate="no">Mitti2Market</span>
            </div>
            <p className="text-xs text-navy-500 max-w-[240px] leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Page links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {pageLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs text-navy-400 hover:text-mustard-300 transition"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <Link to="/signup" className="text-xs font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-3.5 py-1.5 rounded-lg transition">
              {t('footer.getStarted')}
            </Link>
          </nav>
        </div>
        <div className="border-t border-navy-800/50 mt-6 pt-6 text-center text-xs text-navy-600">
          <p className="mb-1">{t('footer.sihLine')}</p>
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
