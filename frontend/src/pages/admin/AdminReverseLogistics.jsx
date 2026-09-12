import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw, Truck, Warehouse, Search, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, TrendingDown, Eye, Filter
} from 'lucide-react';
import { getAdminReverseLogistics } from '../../api/hubApi';

export default function AdminReverseLogistics() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminReverseLogistics();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load reverse logistics cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = cases.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.reverseTrackingId?.toLowerCase().includes(term) ||
      c.dealId?.toString().includes(term) ||
      c.buyerName?.toLowerCase().includes(term) ||
      c.farmerName?.toLowerCase().includes(term) ||
      c.cropName?.toLowerCase().includes(term) ||
      c.returnReason?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const totalDistanceSaved = cases.reduce((acc, c) => acc + (c.distanceSavedKm || 0), 0);
  const hubRoutedCount = cases.filter((c) => c.destinationType === 'NEAREST_HUB').length;
  const inspectedCount = cases.filter((c) => c.status === 'INSPECTED' || c.status === 'COMPLETED' || c.status === 'DISPOSITIONED').length;

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          to="/admin/vehicles"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-gray-400" />
          Fleet Inventory
        </Link>
        <Link
          to="/admin/logistics"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-gray-400" />
          Logistics & Shipments Monitor
        </Link>
        <Link
          to="/admin/hubs"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Warehouse className="w-4 h-4 text-gray-400" />
          Partner Warehouse & Hub Network
        </Link>
        <Link
          to="/admin/reverse-logistics"
          className="px-4 py-2.5 text-sm font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40 rounded-t-lg flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-emerald-600" />
          Reverse Logistics Monitor
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-amber-600" />
            Reverse Logistics & Inspection Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Algorithmic return destination optimization, food-waste prevention, and hub inspection outcomes
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-[11px] text-gray-400 font-semibold uppercase">Total Returns</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{cases.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <p className="text-[11px] text-emerald-600 font-semibold uppercase">Total Distance Saved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {Math.round(totalDistanceSaved).toLocaleString()} <span className="text-sm font-normal">km</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
          <p className="text-[11px] text-blue-600 font-semibold uppercase">Hub Stage Optimizations</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{hubRoutedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
          <p className="text-[11px] text-purple-600 font-semibold uppercase">Completed Inspections</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{inspectedCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tracking ID, deal ID, party, crop, reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="ARRIVED_AT_HUB">ARRIVED_AT_HUB</option>
            <option value="INSPECTED">INSPECTED</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Loading reverse logistics cases...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <RotateCcw className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold">No reverse logistics cases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4">Tracking ID</th>
                  <th className="p-4">Deal</th>
                  <th className="p-4">Parties</th>
                  <th className="p-4">Return Reason</th>
                  <th className="p-4">Quantity (kg)</th>
                  <th className="p-4">Routing & Savings</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Inspection Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900">{c.reverseTrackingId}</td>
                    <td className="p-4 font-semibold text-emerald-700">Deal #{c.dealId}</td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 block">{c.buyerName || 'Buyer'}</span>
                      <span className="text-[11px] text-gray-500">From {c.farmerName || 'Farmer'}</span>
                    </td>
                    <td className="p-4 font-medium text-amber-800">{c.returnReason}</td>
                    <td className="p-4 font-bold text-gray-900">{c.quantityKg?.toLocaleString()} kg</td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 block">
                        {c.destinationType === 'NEAREST_HUB' ? 'Stage at Nearest Hub' : 'Return to Farmer'}
                      </span>
                      {c.distanceSavedKm > 0 && (
                        <span className="text-[11px] text-emerald-700 font-bold block">
                          🌱 Saved {c.distanceSavedKm} km
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'INSPECTED' || c.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-700">
                      {c.inspectionDecision ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                          {c.inspectionDecision.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Pending Inspection</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
