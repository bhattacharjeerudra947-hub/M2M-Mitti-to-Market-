import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * GuestSignInGate — wraps a personalized/account-gated section.
 *
 * For logged-in users it renders the children normally. In guest mode it
 * replaces the section with a sign-in required card; clicking the button
 * opens the AuthRequiredModal (login/signup popup) so no vital or private
 * information is shown to guests.
 */
export default function GuestSignInGate({ children, title, description, className = '' }) {
  const { isGuestModeActive, openAuthRequired } = useAuth();
  const { t } = useLanguage();

  if (!isGuestModeActive) return children;

  return (
    <div className={`bg-white rounded-2xl border border-navy-100 shadow-sm p-8 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-14 h-14 bg-mustard-400/20 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-navy-700" />
      </div>
      <h3 className="text-base font-bold text-navy-900">{title || t('signInRequired')}</h3>
      <p className="text-xs text-navy-500 mt-1 mb-5 max-w-sm">
        {description || t('signInToUseFeature')}
      </p>
      <button
        onClick={openAuthRequired}
        className="px-5 py-2.5 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition"
      >
        {t('signin') || 'Sign In to Use'}
      </button>
    </div>
  );
}