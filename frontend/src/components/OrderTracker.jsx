import { CheckCircle2, Truck, Package } from 'lucide-react';

export default function OrderTracker({ order = {} }) {
  if (!order) return null;

  const rawStatus = String(order.status || '').toUpperCase();
  const isDelivered = rawStatus === 'DELIVERED' || Boolean(order.delivered);
  const isInTransit = isDelivered || rawStatus === 'IN_TRANSIT' || Boolean(order.inTransit);
  const isPacked = isInTransit || rawStatus === 'PACKED' || Boolean(order.pickedUp);
  const isConfirmed = isPacked || ['CONFIRMED', 'PENDING'].includes(rawStatus) || Boolean(order.confirmed);

  const stages = [
    { label: 'Confirmed', icon: CheckCircle2, completed: isConfirmed },
    { label: 'Packed', icon: Package, completed: isPacked },
    { label: 'In Transit', icon: Truck, completed: isInTransit },
    { label: 'Delivered', icon: CheckCircle2, completed: isDelivered },
  ];
  const currentStage = stages.findIndex((s) => !s.completed);

  const produceName = order.produce?.name || order.produceName || (typeof order.produce === 'string' ? order.produce : 'Agricultural Produce');
  const qty = order.quantity != null ? `${Number(order.quantity).toLocaleString('en-IN')} ${order.unit || order.produce?.unit || 'kg'}` : '';
  const party = order.buyer?.name || order.buyerName || order.farmer?.name || order.farmerName || (typeof order.buyer === 'string' ? order.buyer : '');
  const totalAmount = Number(order.totalPrice != null ? order.totalPrice : (order.total != null ? order.total : 0));
  const dateStr = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : (order.date || '—');

  const statusDisplay = order.status
    ? String(order.status).replace(/_/g, ' ')
    : isDelivered ? 'Delivered' : isInTransit ? 'In Transit' : 'Confirmed';

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-navy-500">Order #{order.id}</p>
          <h3 className="text-sm font-bold text-navy-900 mt-0.5">
            {produceName} {qty ? `· ${qty}` : ''}
          </h3>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
          isDelivered ? 'bg-primary-50 text-primary-700 border border-primary-200' :
          isInTransit ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-navy-50 text-navy-700 border border-navy-200'
        }`}>
          {statusDisplay}
        </span>
      </div>

      {party && <p className="text-xs text-navy-500 mb-4">Partner: {party}</p>}

      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, ((currentStage === -1 ? 3 : currentStage) / 3) * 100))}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage, i) => {
          const isCurrent = i === currentStage;
          const Icon = stage.icon;
          return (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-1 ${
                stage.completed ? 'bg-primary-500 text-white' :
                isCurrent ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-50' :
                'bg-navy-100 text-navy-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={`text-[10px] font-medium ${
                stage.completed ? 'text-primary-700' : isCurrent ? 'text-navy-800' : 'text-navy-400'
              }`}>
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-navy-50 flex items-center justify-between">
        <span className="text-xs text-navy-500">{dateStr}</span>
        <span className="font-bold text-navy-900">₹{totalAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
