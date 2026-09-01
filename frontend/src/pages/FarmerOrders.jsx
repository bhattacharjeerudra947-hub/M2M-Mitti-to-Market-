import Sidebar from '../components/Sidebar';
import OrderTracker from '../components/OrderTracker';
import { orders } from '../data/mockData';
import { ClipboardList } from 'lucide-react';

export default function FarmerOrders() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">My Orders</h1>
            <p className="text-navy-500 mt-1">Track your active and past orders</p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <OrderTracker key={order.id} order={order} />
            ))}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-20">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet. Start by listing your produce!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
