import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAllVehicles, createVehicle, updateVehicle } from '../../api/dealApi';
import {
  Truck, Plus, RefreshCw, Loader2, AlertTriangle, Check,
  MapPin, IndianRupee, X
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
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="admin" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2.5">
                <Truck className="w-6 h-6 text-blue-600" />
                Platform Fleet Management
              </h1>
              <p className="text-sm text-navy-500 mt-1">
                Manage platform transport availability, capacities, and rates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadVehicles}
                disabled={loading}
                className="px-3 py-2 bg-white border border-navy-100 rounded-xl text-xs font-semibold text-navy-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
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

          {/* Vehicles Table */}
          <div className="bg-white rounded-2xl border border-navy-100 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-navy-500 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-navy-900" />
                <span>Loading fleet inventory...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No vehicles registered in platform inventory. Click "Add Vehicle" to register one.
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
                  <tbody className="divide-y divide-navy-50 text-navy-800">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-3.5 font-mono font-bold text-navy-900">
                          {v.vehicleNumber}
                        </td>
                        <td className="p-3.5 font-medium text-navy-900">
                          {v.vehicleLabel || '—'}
                        </td>
                        <td className="p-3.5">
                          {v.vehicleTypeLabel || v.vehicleType}
                        </td>
                        <td className="p-3.5 font-semibold">
                          {Number(v.capacityKg || 0).toLocaleString('en-IN')} kg
                        </td>
                        <td className="p-3.5 text-navy-600">
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
                            className="bg-gray-50 border border-navy-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
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
        </div>
      </main>

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
