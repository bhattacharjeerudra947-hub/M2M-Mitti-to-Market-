import { useState, useEffect } from 'react';
import { X, MapPin, Sprout, Award, Star, Package, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { getFarmerPublicProfile } from '../services/api';
import VerificationBadge from './VerificationBadge';

export default function FarmerPublicProfileModal({ farmerId, isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !farmerId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    getFarmerPublicProfile(farmerId)
      .then((res) => {
        if (!isMounted) return;
        if (res.ok && res.data) {
          setProfile(res.data);
        } else {
          setError(res.error || 'Failed to load farmer profile');
        }
      })
      .catch(() => {
        if (isMounted) setError('Network error loading farmer profile');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, farmerId]);

  if (!isOpen) return null;

  const ratingSummary = profile?.ratingSummary || { averageRating: 0, totalReviews: 0, ratingDistribution: {} };
  const reviews = profile?.reviews || [];
  const activeProduce = profile?.activeProduce || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-10">
            {/* Farmer Cloudinary Avatar */}
            <div className="relative shrink-0">
              {profile?.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400/80 shadow-md bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20 shadow-md">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : '👨‍🌾'}
                </div>
              )}
              {profile?.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-navy-950 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">{profile?.name || 'Farmer Profile'}</h2>
                <VerificationBadge
                  status={profile?.verificationStatus}
                  verified={profile?.verified}
                  verifiedAt={profile?.verifiedAt}
                  showDate={true}
                />
              </div>

              {/* General Location (privacy-safe, NO exact coords) */}
              <div className="flex items-center gap-2 text-xs text-emerald-300/90 mt-1 flex-wrap">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {[profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ') || 'India'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm text-gray-500 font-medium">Loading farmer information...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-600 font-medium text-sm">
              {error}
            </div>
          ) : profile ? (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-amber-500 font-extrabold text-lg">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{ratingSummary.averageRating > 0 ? ratingSummary.averageRating.toFixed(1) : 'New'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {ratingSummary.totalReviews} {ratingSummary.totalReviews === 1 ? 'deal review' : 'deal reviews'}
                  </div>
                </div>

                <div className="border-x border-gray-200">
                  <div className="text-lg font-extrabold text-navy-900">
                    {profile.completedDealsCount || 0}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">Deals Completed</div>
                </div>

                <div>
                  <div className="text-lg font-extrabold text-emerald-700">
                    {activeProduce.length}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">Active Listings</div>
                </div>
              </div>

              {/* Farm Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600" /> Farm Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div>
                    <span className="text-gray-500 block">Farming Category</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {profile.farmerCategory ? profile.farmerCategory.replace('_', ' ').toLowerCase() : 'Independent Farmer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Farming Season</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {profile.farmingSeason ? profile.farmingSeason.toLowerCase() : 'Multi-Season'}
                    </span>
                  </div>
                  {profile.landAreaAcres ? (
                    <div>
                      <span className="text-gray-500 block">Land Area</span>
                      <span className="font-semibold text-gray-900">{profile.landAreaAcres} Acres</span>
                    </div>
                  ) : null}
                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-emerald-100">
                    <span className="text-gray-500 block">Primary Crops Grown</span>
                    <span className="font-semibold text-gray-900">
                      {profile.crops || 'Various Seasonal Produce'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Produce Listings */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-navy-700" /> Available Produce ({activeProduce.length})
                </h3>

                {activeProduce.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 italic">No active produce listed right now.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeProduce.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition shadow-2xs flex items-center gap-3"
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-50"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-lg font-bold">
                            🌾
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{p.name}</h4>
                          <p className="text-[11px] text-gray-500 capitalize">{p.category || 'Produce'}</p>
                          <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                            ₹{p.pricePerUnit} <span className="text-[10px] text-gray-500 font-normal">/ {p.unit}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0 text-xs">
                          <span className="text-gray-500 block text-[10px]">Stock</span>
                          <span className="font-bold text-navy-900">{p.quantity} {p.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transaction Ratings & Reviews */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Transaction Reviews ({reviews.length})
                  </h3>
                  {ratingSummary.totalReviews > 0 && (
                    <span className="text-xs font-semibold text-gray-600">
                      Average {ratingSummary.averageRating.toFixed(1)} / 5.0
                    </span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-500">
                    No transaction reviews yet. Reviews are submitted by verified businesses after completing deals.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{rev.reviewerName || 'Verified Business'}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            {rev.createdAt && (
                              <span className="text-[10px] text-gray-400 ml-1.5">
                                {new Date(rev.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-gray-700 text-xs leading-relaxed italic">
                            "{rev.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-xl text-xs transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
