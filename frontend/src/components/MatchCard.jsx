import { useState } from 'react';
import { ArrowDown, Check, Sparkles, Building2, Calendar, MapPin, CheckCircle2, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

const CROP_EMOJIS = {
  mango: '🥭',
  potato: '🥔',
  tomato: '🍅',
  onion: '🧅',
  wheat: '🌾',
  rice: '🌾',
  banana: '🍌',
  apple: '🍎',
  corn: '🌽',
  carrot: '🥕',
  cabbage: '🥬',
  default: '📦'
};

function getCropEmoji(name) {
  if (!name) return CROP_EMOJIS.default;
  const lower = name.toLowerCase();
  for (const [k, emoji] of Object.entries(CROP_EMOJIS)) {
    if (lower.includes(k)) return emoji;
  }
  return CROP_EMOJIS.default;
}

export default function MatchCard({ match, onStartDeal, onViewBuyer, onSkip, isStarting }) {
  const { produce, requirement, buyer, matchScore, matchReasons, status, id } = match;
  const cropEmoji = getCropEmoji(produce?.name);

  const isDiscussion = status === 'DEAL_STARTED' || status === 'NEGOTIATING';
  const isLocked = status === 'DEAL_LOCKED';
  const isCompleted = status === 'COMPLETED';

  // Extract checklist items
  const reasons = Array.isArray(matchReasons) && matchReasons.length > 0
    ? matchReasons
    : [
        '✓ Crop compatible',
        '✓ Quantity compatible',
        '✓ Price compatible',
        '✓ Location compatible',
        '✓ Availability timeframe compatible'
      ];

  return (
    <div className="bg-white rounded-3xl border-2 border-navy-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between">
      {/* Top Banner: MATCH FOUND or STATUS */}
      <div className={`px-5 py-3 text-center text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 ${
        isLocked
          ? 'bg-blue-600 text-white'
          : isDiscussion
          ? 'bg-amber-500 text-white'
          : isCompleted
          ? 'bg-emerald-600 text-white'
          : 'bg-gradient-to-r from-navy-900 via-primary-900 to-navy-900 text-mustard-300'
      }`}>
        <Sparkles className="w-4 h-4 text-mustard-400" />
        {isLocked ? '🔒 DEAL LOCKED' : isDiscussion ? '💬 DEAL DISCUSSION ACTIVE' : isCompleted ? '✅ DEAL COMPLETED' : '🎉 MATCH FOUND'}
      </div>

      <div className="p-6 flex-1 flex flex-col items-center text-center">
        {/* Farmer Produce Info */}
        <div className="w-full bg-mustard-50/40 rounded-2xl p-4 border border-mustard-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            {match.farmer?.profilePhotoUrl && (
              <img
                src={match.farmer.profilePhotoUrl}
                alt={match.farmer.name || 'Farmer'}
                className="w-8 h-8 rounded-full object-cover border border-mustard-300 shadow-2xs"
              />
            )}
            <span className="text-4xl block">{cropEmoji}</span>
          </div>
          <h4 className="text-base font-extrabold text-navy-950 uppercase tracking-wide">
            {produce?.name || 'Produce'}
          </h4>
          <p className="text-sm font-bold text-primary-700 mt-1">
            {produce?.quantity} {produce?.unit || 'kg'} available
          </p>
          <p className="text-base font-black text-navy-900 mt-0.5">
            ₹{produce?.pricePerUnit}/{produce?.unit || 'kg'}
          </p>
          {produce?.readyDate && (
            <p className="text-xs text-navy-600 mt-1 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-navy-400" /> Ready: {produce.readyDate}
            </p>
          )}
        </div>

        {/* Downward Transition Indicator */}
        <div className="my-3 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center shadow-inner">
            <ArrowDown className="w-5 h-5 text-navy-700" />
          </div>
        </div>

        {/* Matched Buyer Info */}
        <div className="w-full bg-navy-50/50 rounded-2xl p-4 border border-navy-100">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            {buyer?.profilePhotoUrl ? (
              <img
                src={buyer.profilePhotoUrl}
                alt={buyer.name}
                className="w-8 h-8 rounded-full object-cover border border-navy-200 shadow-2xs"
              />
            ) : (
              <Building2 className="w-4 h-4 text-navy-700" />
            )}
            <h5 className="text-base font-bold text-navy-900">{buyer?.name || 'Bulk Buyer'}</h5>
          </div>

          {buyer?.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Business
            </span>
          )}

          <div className="space-y-1 text-xs text-navy-700">
            <p className="font-semibold text-navy-900">
              Wants: <span className="font-extrabold">{requirement?.quantity} {requirement?.unit || 'kg'}</span>
            </p>
            <p className="font-medium text-navy-600">
              Budget: <span className="font-bold text-navy-900">
                {requirement?.minPrice && requirement?.maxPrice
                  ? `₹${requirement.minPrice}–₹${requirement.maxPrice}/${requirement.unit || 'kg'}`
                  : requirement?.maxPrice
                  ? `up to ₹${requirement.maxPrice}/${requirement.unit || 'kg'}`
                  : 'Negotiable'}
              </span>
            </p>
            {requirement?.deliveryLocation && (
              <p className="flex items-center justify-center gap-1 text-navy-500">
                <MapPin className="w-3 h-3 text-navy-400" /> {requirement.deliveryLocation}
              </p>
            )}
            {requirement?.requiredBy && (
              <p className="flex items-center justify-center gap-1 text-navy-500">
                <Calendar className="w-3 h-3 text-navy-400" /> Required by: {requirement.requiredBy}
              </p>
            )}
          </div>
        </div>

        {/* AI Match Score Badge */}
        <div className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-mustard-500 text-navy-950 font-black text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 fill-navy-950" />
          ⭐ {matchScore}% AI MATCH
        </div>

        {/* Checklist Explanation */}
        <div className="mt-3.5 w-full bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-left">
          <p className="text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1.5">Why this match?</p>
          <ul className="space-y-1 text-xs text-navy-700">
            {reasons.slice(0, 5).map((r, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className={r.startsWith('✓') ? 'text-emerald-600 font-bold' : r.startsWith('⚠') ? 'text-amber-600 font-bold' : 'text-gray-400'}>
                  {r.startsWith('✓') || r.startsWith('⚠') || r.startsWith('✗') ? r.charAt(0) : '✓'}
                </span>
                <span className="leading-tight">{r.replace(/^[✓⚠✗]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Buttons — Only Farmer Initiates! */}
      <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
        {isDiscussion ? (
          <button
            onClick={() => onStartDeal(id, true)}
            className="w-full py-3 px-4 bg-navy-900 text-white rounded-xl font-bold text-sm hover:bg-navy-800 transition flex items-center justify-center gap-2 shadow-md shadow-navy-900/10"
          >
            Open Message Centre <ArrowRight className="w-4 h-4 text-mustard-400" />
          </button>
        ) : isLocked ? (
          <button
            onClick={() => onStartDeal(id, true)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-md"
          >
            View Locked Deal <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onStartDeal(id)}
            disabled={isStarting}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-primary-600 text-white rounded-xl font-extrabold text-sm hover:from-emerald-700 hover:to-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initiating Deal...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-mustard-300" />
                START DEAL
              </>
            )}
          </button>
        )}

        <div className="flex gap-2">
          {onViewBuyer && (
            <button
              onClick={() => onViewBuyer(buyer)}
              className="flex-1 py-2 px-3 bg-white text-navy-800 border border-navy-200 rounded-xl font-semibold text-xs hover:bg-gray-100 transition"
            >
              View Buyer
            </button>
          )}

          {!isDiscussion && !isLocked && onSkip && (
            <button
              onClick={() => onSkip(id)}
              className="py-2 px-4 bg-transparent text-gray-500 hover:text-red-600 rounded-xl font-semibold text-xs transition"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
