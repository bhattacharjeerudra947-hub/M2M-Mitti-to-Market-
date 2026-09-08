import { useState } from 'react';
import { submitDealRating } from '../services/ratingApi';

export default function DealRatingModal({ isOpen, onClose, dealId, otherPartyName, onRatingSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await submitDealRating(dealId, rating, comment.trim());
    setLoading(false);

    if (res.ok) {
      setSuccessMsg('Rating submitted! Thank you for rating this transaction.');
      if (onRatingSubmitted) onRatingSubmitted();
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setComment('');
      }, 1800);
    } else {
      setErrorMsg(res.error || 'Failed to submit rating.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <span>⭐ Rate Deal Experience</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        {otherPartyName && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            How was your transaction experience with <span className="font-semibold text-emerald-800 dark:text-emerald-300">{otherPartyName}</span>?
          </p>
        )}

        {successMsg ? (
          <div className="my-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium border border-emerald-200 text-center">
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-medium border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform hover:scale-125 ${
                      star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {rating === 5 && 'Outstanding! 🌟'}
                {rating === 4 && 'Very Good 👍'}
                {rating === 3 && 'Average 👌'}
                {rating === 2 && 'Below Expectations 👎'}
                {rating === 1 && 'Poor ⚠️'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comments & Review (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience regarding payment, product quality, or communication..."
                rows={3}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
