import { useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import FarmerPublicProfileModal from './FarmerPublicProfileModal';

export default function FarmerCard({ farmer, onViewProfile }) {
  const [modalOpen, setModalOpen] = useState(false);

  const photoUrl = farmer.profilePhotoUrl || farmer.farmerProfilePhotoUrl;

  const handleOpen = () => {
    if (onViewProfile) {
      onViewProfile(farmer.id);
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={farmer.name}
                className="w-12 h-12 rounded-xl object-cover border border-navy-100 shadow-2xs bg-white"
              />
            ) : (
              <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center text-lg font-bold text-navy-700 shadow-2xs">
                {farmer.name ? farmer.name.charAt(0).toUpperCase() : '👨‍🌾'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <h3 className="text-sm font-bold text-navy-900 truncate">{farmer.name}</h3>
              <VerificationBadge
                status={farmer.verificationStatus}
                verified={farmer.verified}
                className="text-[10px] py-0 px-2"
              />
            </div>
            <p className="text-xs text-navy-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{farmer.location || 'India'}</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-navy-500">
              <span className="flex items-center gap-1 font-semibold text-gray-800">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {farmer.rating && farmer.rating !== 'New' ? farmer.rating : '4.5'}
              </span>
              <span className="truncate text-gray-600">{farmer.crops || farmer.produce || 'Produce'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-navy-50 flex gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="flex-1 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition text-center"
          >
            View Profile
          </button>
        </div>
      </div>

      <FarmerPublicProfileModal
        farmerId={farmer.id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
