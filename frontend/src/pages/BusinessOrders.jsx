import Sidebar from '../components/Sidebar';
import OrderTracker from '../components/OrderTracker';
import { businessOrders } from '../data/mockData';
import { ClipboardList } from 'lucide-react';

export default function BusinessOrders() {
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-500 mt-1">Track your purchase orders</p>
          </div>

          <div className="space-y-4">
            {businessOrders.map((order) => (
              <OrderTracker key={order.id} order={order} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
