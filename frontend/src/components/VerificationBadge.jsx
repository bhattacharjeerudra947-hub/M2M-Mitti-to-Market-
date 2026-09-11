import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Standardized Verification Badge across Mitti2Market
 * Displays one of the 4 official states:
 * 1. ○ Unverified
 * 2. ⏳ Verification Pending
 * 3. ✓ Verified
 * 4. ⚠ Verification Lost
 */
export default function VerificationBadge({ status, verified, notes, className = '', showNotes = false }) {
  // Normalize status
  let normStatus = (status || '').toUpperCase();
  if (!normStatus) {
    normStatus = verified ? 'VERIFIED' : 'NOT_VERIFIED';
  }

  if (normStatus === 'APPROVED') normStatus = 'VERIFIED';
  if (normStatus === 'VERIFICATION_LOST') normStatus = 'REJECTED';

  let config = {
    label: 'Unverified',
    symbol: '○',
    icon: HelpCircle,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-200 dark:border-gray-700',
  };

  if (normStatus === 'VERIFIED') {
    config = {
      label: 'Verified',
      symbol: '✓',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    };
  } else if (normStatus === 'PENDING' || normStatus === 'RE_SUBMISSION_REQUESTED') {
    config = {
      label: 'Verification Pending',
      symbol: '⏳',
      icon: Clock,
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
  } else if (normStatus === 'REJECTED') {
    config = {
      label: 'Verification Lost',
      symbol: '⚠',
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      textColor: 'text-red-700 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-800',
    };
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        title={notes || config.label}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      >
        <span className="text-[13px] leading-none">{config.symbol}</span>
        <span>{config.label}</span>
      </span>
      {showNotes && notes && normStatus === 'REJECTED' && (
        <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 italic">
          Reason: {notes}
        </span>
      )}
    </div>
  );
}
