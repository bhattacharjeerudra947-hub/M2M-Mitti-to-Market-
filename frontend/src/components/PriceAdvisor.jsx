import { Brain, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PriceAdvisor() {
  return (
    <div className="bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-navy-900 rounded-xl flex items-center justify-center">
          <Brain className="w-4 h-4 text-mustard-300" />
        </div>
        <h3 className="text-sm font-bold text-navy-900">AI Price Recommendation</h3>
      </div>

      <div className="bg-white rounded-xl p-4 border border-mustard-200/50 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">🍅 Tomato — Grade A</p>
            <p className="text-xs text-navy-500 mt-0.5">Current Market Range</p>
          </div>
          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full flex items-center gap-1 border border-primary-200">
            <TrendingUp className="w-3 h-3" /> HIGH ↑
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
            <p className="text-xs text-navy-600 mb-1">Market Price</p>
            <p className="text-lg font-bold text-navy-900">₹25 – ₹29 <span className="text-xs font-normal text-navy-500">/ kg</span></p>
          </div>
          <div className="p-3 bg-primary-50 rounded-xl border border-primary-200">
            <p className="text-xs text-primary-600 mb-1">AI Recommended</p>
            <p className="text-lg font-bold text-primary-700">₹28 – ₹30 <span className="text-xs font-normal text-primary-500">/ kg</span></p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-navy-500">Expected Demand</span>
          <span className="font-bold text-primary-600">Increasing</span>
        </div>
      </div>

      <Link
        to="/farmer/price-advisor"
        className="block w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition text-center shadow-sm"
      >
        View Price Analysis
      </Link>
    </div>
  );
}
