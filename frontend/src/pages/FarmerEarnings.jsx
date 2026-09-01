import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { earningsData } from '../data/mockData';
import { Wallet, TrendingUp, ArrowUpRight, Banknote } from 'lucide-react';

export default function FarmerEarnings() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Earnings</h1>
            <p className="text-navy-500 mt-1">Track your revenue and payouts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard icon={<Wallet className="w-5 h-5" />} label="This Month" value="₹42,500" change="+8.5%" changeType="up" color="primary" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Last Month" value="₹39,200" change="+5.2%" changeType="up" color="blue" />
            <StatCard icon={<Banknote className="w-5 h-5" />} label="Total Earnings" value="₹2,45,000" change="+32%" changeType="up" color="emerald" />
          </div>

          <PriceChart
            data={earningsData}
            dataKeys={[
              { name: 'month', xKey: 'month' },
              { name: 'amount', label: 'Earnings (₹)' },
            ]}
            title="Monthly Earnings"
            colors={['#0f2a4a']}
            height={300}
          />

          {/* Recent Payouts */}
          <div className="mt-6 bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-navy-700">Recent Payouts</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { order: 'AG1018', amount: 32500, date: 'Aug 22, 2026', buyer: 'GreenBasket' },
                { order: 'AG1012', amount: 18000, date: 'Aug 15, 2026', buyer: 'CityFresh Retail' },
                { order: 'AG1008', amount: 24000, date: 'Aug 8, 2026', buyer: 'FreshMart Wholesale' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-200">
                      <ArrowUpRight className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">Order #{p.order}</p>
                      <p className="text-xs text-navy-500">{p.buyer} • {p.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary-600">+₹{p.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
