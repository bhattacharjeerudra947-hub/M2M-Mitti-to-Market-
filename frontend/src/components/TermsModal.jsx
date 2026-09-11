import { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle, FileText, Lock, Scale, Printer, ExternalLink } from 'lucide-react';
import { FARMER_TERMS, BUSINESS_TERMS, TERMS_LAST_UPDATED, TERMS_VERSION } from '../data/termsAndConditions';

export default function TermsModal({ isOpen, onClose, role = 'farmer', onAccept }) {
  const isFarmer = role !== 'business';
  const [activeSection, setActiveSection] = useState('rules');

  useEffect(() => {
    setActiveSection('rules');
  }, [role, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTerms = isFarmer ? FARMER_TERMS : BUSINESS_TERMS;

  const handleAccept = () => {
    if (onAccept) onAccept(isFarmer ? 'farmer' : 'business');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-navy-900 to-navy-950 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-mustard-400 text-navy-950">
                Official Policy
              </span>
              <span className="text-xs text-gray-300 font-mono">
                {TERMS_VERSION} • Updated {TERMS_LAST_UPDATED}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-mustard-400" />
              {isFarmer ? 'Terms & Conditions' : 'Business Buyer Terms & Governance'}
            </h2>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
              {isFarmer
                ? 'Binding rules governing direct trade, document verification, privacy, and escrow payments.'
                : 'Commercial sourcing compliance, statutory enterprise verification, escrow commitments, and dispute resolution.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition shrink-0"
            aria-label="Close Terms modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights Bar */}
        <div className="bg-amber-50/60 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto shrink-0 text-xs">
          <div className="flex items-center gap-2 shrink-0 font-semibold text-amber-900">
            <span>Key Safeguards:</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentTerms.summaryBadges.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200 text-gray-700 text-[11px] font-medium shadow-2xs"
              >
                <span>{badge.icon}</span> {badge.label}
              </span>
            ))}
          </div>
        </div>

        {/* Section Jump Nav */}
        <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-1 overflow-x-auto text-xs shrink-0">
          <span className="text-gray-400 font-medium text-[11px] mr-2 shrink-0">Sections:</span>
          {currentTerms.sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                document.getElementById(`sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                activeSection === sec.id
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {sec.title}
            </button>
          ))}
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-gray-700 text-xs sm:text-sm leading-relaxed">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-navy-950 flex items-center gap-2">
              <FileText className="w-4 h-4 text-mustard-600" />
              Summary Overview for {isFarmer ? 'Farmers' : 'Commercial Businesses'}
            </h4>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {currentTerms.summaryPoints.map((pt, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200/80 text-xs">
                  <p className="font-bold text-gray-900 mb-1">{pt.category}</p>
                  <p className="text-gray-600 leading-relaxed text-[11px]">{pt.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Clauses */}
          {currentTerms.sections.map((sec) => (
            <div key={sec.id} id={`sec-${sec.id}`} className="space-y-4 pt-2 border-t border-gray-100 first:border-0 first:pt-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                {sec.id === 'rules' && <Scale className="w-5 h-5 text-mustard-600" />}
                {sec.id === 'responsibilities' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                {sec.id === 'verification' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                {sec.id === 'privacy' && <Lock className="w-5 h-5 text-purple-600" />}
                {sec.id === 'usage' && <FileText className="w-5 h-5 text-navy-600" />}
                {sec.title}
              </h3>

              <div className="space-y-3.5 pl-2">
                {sec.clauses.map((clause, cIdx) => (
                  <div key={cIdx} className="space-y-1">
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900">
                      {clause.heading}
                    </h5>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {clause.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-gray-500 text-center sm:text-left">
            By proceeding, you agree that your electronic acceptance constitutes a legally binding commitment under the Information Technology Act, 2000.
          </p>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-2xs"
            >
              Close
            </button>
            {onAccept && (
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                I Understand & Accept
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
