import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, SlidersHorizontal, X, Package } from 'lucide-react';
import { apiGet } from '../api';

const categoryEmoji = {
  Fruits: '🍎',
  Vegetables: '🥬',
  Spices: '🌶️',
  Grains: '🌾',
  Dairy: '🥛',
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [allProduce, setAllProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    apiGet('/api/produce?availableOnly=true')
      .then((data) => setAllProduce(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Derive categories from actual data
  const categories = ['all', ...new Set(allProduce.map((p) => p.category).filter(Boolean))];

  const filtered = allProduce.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.farmerName || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    const matchFilter = activeFilter === 'all' || p.category === activeFilter;
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
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${
                    activeFilter === cat
                      ? 'bg-navy-900 text-white'
                      : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'
                  }`}
                >
                  {cat === 'all' ? 'All' : `${categoryEmoji[cat] || ''} ${cat}`}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading marketplace...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{filtered.length} products found</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition overflow-hidden group"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-4xl">{categoryEmoji[product.category] || '📦'}</span>
                        {product.status && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            product.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' :
                            product.status === 'LOW_STOCK' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {product.status === 'LOW_STOCK' ? 'Low Stock' : product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description || 'Fresh produce from verified farmer'}</p>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-bold text-navy-900">₹{product.pricePerUnit}</span>
                        <span className="text-sm text-gray-500">/ {product.unit}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="font-medium text-gray-700">{product.quantity.toLocaleString()} {product.unit} available</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5">📍</span>
                          {product.location || 'India'}
                        </span>
                        {product.farmerName && <span>by {product.farmerName}</span>}
                      </div>
                    </div>

                    <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/50">
                      <button
                        onClick={() => navigate(`/business/product/${product.id}`)}
                        className="w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No produce found matching your search.</p>
                  <button onClick={() => { setSearch(''); setActiveFilter('all'); }} className="mt-4 text-navy-700 text-sm font-semibold hover:underline">
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
