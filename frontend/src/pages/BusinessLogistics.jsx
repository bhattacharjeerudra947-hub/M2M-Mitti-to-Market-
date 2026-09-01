import Sidebar from '../components/Sidebar';
import DeliveryStatus from '../components/DeliveryStatus';
import { businessLogisticsData } from '../data/mockData';
import { Truck, Filter } from 'lucide-react';

export default function BusinessLogistics() {
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Logistics</h1>
              <p className="text-gray-500 mt-1">Track all your incoming deliveries</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'In Transit', value: '3', color: 'bg-blue-50 text-blue-700' },
              { label: 'Pending Pickup', value: '1', color: 'bg-amber-50 text-amber-700' },
              { label: 'Delivered Today', value: '2', color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Total Active', value: '4', color: 'bg-gray-50 text-gray-700' },
            ].map((s, i) => (
              <div key={i} className={`p-4 rounded-xl ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {businessLogisticsData.map((delivery) => (
              <DeliveryStatus key={delivery.id} delivery={delivery} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
