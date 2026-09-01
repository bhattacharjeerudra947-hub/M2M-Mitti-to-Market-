import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, Shield, Brain, Truck, Leaf, ChevronRight, Star, CheckCircle2, Zap, Globe, BarChart3, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import TransparentPricing from '../components/TransparentPricing';
import M2MLogo from '../components/M2MLogo';

const features = [
  { icon: TrendingUp, title: 'Better Prices', desc: 'Farmers earn more by selling directly to verified buyers without middlemen.', color: 'bg-emerald-50 text-emerald-600' },
  { icon: Users, title: 'Direct Access', desc: 'Connect directly with buyers and negotiate fair prices for your produce.', color: 'bg-blue-50 text-blue-600' },
  { icon: Shield, title: 'Transparent Pricing', desc: 'No hidden fees. See exactly what you earn and what buyers pay.', color: 'bg-purple-50 text-purple-600' },
  { icon: Brain, title: 'AI Price Insights', desc: 'Get AI-powered recommendations for optimal pricing and demand forecasting.', color: 'bg-amber-50 text-amber-600' },
  { icon: Truck, title: 'Smart Logistics', desc: 'AI-optimized delivery routes to reduce transport costs and food waste.', color: 'bg-rose-50 text-rose-600' },
  { icon: Leaf, title: 'Less Food Wastage', desc: 'Direct connections mean faster transactions, fresher produce, and less waste.', color: 'bg-teal-50 text-teal-600' },
];

const steps = [
  { num: '01', title: 'List Produce', desc: 'Farmers list their harvest with quality details and pricing.' },
  { num: '02', title: 'Discover Buyers', desc: 'Verified businesses browse and discover fresh produce near them.' },
  { num: '03', title: 'Get a Fair Price', desc: 'Negotiate directly and agree on a fair, transparent price.' },
  { num: '04', title: 'Arrange Delivery', desc: 'AI-optimized logistics ensure fast, cost-effective delivery.' },
  { num: '05', title: 'Complete Transaction', desc: 'Secure payment and delivery confirmation. Done! 🎉' },
];

const testimonials = [
  { name: 'Rajesh Kumar', role: 'Farmer, Nashik', text: 'I earn 17% more per kg now. No more middlemen eating into my profits.', rating: 5 },
  { name: 'Priya Agarwal', role: 'FreshMart, Mumbai', text: 'I get fresher produce at better prices. The AI insights help me plan purchases.', rating: 5 },
  { name: 'Suresh Patil', role: 'FPO Leader, Pune', text: 'Our collective revenue increased 40% since joining the platform.', rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-mustard-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white/20">
                <M2MLogo size="sm" noLink />
                
                SIH 26033 — Direct Agri Marketplace
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                From Farm to Market,{' '}
                <span className="text-mustard-300">Without the Middlemen.</span>
              </h1>
              <p className="text-lg sm:text-xl text-navy-200 mb-8 max-w-lg leading-relaxed">
                Connect directly with buyers, discover fair prices, and move your produce smarter.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-mustard-400 text-navy-900 font-semibold rounded-2xl hover:bg-mustard-300 transition shadow-lg"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 transition border border-white/20"
                >
                  Explore Marketplace
                </a>
              </div>
            </div>

            {/* Visual */}
            <div className="hidden lg:block relative">
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-3 mx-auto">
                      👨‍🌾
                    </div>
                    <p className="text-sm font-semibold">Farmer</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full h-0.5 bg-gradient-to-r from-mustard-300 via-white to-mustard-300" />
                    <span className="text-xs text-mustard-200 font-medium">Direct Marketplace</span>
                    <div className="w-full h-0.5 bg-gradient-to-r from-mustard-300 via-white to-mustard-300" />
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-3 mx-auto">
                      🏪
                    </div>
                    <p className="text-sm font-semibold">Business</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-lg font-bold">₹28</p>
                    <p className="text-xs text-mustard-200">Farmer gets</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-lg font-bold">17%</p>
                    <p className="text-xs text-mustard-200">More income</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-lg font-bold">₹31</p>
                    <p className="text-xs text-mustard-200">Buyer pays</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-navy-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '5,200+', label: 'Farmers Onboarded' },
              { value: '1,800+', label: 'Verified Buyers' },
              { value: '₹42Cr+', label: 'Total Transactions' },
              { value: '14%', label: 'Average Savings' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-2xl sm:text-3xl font-extrabold text-navy-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-mustard-50 text-navy-900 text-xs font-semibold rounded-full mb-4 border border-mustard-200">
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Built for the Future of Agriculture
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A platform designed to empower farmers and businesses alike through technology.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition group">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-mustard-50 text-navy-900 text-xs font-semibold rounded-full mb-4 border border-mustard-200">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Five Simple Steps to Fair Trade
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-14 h-14 bg-navy-900 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4 shadow-lg shadow-navy-200">
                  {step.num}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-5 -right-3 w-5 h-5 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <TransparentPricing />

      {/* Testimonials */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-mustard-50 text-navy-900 text-xs font-semibold rounded-full mb-4 border border-mustard-200">
              TESTIMONIALS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-navy-100 rounded-full flex items-center justify-center text-sm font-bold text-navy-700">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-navy-800 to-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Agricultural Trade?
          </h2>
          <p className="text-lg text-navy-200 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and businesses already trading directly on Mitti2Market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-mustard-400 text-navy-900 font-bold rounded-2xl hover:bg-mustard-300 transition shadow-lg text-lg"
            >
              Get Started — It's Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 text-navy-300 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-mustard-400 rounded-xl flex items-center justify-center">
                <span className="text-xs font-extrabold text-navy-900">M2M</span>
              </div>
              <span className="text-white font-bold">Mitti2Market</span>
            </div>
            <p className="text-sm">SIH 26033 — Direct Agri Marketplace</p>
          </div>
          <div className="border-t border-navy-800 mt-6 pt-6 text-center text-sm">
            © 2026 Mitti2Market. All rights reserved. Built for Smart India Hackathon.
          </div>
        </div>
      </footer>
    </div>
  );
}
