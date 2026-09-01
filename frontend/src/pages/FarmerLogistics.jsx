import Sidebar from '../components/Sidebar';
import DeliveryStatus from '../components/DeliveryStatus';
import { logisticsData } from '../data/mockData';
import { Truck, MapPin, Clock, Brain } from 'lucide-react';

export default function FarmerLogistics() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Logistics</h1>
            <p className="text-navy-500 mt-1">Track your deliveries and routes</p>
          </div>

          {/* AI Optimized Route Card */}
          <div className="bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-navy-900 rounded-xl flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-navy-800">AI Optimized Route</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-mustard-100">
                <MapPin className="w-5 h-5 text-navy-600 mb-2" />
                <p className="text-xs text-navy-500">Pickup</p>
                <p className="text-sm font-semibold text-navy-900">Nashik Farm Collection</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-mustard-100">
                <Truck className="w-5 h-5 text-navy-600 mb-2" />
                <p className="text-xs text-navy-500">Distance</p>
                <p className="text-sm font-semibold text-navy-900">165 km via NH3</p>
                <p className="text-xs text-primary-600 mt-1">Saves ₹400 vs alternate route</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-mustard-100">
                <Clock className="w-5 h-5 text-navy-600 mb-2" />
                <p className="text-xs text-navy-500">Estimated Time</p>
                <p className="text-sm font-semibold text-navy-900">3 hours 45 min</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {logisticsData.map((delivery) => (
              <DeliveryStatus key={delivery.id} delivery={delivery} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
