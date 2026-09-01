import Sidebar from '../components/Sidebar';
import FarmerCard from '../components/FarmerCard';
import { savedSuppliers, marketProduce } from '../data/mockData';
import { Search } from 'lucide-react';
import { useState } from 'react';

const allFarmers = [
  ...savedSuppliers,
  { id: 5, name: 'Arun Shinde', location: 'Ratnagiri', rating: 4.9, produce: 'Mango', verified: true },
  { id: 6, name: 'Anil Jadhav', location: 'Kolhapur', rating: 4.6, produce: 'Rice, Sugarcane', verified: true },
  { id: 7, name: 'Prakash Reddy', location: 'Guntur', rating: 4.7, produce: 'Chili', verified: true },
  { id: 8, name: 'Harpreet Singh', location: 'Ludhiana', rating: 4.4, produce: 'Wheat', verified: true },
];

export default function FindFarmers() {
  const [search, setSearch] = useState('');

  const filtered = allFarmers.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) ||
           f.location.toLowerCase().includes(search.toLowerCase()) ||
           f.produce.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Find Farmers</h1>
            <p className="text-gray-500 mt-1">Discover and connect with verified farmers and FPOs</p>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, location, or crop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((farmer) => (
              <FarmerCard key={farmer.id} farmer={farmer} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
