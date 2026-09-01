import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProductCard from '../components/ProductCard';
import { marketProduce } from '../data/mockData';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Tomato', value: 'tomato' },
  { label: 'Onion', value: 'onion' },
  { label: 'Potato', value: 'potato' },
  { label: 'Grapes', value: 'grapes' },
  { label: 'Rice', value: 'rice' },
  { label: 'Mango', value: 'mango' },
  { label: 'Chili', value: 'chili' },
  { label: 'Wheat', value: 'wheat' },
];

export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = marketProduce.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.location.toLowerCase().includes(search.toLowerCase()) ||
                        p.farmer.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' || p.name.toLowerCase() === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Browse Produce</h1>
            <p className="text-navy-500 mt-1">Discover fresh produce directly from verified farmers</p>
          </div>

          {/* Search + Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for produce, location, or farmer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                  showFilters ? 'bg-mustard-50 border-mustard-300 text-navy-800' : 'bg-white border-navy-200 text-navy-600 hover:bg-mustard-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${
                    activeFilter === f.value
                      ? 'bg-navy-900 text-white'
                      : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Min Price</label>
                    <input type="number" placeholder="₹0" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Price</label>
                    <input type="number" placeholder="₹200" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Quality</label>
                    <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>Any</option>
                      <option>Grade A</option>
                      <option>Grade B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Distance</label>
                    <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>Any</option>
                      <option>25 km</option>
                      <option>50 km</option>
                      <option>100 km</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-4">{filtered.length} products found</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                actionLabel="View Details"
                onAction={() => navigate(`/business/product/${product.id}`)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No produce found matching your search.</p>
              <button onClick={() => { setSearch(''); setActiveFilter('all'); }} className="mt-4 text-navy-700 text-sm font-semibold hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
