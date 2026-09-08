import { useState } from 'react';
import { submitFeedback } from '../services/feedbackApi';

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('GENERAL_FEEDBACK');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await submitFeedback({
      category,
      message: message.trim(),
      rating,
    });

    setLoading(false);

    if (res.ok) {
      setSuccessMsg('Thank you for your feedback! We review all suggestions to improve Mitti2Market.');
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
        setMessage('');
      }, 2000);
    } else {
      setErrorMsg(res.error || 'Failed to submit feedback.');
    }
  };

  return (
    <>
      {/* Floating feedback trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        <span>Feedback</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <span>💡 Platform Feedback & Ideas</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="my-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium border border-emerald-200 dark:border-emerald-800 text-center">
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-medium border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GENERAL_FEEDBACK">General Feedback</option>
                    <option value="FEATURE_SUGGESTION">Feature Suggestion</option>
                    <option value="BUG_REPORT">Bug Report</option>
                    <option value="EXPERIENCE_FEEDBACK">App / Design Experience</option>
                    <option value="MARKETPLACE_FEEDBACK">Marketplace & Trading</option>
                    <option value="LOGISTICS_FEEDBACK">Logistics & Transportation</option>
                    <option value="AI_RECOMMENDATION_FEEDBACK">AI Advisory & Pricing Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How would you rate your overall experience?
                  </label>
                  <div className="flex items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-medium text-gray-500 ml-2">{rating} / 5 Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Feedback / Suggestion
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share what you like or how we can improve..."
                    rows={4}
                    className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
