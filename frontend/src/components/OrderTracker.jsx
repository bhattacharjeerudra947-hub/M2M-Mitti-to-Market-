import { CheckCircle2, Clock, Truck, Package } from 'lucide-react';

export default function OrderTracker({ order }) {
  const stages = [
    { label: 'Confirmed', icon: CheckCircle2, completed: order.confirmed },
    { label: 'Picked Up', icon: Package, completed: order.pickedUp },
    { label: 'In Transit', icon: Truck, completed: order.inTransit },
    { label: 'Delivered', icon: CheckCircle2, completed: order.delivered },
  ];
  const currentStage = stages.findIndex((s) => !s.completed);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-navy-500">Order #{order.id}</p>
          <h3 className="text-sm font-bold text-navy-900 mt-0.5">{order.produce} · {order.quantity}</h3>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
          order.status === 'Delivered' ? 'bg-primary-50 text-primary-700 border border-primary-200' :
          order.status === 'In Transit' ? 'bg-mustard-50 text-mustard-700 border border-mustard-200' :
          'bg-navy-50 text-navy-700 border border-navy-200'
        }`}>
          {order.status}
        </span>
      </div>

      <p className="text-xs text-navy-500 mb-4">By {order.buyer}</p>

      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="h-1.5 bg-navy-100 rounded-full">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${((currentStage === -1 ? 4 : currentStage) / 3) * 100}%` }}
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
                isCurrent ? 'bg-mustard-100 text-mustard-700 ring-4 ring-mustard-50' :
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
        <span className="text-xs text-navy-500">{order.date}</span>
        <span className="font-bold text-navy-900">₹{order.total.toLocaleString()}</span>
      </div>
    </div>
  );
}
