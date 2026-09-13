import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminLogistics, getAdminLogisticsStats, getAllIncidents, adjudicateLiability } from '../../api/dealApi';
import {
  Truck, Search, RefreshCw, Loader2,
  AlertTriangle, ExternalLink, Warehouse, RotateCcw, ShieldAlert, CheckCircle2, X
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

export default function AdminLogistics() {
  const [logistics, setLogistics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeView, setActiveView] = useState('SHIPMENTS'); // 'SHIPMENTS' | 'INCIDENTS'
  const [incidents, setIncidents] = useState([]);
  const [adjudicatingIncident, setAdjudicatingIncident] = useState(null);
  const [liabilityParty, setLiabilityParty] = useState('THIRD_PARTY_LOGISTICS');
  const [resolutionText, setResolutionText] = useState('');
  const [lossAttributedTo, setLossAttributedTo] = useState('');
  const [savingLiability, setSavingLiability] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData, incData] = await Promise.all([
        getAdminLogistics(),
        getAdminLogisticsStats().catch(() => null),
        getAllIncidents().catch(() => []),
      ]);
      setLogistics(Array.isArray(listData) ? listData : []);
      if (statsData) setStats(statsData);
      if (Array.isArray(incData)) {
        setIncidents(incData);
      } else if (incData?.data && Array.isArray(incData.data)) {
        setIncidents(incData.data);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdjudicate = async (e) => {
    e.preventDefault();
    if (!adjudicatingIncident) return;
    setSavingLiability(true);
    try {
      await adjudicateLiability(adjudicatingIncident.id, {
        liabilityParty,
        resolutionSummary: resolutionText,
        resolution: resolutionText,
        financialAttributionNotes: lossAttributedTo,
        lossAttributedTo,
      });
      setAdjudicatingIncident(null);
      setResolutionText('');
      setLossAttributedTo('');
      loadData();
    } catch (err) {
      setError(err?.message || 'Failed to adjudicate liability');
    } finally {
      setSavingLiability(false);
    }
  };

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
          className="px-4 py-2.5 text-sm font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40 rounded-t-lg flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-emerald-600" />
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
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-gray-400" />
          Reverse Logistics Monitor
        </Link>
      </div>
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

          {/* Sub-view toggle */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveView('SHIPMENTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeView === 'SHIPMENTS'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              🚚 Shipments Monitor ({logistics.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('INCIDENTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeView === 'INCIDENTS'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Transit Incidents & Liability
              {incidents.filter((i) => i.status !== 'ADJUDICATED').length > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {incidents.filter((i) => i.status !== 'ADJUDICATED').length}
                </span>
              )}
            </button>
          </div>

          {activeView === 'SHIPMENTS' ? (
            <>
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
            </>
          ) : (
            /* Transit Incidents & Liability Adjudication Table */
            <div className="bg-white rounded-2xl border border-navy-100 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-navy-100 bg-red-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Reported Transit & Damage Incidents
                  </h3>
                  <p className="text-xs text-red-700 mt-0.5">
                    Adjudicate fault and financial attribution across Farmer, Buyer, Transporters, or Hubs.
                  </p>
                </div>
              </div>

              {incidents.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  No logistics incidents recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-50/70 border-b border-navy-100 text-navy-700 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Deal #</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Location</th>
                        <th className="p-3.5">Est. Loss</th>
                        <th className="p-3.5">Description</th>
                        <th className="p-3.5">Adjudicated Liability</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50 text-navy-800">
                      {incidents.map((inc) => (
                        <tr key={inc.id} className="hover:bg-gray-50/60 transition">
                          <td className="p-3.5 font-mono font-bold text-navy-900">
                            #{inc.id}
                          </td>
                          <td className="p-3.5 font-mono text-navy-600">
                            <Link to={`/deals/${inc.dealId}`} className="text-blue-600 hover:underline">
                              #{inc.dealId}
                            </Link>
                          </td>
                          <td className="p-3.5 font-semibold text-red-900">
                            {inc.incidentType}
                          </td>
                          <td className="p-3.5 text-navy-600">
                            {inc.incidentLocation || '—'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-red-700">
                            {fmtINR(inc.estimatedLossAmount)}
                          </td>
                          <td className="p-3.5 max-w-[200px] truncate text-navy-700" title={inc.description}>
                            {inc.description}
                          </td>
                          <td className="p-3.5">
                            {inc.liabilityParty ? (
                              <div>
                                <span className="font-bold text-emerald-800 text-[11px] block">
                                  {inc.liabilityParty}
                                </span>
                                {inc.lossAttributedTo && (
                                  <span className="text-[10px] text-gray-500 block truncate max-w-[140px]">
                                    {inc.lossAttributedTo}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 font-semibold text-[11px]">Unadjudicated</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                                inc.status === 'ADJUDICATED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {inc.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjudicatingIncident(inc);
                                setLiabilityParty(inc.liabilityParty || 'THIRD_PARTY_LOGISTICS');
                                setResolutionText(inc.resolution || '');
                                setLossAttributedTo(inc.lossAttributedTo || '');
                              }}
                              className="px-3 py-1 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                            >
                              {inc.status === 'ADJUDICATED' ? 'Re-Adjudicate' : 'Adjudicate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Adjudication Modal */}
          {adjudicatingIncident && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-navy-100 flex flex-col">
                <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      Adjudicate Incident #{adjudicatingIncident.id}
                    </h3>
                    <p className="text-xs text-navy-200">
                      Deal #{adjudicatingIncident.dealId} · Type: {adjudicatingIncident.incidentType}
                    </p>
                  </div>
                  <button
                    onClick={() => setAdjudicatingIncident(null)}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-navy-200 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAdjudicate} className="p-6 space-y-4">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-navy-900">Incident Details:</p>
                    <p className="text-navy-700">{adjudicatingIncident.description}</p>
                    {adjudicatingIncident.estimatedLossAmount && (
                      <p className="font-mono text-red-700 font-bold">
                        Reported Loss: {fmtINR(adjudicatingIncident.estimatedLossAmount)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-800 mb-1">
                      Determined Liable Party *
                    </label>
                    <select
                      value={liabilityParty}
                      onChange={(e) => setLiabilityParty(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 font-semibold"
                    >
                      <option value="THIRD_PARTY_LOGISTICS">THIRD_PARTY_LOGISTICS (Transporter at fault)</option>
                      <option value="MITTI2MARKET_LOGISTICS_PARTNER">MITTI2MARKET_LOGISTICS_PARTNER (Platform Fleet)</option>
                      <option value="FARMER">FARMER (Packaging / Spoilage prior to transit)</option>
                      <option value="BUYER">BUYER (Unloading delay / Refusal)</option>
                      <option value="HUB_WAREHOUSE">HUB_WAREHOUSE (Storage facility storage issue)</option>
                      <option value="SHARED">SHARED (Mutual partial liability)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-800 mb-1">
                      Financial Attribution & Compensation Note
                    </label>
                    <input
                      type="text"
                      value={lossAttributedTo}
                      onChange={(e) => setLossAttributedTo(e.target.value)}
                      placeholder="e.g. Transporter insurance deducts ₹4000; Escrow refunds ₹4000 to buyer"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-800 mb-1">
                      Adjudication Resolution Findings *
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Detail inspection notes, temperature records, and conclusive evidence..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setAdjudicatingIncident(null)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingLiability}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
                    >
                      {savingLiability ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm Adjudication
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </div>
  );
}
