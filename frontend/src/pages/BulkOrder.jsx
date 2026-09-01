import Sidebar from '../components/Sidebar';
import FarmerCard from '../components/FarmerCard';
import { savedSuppliers, marketProduce } from '../data/mockData';
import { FileText, MapPin, Calendar, Package, Search } from 'lucide-react';

export default function BulkOrder() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Bulk Order</h1>
            <p className="text-navy-500 mt-1">Request large quantities directly from farmers</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-9 h-9 bg-mustard-50 rounded-xl flex items-center justify-center border border-mustard-200">
                    <FileText className="w-5 h-5 text-navy-700" />
                  </div>
                  <h2 className="text-lg font-bold text-navy-900">Bulk Order Request</h2>
                </div>

                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product</label>
                    <select                    className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition appearance-none">
                      {marketProduce.map((p) => (
                        <option key={p.id} value={p.name}>{p.emoji} {p.name} — ₹{p.price}/kg</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Quantity (kg)</label>
                      <div className="relative">
                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          placeholder="5000"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Price (₹/kg)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                        <input
                          type="number"
                          placeholder="26"
                          className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Required By</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Grade</label>
                      <select                    className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition appearance-none">
                        <option>Grade A</option>
                        <option>Grade B</option>
                        <option>Any</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="FreshMart Warehouse, Andheri West, Mumbai"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
                    <textarea
                      rows="3"
                      placeholder="Any special requirements..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
                  >
                    Send Bulk Request
                  </button>
                </form>
              </div>
            </div>

            {/* Matching Farmers */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-navy-700 mb-4">Matching Farmers / FPOs</h3>
              <div className="space-y-3">
                {savedSuppliers.map((s) => (
                  <FarmerCard
                    key={s.id}
                    farmer={{ ...s, produce: s.produce }}
                    actionLabel="Send Request"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
