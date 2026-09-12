import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllVehicles, createVehicle, updateVehicle } from '../../api/dealApi';
import {
  Truck, Plus, RefreshCw, Loader2, AlertTriangle, Check,
  X, Search
} from 'lucide-react';

const TYPE_LABELS = {
  MINI_TRUCK: 'Mini Truck (≤ 1,500 kg)',
  TRUCK: 'Medium Truck (≤ 5,000 kg)',
  LARGE_TRUCK: 'Large Truck (≤ 12,000 kg)',
};

const STATUS_COLORS = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  UNAVAILABLE: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleLabel: '',
    vehicleType: 'TRUCK',
    capacityKg: 3000,
    currentArea: '',
    currentState: '',
    costPerKm: 25,
    baseCostRupees: 500,
    loadingChargeRupees: 400,
    notes: '',
  });

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllVehicles();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.availabilityStatus === 'AVAILABLE').length;
    const assigned = vehicles.filter((v) => v.availabilityStatus === 'ASSIGNED').length;
    const maintenance = vehicles.filter((v) => v.availabilityStatus === 'MAINTENANCE').length;
    const unavailable = vehicles.filter((v) => v.availabilityStatus === 'UNAVAILABLE').length;
    const totalCapacity = vehicles.reduce((sum, v) => sum + (Number(v.capacityKg) || 0), 0);
    return { total, available, assigned, maintenance, unavailable, totalCapacity };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === 'ALL' || v.availabilityStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.vehicleNumber?.toLowerCase().includes(q) ||
        v.vehicleLabel?.toLowerCase().includes(q) ||
        v.currentArea?.toLowerCase().includes(q) ||
        v.currentState?.toLowerCase().includes(q) ||
        v.vehicleType?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await updateVehicle(vehicleId, { availabilityStatus: newStatus });
      loadVehicles();
    } catch (e) {
      setError(e?.message || 'Failed to update vehicle status');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.vehicleNumber) return;
    setSubmitting(true);
    try {
      await createVehicle(formData);
      setShowAddModal(false);
      setFormData({
        vehicleNumber: '',
        vehicleLabel: '',
        vehicleType: 'TRUCK',
        capacityKg: 3000,
        currentArea: '',
        currentState: '',
        costPerKm: 25,
        baseCostRupees: 500,
        loadingChargeRupees: 400,
        notes: '',
      });
      loadVehicles();
    } catch (e) {
      setError(e?.message || 'Failed to create vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          to="/admin/vehicles"
          className="px-4 py-2.5 text-sm font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40 rounded-t-lg flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          Fleet Inventory ({vehicles.length})
        </Link>
        <Link
          to="/admin/logistics"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-gray-400" />
          Logistics & Shipments Monitor
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-emerald-600" />
            Platform Fleet Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage platform transport availability, capacities, and rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadVehicles}
            disabled={loading}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Vehicle
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Vehicles</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Available</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.available}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Assigned / In Trip</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.assigned}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Maintenance / Off</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.maintenance + stats.unavailable}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Capacity</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {stats.totalCapacity >= 1000
              ? `${(stats.totalCapacity / 1000).toFixed(1)} T`
              : `${stats.totalCapacity} kg`}
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'UNAVAILABLE'].map((s) => {
            const count =
              s === 'ALL'
                ? stats.total
                : s === 'AVAILABLE'
                ? stats.available
                : s === 'ASSIGNED'
                ? stats.assigned
                : s === 'MAINTENANCE'
                ? stats.maintenance
                : stats.unavailable;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle number, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
            <span>Loading fleet inventory...</span>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            {vehicles.length === 0
              ? 'No vehicles registered in platform inventory. Click "Add Vehicle" to register one.'
              : 'No vehicles match the selected criteria.'}
          </div>
        ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 border-b border-navy-100 text-navy-700 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Vehicle Number</th>
                      <th className="p-3.5">Label / Description</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Capacity</th>
                      <th className="p-3.5">Base Area</th>
                      <th className="p-3.5">Rate / km</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Change Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {filteredVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-3.5 font-mono font-bold text-gray-900">
                          {v.vehicleNumber}
                        </td>
                        <td className="p-3.5 font-medium text-gray-900">
                          {v.vehicleLabel || '—'}
                        </td>
                        <td className="p-3.5">
                          {v.vehicleTypeLabel || TYPE_LABELS[v.vehicleType] || v.vehicleType}
                        </td>
                        <td className="p-3.5 font-semibold">
                          {Number(v.capacityKg || 0).toLocaleString('en-IN')} kg
                        </td>
                        <td className="p-3.5 text-gray-600">
                          {v.currentArea || '—'} {v.currentState ? `(${v.currentState})` : ''}
                        </td>
                        <td className="p-3.5 font-mono font-medium">
                          ₹{v.costPerKm}/km
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                              STATUS_COLORS[v.availabilityStatus] || 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {v.availabilityStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={v.availabilityStatus}
                            onChange={(e) => handleStatusChange(v.id, e.target.value)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                            <option value="UNAVAILABLE">UNAVAILABLE</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-navy-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-50 pb-3">
              <h3 className="font-bold text-navy-900 text-sm">Add Platform Vehicle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-navy-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-navy-700 mb-1">Vehicle Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M2M-150"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-navy-700 mb-1">Vehicle Label</label>
                <input
                  type="text"
                  placeholder="e.g. Tata Ace – Nashik Hub"
                  value={formData.vehicleLabel}
                  onChange={(e) => setFormData({ ...formData, vehicleLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  >
                    <option value="MINI_TRUCK">Mini Truck</option>
                    <option value="TRUCK">Medium Truck</option>
                    <option value="LARGE_TRUCK">Large Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    value={formData.capacityKg}
                    onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Base Area / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Nashik"
                    value={formData.currentArea}
                    onChange={(e) => setFormData({ ...formData, currentArea: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={formData.currentState}
                    onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Rate/km (₹)</label>
                  <input
                    type="number"
                    value={formData.costPerKm}
                    onChange={(e) => setFormData({ ...formData, costPerKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Base (₹)</label>
                  <input
                    type="number"
                    value={formData.baseCostRupees}
                    onChange={(e) => setFormData({ ...formData, baseCostRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 mb-1">Loading (₹)</label>
                  <input
                    type="number"
                    value={formData.loadingChargeRupees}
                    onChange={(e) => setFormData({ ...formData, loadingChargeRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-navy-200 text-navy-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
