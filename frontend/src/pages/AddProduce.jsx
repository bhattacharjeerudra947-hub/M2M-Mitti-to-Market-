import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Upload, MapPin, Calendar, Package } from 'lucide-react';

export default function AddProduce() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
          <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Produce Listed Successfully!</h2>
              <p className="text-navy-500 mb-6">Your produce is now visible to verified buyers.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition"
              >
                Add Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-navy-900 mb-1">Add Produce</h1>
          <p className="text-navy-500 mb-8">List your produce for buyers to discover</p>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-sm">
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
              {/* Produce Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Produce Name</label>
                <input
                  type="text"
                  placeholder="e.g., Tomato, Onion, Potato"
                  className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                />
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      placeholder="1000"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition appearance-none">
                    <option>kg</option>
                    <option>quintal</option>
                    <option>tonne</option>
                    <option>dozen</option>
                    <option>piece</option>
                  </select>
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Grade</label>
                <div className="flex gap-3">
                  {['A', 'B', 'C'].map((g) => (
                    <label key={g} className="flex-1">
                      <input type="radio" name="grade" value={g} className="peer sr-only" defaultChecked={g === 'A'} />
                      <div className="py-3 text-center text-sm font-semibold border-2 border-gray-200 rounded-xl cursor-pointer peer-checked:border-navy-800 peer-checked:bg-mustard-50 peer-checked:text-navy-900 transition">
                        Grade {g}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Harvest Date + Expected Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Harvest Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Selling Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                  />
                </div>
              </div>

              {/* Expected Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Price (₹/kg)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    placeholder="29"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nashik, Maharashtra"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows="3"
                  placeholder="Describe your produce quality, growing conditions, etc."
                  className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition resize-none"
                />
              </div>

              {/* Upload Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Image</label>
                <div className="border-2 border-dashed border-navy-200 rounded-xl p-8 text-center hover:border-mustard-400 transition cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    <span className="text-navy-700 font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
              >
                List Produce
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
