import Sidebar from '../components/Sidebar';
import BuyerCard from '../components/BuyerCard';
import { buyerRequests } from '../data/mockData';
import { ShoppingCart, Filter } from 'lucide-react';

export default function BuyerRequests() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Buyer Requests</h1>
              <p className="text-navy-500 mt-1">{buyerRequests.length} offers from verified buyers</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-navy-200 text-navy-600 text-sm font-medium rounded-xl hover:bg-mustard-50 transition">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {buyerRequests.map((req) => (
              <BuyerCard
                key={req.id}
                request={req}
                onViewOffer={() => {}}
                onAccept={() => {}}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
