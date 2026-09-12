import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Warehouse, Truck, RotateCcw, Search, RefreshCw, Loader2,
  AlertTriangle, ShieldCheck, MapPin, Building2, Eye, Plus
} from 'lucide-react';
import { getAdminHubs } from '../../api/hubApi';

export default function AdminHubs() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminHubs();
      setHubs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load partner hubs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = hubs.filter((h) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      h.hubCode?.toLowerCase().includes(term) ||
      h.name?.toLowerCase().includes(term) ||
      h.partnerName?.toLowerCase().includes(term) ||
      h.district?.toLowerCase().includes(term) ||
      h.state?.toLowerCase().includes(term)
    );
  });

  const totalCapacityKg = hubs.reduce((acc, h) => acc + (h.totalCapacityKg || 0), 0);
  const totalOccupiedKg = hubs.reduce((acc, h) => acc + (h.occupiedCapacityKg || 0), 0);
  const activeCount = hubs.filter((h) => h.operatingStatus === 'ACTIVE').length;

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
          className="px-4 py-2.5 text-sm font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40 rounded-t-lg flex items-center gap-2"
        >
          <Warehouse className="w-4 h-4 text-emerald-600" />
          Partner Warehouse & Hub Network
        </Link>
        <Link
          to="/admin/reverse-logistics"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-gray-400" />
          Reverse Logistics Monitor
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-emerald-600" />
            Partner Aggregation & Storage Hubs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Digital orchestration of authorized FPO, cold chain, and partner warehouse facilities
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
          <p className="text-[11px] text-gray-400 font-semibold uppercase">Total Facilities</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{hubs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <p className="text-[11px] text-emerald-600 font-semibold uppercase">Active Hubs</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
          <p className="text-[11px] text-blue-600 font-semibold uppercase">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {(totalCapacityKg / 1000).toFixed(1)} <span className="text-sm font-normal">MT</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <p className="text-[11px] text-amber-600 font-semibold uppercase">Occupied Staged</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {(totalOccupiedKg / 1000).toFixed(1)} <span className="text-sm font-normal">MT</span>
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hub by code, name, partner, district, state..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Hubs Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Loading partner warehouse network...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Warehouse className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold">No warehouse hubs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4">Hub Code</th>
                  <th className="p-4">Facility Name & Partner</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Storage Type</th>
                  <th className="p-4">Capacity Utilization</th>
                  <th className="p-4">Rates (₹/kg)</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((hub) => {
                  const freeCap = hub.availableCapacityKg ?? ((hub.totalCapacityKg || 0) - (hub.occupiedCapacityKg || 0) - (hub.reservedCapacityKg || 0));
                  const occ = hub.totalCapacityKg ? Math.round(((hub.occupiedCapacityKg || 0) / hub.totalCapacityKg) * 100) : 0;
                  return (
                    <tr key={hub.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900">{hub.hubCode}</td>
                      <td className="p-4">
                        <span className="font-bold text-gray-900 block">{hub.name}</span>
                        <span className="text-[11px] text-gray-500">Partner: {hub.partnerName || 'Local FPO'}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-gray-700">{hub.district || hub.location}, {hub.state}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {hub.storageType ? hub.storageType.replace('_', ' ') : 'WAREHOUSE'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-600 font-semibold">
                            <span>{occ}% used</span>
                            <span>{freeCap.toLocaleString()} kg free</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(occ, 100)}%` }}
                              className={`h-full ${occ > 85 ? 'bg-red-500' : occ > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-700">
                        <div>Handling: ₹{hub.handlingFeePerKg || 0.4}/kg</div>
                        <div className="text-[10px] text-gray-500">Storage: ₹{hub.storageRatePerDayPerKg || 0.08}/kg/d</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {hub.operatingStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
