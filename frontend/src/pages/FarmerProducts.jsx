import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Plus, MapPin, Calendar, Package } from 'lucide-react';
import { farmerProduce } from '../data/mockData';

export default function FarmerProducts() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">My Produce</h1>
              <p className="text-navy-500 mt-1">Manage your listed produce</p>
            </div>
            <Link
              to="/farmer/add-produce"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Produce
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {farmerProduce.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div>
                      <h3 className="text-base font-semibold text-navy-900">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'Available'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    item.grade === 'A' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    Grade {item.grade}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-xl font-bold text-navy-900">₹{item.price}</span>
                  <span className="text-sm text-gray-500">/ {item.unit}</span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {item.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Harvested: {item.harvestDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
