import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import RoleChoiceModal from './RoleChoiceModal';
import LanguageSelector from './LanguageSelector';
import NotificationPanel from './NotificationPanel';

export default function Navbar({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isAuthenticated, user, openRoleChoice } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();
  
  const role = user?.role?.toLowerCase();

  const navItems = [
    { labelKey: 'nav.home', to: '/' },
    { labelKey: 'nav.howItWorks', to: '/how-it-works' },
    { labelKey: 'nav.marketplace', to: '/marketplace' },
    { labelKey: 'nav.pricing', to: '/pricing' },
    { labelKey: 'nav.aboutUs', to: '/about-us' },
  ];

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname === to);

  const navBg = dark
    ? 'bg-navy-900/95 backdrop-blur-md border-b border-white/5'
    : 'bg-white border-b border-navy-100';

  const linkColor = dark
    ? 'text-white/70 hover:text-white'
    : 'text-navy-600 hover:text-navy-900';

  const desktopLink = (to) => {
    const active = isActive(to);
    const color = dark
      ? active ? 'text-white font-semibold' : 'text-white/70 hover:text-white font-medium'
      : active ? 'text-navy-900 font-semibold' : 'text-navy-600 hover:text-navy-900 font-medium';
    return `text-[13px] transition ${color} ${active ? 'underline decoration-mustard-400 decoration-2 underline-offset-[6px]' : ''}`;
  };

  const mobileLink = (to) => {
    const active = isActive(to);
    const color = dark
      ? active ? 'text-white font-semibold' : 'text-white/70 hover:text-white font-medium'
      : active ? 'text-navy-900 font-semibold' : 'text-navy-600 hover:text-navy-900 font-medium';
    return `block py-2.5 text-sm transition ${color} ${active ? 'underline decoration-mustard-400 decoration-2 underline-offset-4' : ''}`;
  };

  return (
    <nav className={`${navBg} sticky top-0 z-50 transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" onError={(e) => { e.currentTarget.src = "https://i.postimg.cc/L89VZ3GK/icon.png"; }} alt="Mitti2Market logo" className="w-[34px] h-[34px] object-contain" />
            <span
              className={`hidden sm:block text-sm font-bold tracking-tight notranslate ${dark ? 'text-white' : 'text-navy-900'}`}
              translate="no"
            >
              Mitti2Market
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={desktopLink(item.to)}>
                {t(item.labelKey)}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector compact />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotifications(prev => !prev)}
                  className={`relative p-2 rounded-xl transition ${dark ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'}`}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <NotificationPanel compact />
                </button>
                <Link
                  to={role === 'farmer' ? '/farmer' : '/business'}
                  className="text-[13px] font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  {t('nav.myDashboard')}
                </Link>
              </div>
            ) : (
              <>
                <Link to="/login" className={`text-[13px] font-medium ${linkColor} transition`}>{t('nav.signIn')}</Link>
                <button
                  onClick={openRoleChoice}
                  className="text-[13px] font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  {t('nav.getStarted')}
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowNotifications(prev => !prev)}
                className={`p-2 rounded-xl transition ${dark ? 'text-white/80' : 'text-navy-600'}`}
                title="Notifications"
                aria-label="Notifications"
              >
                <NotificationPanel compact />
              </button>
            )}
            <button className="p-2" onClick={() => setOpen(!open)} aria-label="Toggle navigation menu">
              {open
                ? <X className={`w-5 h-5 ${dark ? 'text-white' : 'text-navy-900'}`} />
                : <Menu className={`w-5 h-5 ${dark ? 'text-white' : 'text-navy-900'}`} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className={`md:hidden px-4 pb-4 space-y-1 ${dark ? 'bg-navy-900 border-t border-white/10' : 'bg-white border-t border-navy-100'}`}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={mobileLink(item.to)}
              onClick={() => setOpen(false)}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <div className="pt-3 border-t border-navy-100 space-y-2">
            <LanguageSelector />
            {isAuthenticated ? (
              <Link to={role === 'farmer' ? '/farmer' : '/business'} className="block w-full text-center px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl" onClick={() => setOpen(false)}>{t('nav.myDashboard')}</Link>
            ) : (
              <>
                <Link to="/login" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>{t('nav.signIn')}</Link>
                <button onClick={() => { setOpen(false); openRoleChoice(); }} className="block w-full text-center px-5 py-2.5 bg-mustard-400 text-navy-900 text-sm font-semibold rounded-xl">{t('nav.getStarted')}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification popup modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-4 sm:right-8 top-16 w-96 max-w-[calc(100vw-2rem)] z-50 animate-in fade-in zoom-in-95">
            <NotificationPanel />
          </div>
        </div>
      )}

      {/* Role choice modal for Navbar */}
      <RoleChoiceModal />
    </nav>
  );
}
