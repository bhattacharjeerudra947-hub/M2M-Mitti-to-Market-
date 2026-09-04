import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About Us', to: '/about-us' },
];

export default function Navbar({ dark = false }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role?.toLowerCase();

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
            <img src="https://i.postimg.cc/L89VZ3GK/icon.png" alt="Mitti2Market logo" className="w-[34px] h-[34px] object-contain" />
            <span className={`hidden sm:block text-sm font-bold tracking-tight ${dark ? 'text-white' : 'text-navy-900'}`}>
              Mitti2Market
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={desktopLink(item.to)}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to={role === 'farmer' ? '/farmer' : '/business'}
                className="text-[13px] font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-5 py-2.5 rounded-xl transition"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={`text-[13px] font-medium ${linkColor} transition`}>Sign In</Link>
                <Link
                  to="/signup"
                  className="text-[13px] font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open
              ? <X className={`w-5 h-5 ${dark ? 'text-white' : 'text-navy-900'}`} />
              : <Menu className={`w-5 h-5 ${dark ? 'text-white' : 'text-navy-900'}`} />}
          </button>
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
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-navy-100 space-y-2">
            {isAuthenticated ? (
              <Link to={role === 'farmer' ? '/farmer' : '/business'} className="block w-full text-center px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl" onClick={() => setOpen(false)}>My Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>Sign In</Link>
                <Link to="/signup" className="block w-full text-center px-5 py-2.5 bg-mustard-400 text-navy-900 text-sm font-semibold rounded-xl" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
