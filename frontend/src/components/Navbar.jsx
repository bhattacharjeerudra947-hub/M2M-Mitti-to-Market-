import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import M2MLogo from './M2MLogo';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ dark = false }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const role = user?.role?.toLowerCase();

  const navBg = dark
    ? 'bg-navy-900/95 backdrop-blur-md border-b border-white/5'
    : 'bg-white border-b border-navy-100';

  const linkColor = dark
    ? 'text-white/70 hover:text-white'
    : 'text-navy-600 hover:text-navy-900';

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
            <Link to="/" className={`text-[13px] font-medium ${linkColor} transition`}>Home</Link>
            <a href="#how-it-works" className={`text-[13px] font-medium ${linkColor} transition`}>How It Works</a>
            <Link to="/marketplace" className={`text-[13px] font-medium ${linkColor} transition`}>Marketplace</Link>
            <a href="#pricing" className={`text-[13px] font-medium ${linkColor} transition`}>Pricing</a>
            <a href="#about" className={`text-[13px] font-medium ${linkColor} transition`}>About Us</a>
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
          <Link to="/" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>Home</Link>
          <a href="#how-it-works" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>How It Works</a>
          <Link to="/marketplace" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>Marketplace</Link>
          <a href="#pricing" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>Pricing</a>
          <a href="#about" className={`block py-2.5 text-sm font-medium ${linkColor}`} onClick={() => setOpen(false)}>About Us</a>
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
