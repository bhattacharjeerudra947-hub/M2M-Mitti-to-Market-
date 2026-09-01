import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import PriceAdvisor from '../components/PriceAdvisor';
import NotificationPanel from '../components/NotificationPanel';
import PriceChart from '../components/PriceChart';
import OrderTracker from '../components/OrderTracker';
import { Package, ShoppingCart, Wallet, FileText, Package as Box } from 'lucide-react';
import { priceChartData, orders } from '../data/mockData';

export default function FarmerDashboard() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Good morning, Rajesh 👋</h1>
            <p className="text-navy-500 mt-1">Here's an overview of your marketplace activity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Package className="w-5 h-5" />}
              label="Produce Listed"
              value="1,250 kg"
              change="+12%"
              changeType="up"
              color="primary"
            />
            <StatCard
              icon={<ShoppingCart className="w-5 h-5" />}
              label="Active Orders"
              value="8"
              change="+2"
              changeType="up"
              color="blue"
            />
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              label="This Month's Earnings"
              value="₹42,500"
              change="+8.5%"
              changeType="up"
              color="emerald"
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Buyer Requests"
              value="5"
              change="3 new"
              changeType="up"
              color="accent"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <PriceAdvisor />
            </div>
            <div>
              <NotificationPanel />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <PriceChart
              data={priceChartData}
              dataKeys={[
                { name: 'month', xKey: 'month' },
                { name: 'tomato', label: 'Tomato' },
                { name: 'onion', label: 'Onion' },
              ]}
              title="Price Trends (₹/kg)"
              colors={['#0f2a4a', '#d4a017']}
              height={250}
            />
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Orders</h3>
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderTracker key={order.id} order={order} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
