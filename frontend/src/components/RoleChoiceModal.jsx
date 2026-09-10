import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Role choice modal — shown when a guest clicks "Get Started".
 * Lets them choose to continue as Farmer or User (Business).
 */
export default function RoleChoiceModal() {
  const { roleChoiceOpen, closeRoleChoice, enterGuestMode } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeRoleChoice();
  }, [closeRoleChoice]);

  useEffect(() => {
    if (roleChoiceOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [roleChoiceOpen, handleKeyDown]);

  if (!roleChoiceOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
        onClick={closeRoleChoice}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-navy-100 overflow-hidden">
        {/* Close button */}
        <button
          onClick={closeRoleChoice}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition z-10"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-8 pt-8 pb-10 text-center">
          <h2 className="text-xl font-bold text-white mb-1">{t('howWouldYouLikeToContinue')}</h2>
          <p className="text-sm text-navy-300">
            {t('chooseExperience')}
          </p>
        </div>

        {/* Options */}
        <div className="px-8 pt-8 pb-8 grid grid-cols-2 gap-4">
          <button
            onClick={() => { enterGuestMode('farmer'); navigate('/farmer'); }}
            className="group bg-white rounded-2xl p-6 border-2 border-navy-100 shadow-sm hover:border-mustard-400 hover:shadow-lg transition-all text-center"
          >
            <span className="text-4xl block mb-3">👨‍🌾</span>
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('continueAsFarmer')}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t('guestFarmerDesc')}</p>
          </button>

          <button
            onClick={() => { enterGuestMode('business'); navigate('/business'); }}
            className="group bg-white rounded-2xl p-6 border-2 border-navy-100 shadow-sm hover:border-mustard-400 hover:shadow-lg transition-all text-center"
          >
            <span className="text-4xl block mb-3">🛒</span>
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('continueAsBusiness')}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t('guestBusinessDesc')}</p>
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 -mt-2 text-center">
          <p className="text-xs text-gray-400">
            {t('signInLaterNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
