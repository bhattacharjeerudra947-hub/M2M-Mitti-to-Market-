import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import FarmerCard from '../components/FarmerCard';
import { Search } from 'lucide-react';
import { apiGet } from '../api';

export default function FindFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet('/api/users/farmers')
      .then((data) => {
        // Adapt backend user data to FarmerCard expected format
        const adapted = (data || []).map((u) => ({
          id: u.id,
          name: u.name,
          location: u.location || 'India',
          distance: Math.floor(Math.random() * 200) + 5,
          rating: (u.rating || 4.5).toFixed(1),
          produce: u.organizationName || 'Farmer',
          experience: 'Verified',
          verified: u.verified !== false,
        }));
        setFarmers(adapted);
      })
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = farmers.filter(
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

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading farmers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No farmers found.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((farmer) => (
                <FarmerCard key={farmer.id} farmer={farmer} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
