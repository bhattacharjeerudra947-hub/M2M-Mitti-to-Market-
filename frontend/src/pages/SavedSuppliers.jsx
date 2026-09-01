import Sidebar from '../components/Sidebar';
import FarmerCard from '../components/FarmerCard';
import { savedSuppliers } from '../data/mockData';
import { Heart } from 'lucide-react';

export default function SavedSuppliers() {
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Saved Suppliers</h1>
            <p className="text-gray-500 mt-1">Your bookmarked farmers and FPOs</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {savedSuppliers.map((supplier) => (
              <FarmerCard key={supplier.id} farmer={supplier} actionLabel="Message" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
