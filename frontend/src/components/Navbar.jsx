import { Link } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import M2MLogo from './M2MLogo';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const role = user?.role?.toLowerCase();

  return (
    <nav className="bg-white border-b border-navy-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center"><M2MLogo /></Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-navy-600 hover:text-navy-900 transition">Home</Link>
            <a href="#how-it-works" className="text-sm font-medium text-navy-600 hover:text-navy-900 transition">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-navy-600 hover:text-navy-900 transition">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={role === 'farmer' ? '/farmer' : '/business'}
                className="px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-navy-700 hover:text-navy-900 transition">Sign In</Link>
                <Link to="/signup" className="px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-navy-100 px-4 pb-4 space-y-2">
          <Link to="/" className="block py-2 text-sm font-medium text-navy-700" onClick={() => setOpen(false)}>Home</Link>
          {isAuthenticated ? (
            <Link to={role === 'farmer' ? '/farmer' : '/business'} className="block w-full text-center px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl" onClick={() => setOpen(false)}>My Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm font-medium text-navy-700" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/signup" className="block w-full text-center px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
