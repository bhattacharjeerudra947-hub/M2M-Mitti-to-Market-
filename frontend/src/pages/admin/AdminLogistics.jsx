import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getAdminLogistics, getAdminLogisticsStats } from '../../api/dealApi';
import {
  Truck, Package, Search, Filter, RefreshCw, Loader2,
  AlertTriangle, CheckCircle, Clock, MapPin, IndianRupee, ExternalLink
} from 'lucide-react';

const STATUS_COLORS = {
  REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKUP_SCHEDULED: 'bg-purple-50 text-purple-700 border-purple-200',
  PICKED_UP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_TRANSIT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700 border-violet-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const fmtINR = (n) => (n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—');
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; }
};

export default function AdminLogistics() {
  const [logistics, setLogistics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        getAdminLogistics(),
        getAdminLogisticsStats().catch(() => null),
      ]);
      setLogistics(Array.isArray(listData) ? listData : []);
      if (statsData) setStats(statsData);
    } catch (e) {
      setError(e?.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = logistics.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      item.trackingId?.toLowerCase().includes(term) ||
      item.dealNumber?.toLowerCase().includes(term) ||
      item.farmerName?.toLowerCase().includes(term) ||
      item.buyerName?.toLowerCase().includes(term) ||
      item.cropName?.toLowerCase().includes(term) ||
      item.vehicleNumber?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="admin" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2.5">
                <Truck className="w-6 h-6 text-emerald-600" />
                Logistics & Fleet Monitor
              </h1>
              <p className="text-sm text-navy-500 mt-1">
                Monitor all platform shipments, route distances, and vehicle assignments
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 bg-white border border-navy-100 rounded-xl text-xs font-semibold text-navy-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-xs">
                <p className="text-[11px] text-navy-400 font-semibold uppercase">Total Shipments</p>
                <p className="text-2xl font-bold text-navy-900 mt-1">{stats.total || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
                <p className="text-[11px] text-amber-600 font-semibold uppercase">Requested</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.requested || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                <p className="text-[11px] text-blue-600 font-semibold uppercase">Assigned</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.assigned || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
                <p className="text-[11px] text-purple-600 font-semibold uppercase">Pickup Sched.</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{stats.pickupScheduled || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-xs">
                <p className="text-[11px] text-cyan-600 font-semibold uppercase">In Transit</p>
                <p className="text-2xl font-bold text-cyan-700 mt-1">{stats.inTransit || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                <p className="text-[11px] text-emerald-600 font-semibold uppercase">Delivered</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.delivered || 0}</p>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracking ID, deal ID, party, crop, vehicle..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-navy-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {['ALL', 'REQUESTED', 'ASSIGNED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-navy-900 text-white'
                      : 'bg-gray-50 text-navy-600 hover:bg-gray-100'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Logistics Table */}
          <div className="bg-white rounded-2xl border border-navy-100 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-navy-500 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-navy-900" />
                <span>Loading shipments...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No logistics records found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 border-b border-navy-100 text-navy-700 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Tracking ID</th>
                      <th className="p-3.5">Deal</th>
                      <th className="p-3.5">Parties (Farmer → Buyer)</th>
                      <th className="p-3.5">Crop & Cargo</th>
                      <th className="p-3.5">Route Distance</th>
                      <th className="p-3.5">Vehicle</th>
                      <th className="p-3.5">Est. Cost</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 text-navy-800">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-3.5 font-mono font-bold text-navy-900">
                          {item.trackingId}
                        </td>
                        <td className="p-3.5 font-mono font-medium text-navy-600">
                          {item.dealNumber || `#${item.dealId}`}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-navy-900 truncate max-w-[160px]">
                            {item.farmerName || 'Farmer'} → {item.buyerName || 'Buyer'}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[160px] mt-0.5">
                            {item.pickupLocation || 'Pickup'} → {item.deliveryLocation || 'Delivery'}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium">
                          {item.cropName}
                          <span className="text-gray-400 block text-[10px]">
                            {item.quantityKg ? `${item.quantityKg} kg` : '—'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          {item.routeDistanceKm != null ? `${item.routeDistanceKm} km` : '—'}
                        </td>
                        <td className="p-3.5">
                          {item.assignedVehicleNumber || item.vehicleNumber ? (
                            <div>
                              <span className="font-mono font-bold text-navy-900">
                                {item.assignedVehicleNumber || item.vehicleNumber}
                              </span>
                              {item.assignedVehicleLabel && (
                                <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">
                                  {item.assignedVehicleLabel}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-navy-900">
                          {fmtINR(item.routeEstimatedCost)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                              STATUS_COLORS[item.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {item.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Link
                            to={`/deals/${item.dealId}`}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            View Deal <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
