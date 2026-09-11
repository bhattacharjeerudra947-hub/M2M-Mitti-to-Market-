import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

/* ── Avatar: real photo or initials fallback ─────────────────── */
export function Avatar({ src, name, size = 36 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        width={size}
        height={size}
        className="rounded-full object-cover bg-gray-100 ring-1 ring-gray-200 shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 flex items-center justify-center font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/* ── Status dot: color + text label (never color-only) ───────── */
const STATUS_TONES = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  blue: 'bg-sky-600',
};

export function StatusDot({ tone = 'gray', label }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          STATUS_TONES[tone] || STATUS_TONES.gray
        }`}
      />
      <span className="text-[13px] text-gray-700">{label}</span>
    </span>
  );
}

export function verificationStatusInfo(u) {
  if (u?.verified || u?.verificationStatus === 'VERIFIED') {
    return { tone: 'green', label: 'Verified' };
  }

  const s = (u?.verificationStatus || '').toUpperCase();

  if (
    s === 'PENDING' ||
    s === 'DOCUMENTS_SUBMITTED' ||
    s === 'UNDER_REVIEW'
  ) {
    return { tone: 'amber', label: 'Pending' };
  }

  if (s === 'REJECTED') {
    return { tone: 'red', label: 'Rejected' };
  }

  if (
    s === 'RE_SUBMISSION_REQUESTED' ||
    s === 'RESUBMISSION_REQUIRED'
  ) {
    return { tone: 'blue', label: 'Resubmission requested' };
  }

  return { tone: 'gray', label: 'Verification required' };
}

export function accountStatusInfo(status) {
  switch ((status || 'ACTIVE').toUpperCase()) {
    case 'ACTIVE':
      return { tone: 'green', label: 'Active' };

    case 'SUSPENDED':
      return { tone: 'amber', label: 'Suspended' };

    case 'DEACTIVATED':
      return { tone: 'red', label: 'Deactivated' };

    default:
      return {
        tone: 'gray',
        label: status || 'Unknown',
      };
  }
}

export function genericStatusInfo(status) {
  const s = (status || '').toUpperCase();

  if (
    [
      'OPEN',
      'NEW',
      'PENDING',
      'LOCK_PENDING',
      'NEGOTIATING',
      'AVAILABLE',
    ].includes(s)
  ) {
    return {
      tone: 'amber',
      label: s,
    };
  }

  if (
    [
      'UNDER_REVIEW',
      'REVIEWING',
      'IN_PROGRESS',
      'LOCKED',
      'LOGISTICS_PENDING',
      'LOGISTICS_ASSIGNED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'PARTIALLY_SOLD',
      'PARTIALLY_FULFILLED',
      'LOW_STOCK',
      'ESCALATED',
    ].includes(s)
  ) {
    return {
      tone: 'blue',
      label: s,
    };
  }

  if (
    [
      'RESOLVED',
      'COMPLETED',
      'VERIFIED',
      'DELIVERED',
      'DELIVERY_CONFIRMED',
    ].includes(s)
  ) {
    return {
      tone: 'green',
      label: s,
    };
  }

  if (
    [
      'DISMISSED',
      'CANCELLED',
      'REJECTED',
      'SUSPENDED',
      'REMOVED',
      'DEACTIVATED',
    ].includes(s)
  ) {
    return {
      tone: 'red',
      label: s,
    };
  }

  return {
    tone: 'gray',
    label: s || '—',
  };
}

/* ── Metric strip block ───────────────────────────────────────── */
export function Metric({ label, value, context, onClick }) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={`text-left px-4 py-3 ${
        onClick
          ? 'hover:bg-gray-50 transition-colors w-full cursor-pointer'
          : ''
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-0.5 text-2xl leading-7 font-semibold text-gray-900 tabular-nums">
        {value ?? '—'}
      </p>

      {context && (
        <p className="mt-0.5 text-xs text-gray-500">
          {context}
        </p>
      )}
    </Comp>
  );
}

export function MetricStrip({ metrics = [] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200 overflow-hidden">
      {metrics.map((m) => (
        <Metric key={m.label} {...m} />
      ))}
    </div>
  );
}

/* ── Table scaffold ───────────────────────────────────────────── */
export function Table({ columns = [], children, footer }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap ${
                    c.align === 'right' ? 'text-right' : ''
                  }`}
                  style={{ width: c.width }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {children}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}

export function Td({
  children,
  className = '',
  colSpan,
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 text-[13px] text-gray-700 align-middle ${className}`}
    >
      {children}
    </td>
  );
}

/* ── Skeleton rows ───────────────────────────────────────────────
   Renders <tr>s inside the Table component's <tbody>.
──────────────────────────────────────────────────────────────── */
export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td
              key={c}
              className="px-4 py-3.5"
            >
              <div
                className="h-3.5 rounded bg-gray-100 animate-pulse"
                style={{
                  width:
                    c === 0
                      ? '60%'
                      : `${45 + ((r * 7 + c * 13) % 35)}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
export function EmptyState({
  title = 'No results found',
  hint,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Inbox
        className="h-8 w-8 text-gray-300 mb-3"
        strokeWidth={1.5}
      />

      <p className="text-sm font-medium text-gray-700">
        {title}
      </p>

      {hint && (
        <p className="mt-1 text-[13px] text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── Error state ──────────────────────────────────────────────── */
export function ErrorState({
  message = 'Unable to load data',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <AlertCircle
        className="h-8 w-8 text-red-300 mb-3"
        strokeWidth={1.5}
      />

      <p className="text-sm font-medium text-gray-700">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ── Confirmation dialog ─────────────────────────────────────── */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive = false,
  requireReason = false,
  reasonPlaceholder,
  busy = false,
  error,
  onCancel,
  onConfirm,
  onReasonChange,
  reason = '',
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-950/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-xl">
        <div className="px-6 pt-5 pb-1">
          <h3 className="text-[15px] font-semibold text-gray-900">
            {title}
          </h3>

          {body && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
              {body}
            </p>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {requireReason && (
          <div className="px-6 mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reason{' '}
              <span className="text-red-500">*</span>
            </label>

            <textarea
              value={reason}
              onChange={(e) =>
                onReasonChange?.(e.target.value)
              }
              rows={3}
              placeholder={
                reasonPlaceholder ||
                'Document the reason for this action…'
              }
              className="w-full text-[13px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={
              busy ||
              (requireReason &&
                (!reason || !reason.trim()))
            }
            className={`px-3.5 py-2 text-[13px] font-medium text-white rounded-lg disabled:opacity-50 ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Right-side drawer ────────────────────────────────────────── */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-xl',
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-gray-950/30"
        onClick={onClose}
      />

      <div
        className={`relative bg-white h-full w-full ${width} border-l border-gray-200 shadow-2xl flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 shrink-0">
          <h3 className="text-[15px] font-semibold text-gray-900">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-gray-200 px-6 py-3.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DrawerSection({
  title,
  children,
}) {
  return (
    <section className="mb-6">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2.5">
        {title}
      </h4>

      {children}
    </section>
  );
}

export function KV({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[13px] text-gray-500 shrink-0">
        {k}
      </span>

      <span className="text-[13px] text-gray-900 text-right font-medium break-all">
        {v ?? '—'}
      </span>
    </div>
  );
}

/* ── Toolbar input styles (shared) ────────────────────────────── */
export const inputCls =
  'text-[13px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';

export const selectCls =
  inputCls + ' pr-8 cursor-pointer';

/* ── Row actions: primary + overflow menu ─────────────────────── */
export function RowActions({ items = [] }) {
  // items: [{ label, onClick, destructive }]
  // First visible item is primary,
  // rest go in the ⋯ menu.
  return <RowActionsInner items={items} />;
}

function RowActionsInner({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDoc);

    return () => {
      document.removeEventListener(
        'mousedown',
        onDoc
      );
    };
  }, []);

  const visible = items.filter(Boolean);
  const [primary, ...rest] = visible;

  if (!primary) return null;

  return (
    <div
      className="flex items-center justify-end gap-1"
      ref={ref}
    >
      <button
        type="button"
        onClick={primary.onClick}
        className="px-2.5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {primary.label}
      </button>

      {rest.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="px-2 py-1.5 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
            aria-label="More actions"
            aria-expanded={open}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle
                cx="3"
                cy="8"
                r="1.4"
              />
              <circle
                cx="8"
                cy="8"
                r="1.4"
              />
              <circle
                cx="13"
                cy="8"
                r="1.4"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              {rest.map((it, index) => (
                <button
                  type="button"
                  key={
                    it.label ||
                    `action-${index}`
                  }
                  onClick={() => {
                    setOpen(false);
                    it.onClick?.();
                  }}
                  className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-gray-50 transition-colors ${
                    it.destructive
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}