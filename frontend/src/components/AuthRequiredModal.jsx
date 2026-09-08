import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Lock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Sign-in required modal — shown when a guest tries to perform an
 * account-gated action. Provides Sign In, Create Account, and Close.
 */
export default function AuthRequiredModal() {
  const { authRequiredOpen, closeAuthRequired } = useAuth();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeAuthRequired();
  }, [closeAuthRequired]);

  useEffect(() => {
    if (authRequiredOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [authRequiredOpen, handleKeyDown]);

  if (!authRequiredOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
        onClick={closeAuthRequired}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-navy-100 overflow-hidden">
        {/* Close button */}
        <button
          onClick={closeAuthRequired}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-8 pt-8 pb-10 text-center">
          <div className="w-14 h-14 bg-mustard-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-mustard-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Sign In Required</h2>
          <p className="text-sm text-navy-300">
            Sign in or create an account to use this feature
          </p>
        </div>

        {/* Body */}
        <div className="px-8 pt-6 pb-8 space-y-3">
          <Link
            to="/login"
            onClick={closeAuthRequired}
            className="block w-full py-3.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition text-center shadow-sm"
          >
            Sign In
          </Link>

          <Link
            to="/signup"
            onClick={closeAuthRequired}
            className="block w-full py-3.5 bg-mustard-400 text-navy-900 text-sm font-semibold rounded-xl hover:bg-mustard-300 transition text-center shadow-sm"
          >
            Create Account
          </Link>

          <button
            onClick={closeAuthRequired}
            className="block w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
