import { ArrowDown, ArrowRight, TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';

export default function TransparentPricing() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-mustard-50 text-navy-900 text-xs font-semibold rounded-full mb-4 border border-mustard-200">
            TRANSPARENT PRICING
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            See How Much You Save
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Compare the traditional supply chain with our direct marketplace. Every rupee saved is a rupee earned.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Traditional */}
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <XCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">Traditional Supply Chain</h3>
            </div>
            <div className="space-y-3">
              {[
                { role: 'Farmer', price: '₹24/kg', icon: '👨‍🌾' },
                { role: 'Trader', price: '₹27/kg', icon: '🤝' },
                { role: 'Wholesaler', price: '₹30/kg', icon: '🏭' },
                { role: 'Retailer', price: '₹36/kg', icon: '🏪' },
              ].map((step, i, arr) => (
                <div key={i}>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{step.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{step.role}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{step.price}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 text-red-700">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">Consumer pays ₹36/kg</span>
              </div>
              <p className="text-xs text-red-500 mt-1">Farmer only gets 67% of final price</p>
            </div>
          </div>

          {/* Direct */}
          <div className="bg-mustard-50 rounded-3xl p-8 border border-mustard-200">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-bold text-gray-900">Direct Marketplace</h3>
            </div>
            <div className="space-y-3">
              {[
                { role: 'Farmer', price: '₹28/kg', icon: '👨‍🌾', highlight: true },
                { role: 'Direct Buyer', price: '₹31/kg', icon: '🏪' },
              ].map((step, i, arr) => (
                <div key={i}>
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    step.highlight
                      ? 'bg-white border-mustard-300 shadow-sm'
                      : 'bg-white border-mustard-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{step.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{step.role}</span>
                      {step.highlight && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold rounded-full border border-primary-200">
                          +₹4/kg
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${step.highlight ? 'text-navy-900' : 'text-gray-900'}`}>
                      {step.price}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-mustard-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <div className="p-3 bg-white rounded-xl border border-mustard-200">
                <div className="flex items-center gap-2 text-navy-800">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">Consumer pays ₹31/kg</span>
                </div>
                <p className="text-xs text-navy-500 mt-1">14% less than traditional</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-primary-200">
                <div className="flex items-center gap-2 text-primary-700">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-semibold">Farmer earns ₹28/kg</span>
                </div>
                <p className="text-xs text-primary-600 mt-1">17% more than traditional</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 rounded-2xl border border-primary-200">
            <CheckCircle2 className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-semibold text-primary-700">
              Everyone wins: Farmers earn more, buyers pay less, food waste is reduced.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
