import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Package, RotateCcw, Search, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';

const categoryEmoji = {
  Fruits: '🍎',
  Vegetables: '🥬',
  Spices: '🌶️',
  Grains: '🌾',
  Dairy: '🥛',
};

function formatListedDate(iso) {
  if (!iso) return 'Recently';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function StatusBadge({ status }) {
  if (!status) return null;
  const styles =
    status === 'AVAILABLE'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'LOW_STOCK'
        ? 'bg-amber-50 text-amber-700'
        : status === 'SOLD_OUT'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-red-50 text-red-600';
  const label = status === 'LOW_STOCK' ? 'Low Stock' : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full whitespace-nowrap ${styles}`}>
      {label}
    </span>
  );
}

export default function ExploreMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [produce, setProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet('/api/produce?availableOnly=true')
      .then((data) => {
        if (!cancelled) setProduce(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [attempt]);

  // Derive categories from the actual data (same as the existing marketplace page)
  const categories = ['all', ...new Set(produce.map((p) => p.category).filter(Boolean))];

  const filtered = produce.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.farmerName || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    const matchFilter = activeFilter === 'all' || p.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const handleCardAction = (product) => {
    const role = user?.role?.toLowerCase();
    if (!user) {
      // Send guests to sign in; they'll return to this page after login
      navigate('/login', { state: { from: { pathname: '/marketplace' } } });
    } else if (role === 'business') {
      navigate(`/business/product/${product.id}`);
    } else {
      // Farmers sell on the marketplace — send them to list their own produce
      navigate('/farmer/add-produce');
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="pt-8 sm:pt-12 pb-6 sm:pb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-agri-700/10 border border-agri-500/20 rounded-full mb-4">
              <span className="text-sm">🌿</span>
              <span className="text-[13px] font-medium text-agri-800">Fresh from verified farmers</span>
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-navy-900 leading-tight mb-3">
              Explore Marketplace
            </h1>
            <p className="text-base text-navy-500 max-w-2xl leading-relaxed">
              Discover fresh produce listed directly by farmers and FPOs — no middlemen, fair prices,
              delivered straight from the farm.
            </p>
          </div>

          {/* Search + category filters */}
          <div className="mb-6 space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search produce, category, farmer, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
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
            )}
          </div>

          {/* Error state */}
          {error && !loading && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between gap-3 flex-wrap">
              <span>{error}</span>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {loading ? (
            /* Loading state */
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading marketplace...</p>
            </div>
          ) : !error && produce.length === 0 ? (
            /* Empty state — no listings at all */
            <div className="text-center py-20 bg-white border border-navy-100 rounded-2xl">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">Nothing listed yet</p>
              <p className="text-sm text-gray-500 mt-1">Farmers haven't added any produce yet. Check back soon!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{filtered.length} listing{filtered.length === 1 ? '' : 's'} available</p>

              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition overflow-hidden group flex flex-col"
                    >
                      {/* Image / visual */}
                      <div className="relative h-40 bg-gradient-to-br from-mustard-50 via-white to-agri-50 shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl drop-shadow-sm">{categoryEmoji[product.category] || '📦'}</span>
                          </div>
                        )}
                        <div className="absolute top-2.5 right-2.5">
                          <StatusBadge status={product.status} />
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5 flex flex-col flex-1">
                        {product.category && (
                          <span className="self-start px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-navy-50 text-navy-700 mb-2">
                            {categoryEmoji[product.category] ? `${categoryEmoji[product.category]} ${product.category}` : product.category}
                          </span>
                        )}

                        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {product.description || 'Fresh produce from a verified farmer'}
                        </p>

                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-2xl font-bold text-navy-900">₹{product.pricePerUnit}</span>
                          <span className="text-sm text-gray-500">/ {product.unit}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                          <span className="font-medium text-gray-700">{product.quantity?.toLocaleString?.() ?? product.quantity}</span> {product.unit} available
                        </p>

                        {/* Seller / location / listed */}
                        <div className="mt-auto pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                          {product.farmerName && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {product.farmerName.charAt(0)}
                              </span>
                              <span className="truncate">
                                by <span className="font-medium text-gray-700">{product.farmerName}</span>
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{product.location || 'India'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 shrink-0">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {formatListedDate(product.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/50 shrink-0">
                        <button
                          onClick={() => handleCardAction(product)}
                          className="w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
                        >
                          {!user
                            ? 'Sign in to View Details'
                            : user.role?.toLowerCase() === 'business'
                              ? 'View Details'
                              : 'List Your Produce'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* No results for current search/filters */
                <div className="text-center py-20 bg-white border border-navy-100 rounded-2xl">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 text-lg font-semibold">No listings found matching your search.</p>
                  <button
                    onClick={() => { setSearch(''); setActiveFilter('all'); }}
                    className="mt-4 text-navy-700 text-sm font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <Footer />
    </div>
  );
}
