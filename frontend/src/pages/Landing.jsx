import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, Shield, Brain, Truck, Leaf, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TransparentPricing from '../components/TransparentPricing';

const features = [
  { icon: TrendingUp, title: 'Better Prices', desc: 'Farmers earn more by selling directly to verified buyers without middlemen.' },
  { icon: Users, title: 'Direct Access', desc: 'Connect directly with buyers and negotiate fair prices for your produce.' },
  { icon: Shield, title: 'Transparent Pricing', desc: 'No hidden fees. See exactly what you earn and what buyers pay.' },
  { icon: Brain, title: 'AI Price Insights', desc: 'Get AI-powered recommendations for optimal pricing and demand forecasting.' },
  { icon: Truck, title: 'Smart Logistics', desc: 'AI-optimized delivery routes to reduce transport costs and food waste.' },
  { icon: Leaf, title: 'Less Food Wastage', desc: 'Direct connections mean faster transactions, fresher produce, and less waste.' },
];

const steps = [
  { num: '01', title: 'List Your Produce', desc: 'Add your crops and set your price.', icon: Leaf },
  { num: '02', title: 'Connect Directly', desc: 'Buyers connect with you directly.', icon: Users },
  { num: '03', title: 'Confirm & Deliver', desc: 'Finalize orders and deliver with ease.', icon: Truck },
  { num: '04', title: 'Get Paid', desc: 'Receive payments securely and on time.', icon: TrendingUp },
];

const testimonials = [
  { name: 'Rajesh Kumar', role: 'Farmer, Nashik', text: 'I earn 17% more per kg now. No more middlemen eating into my profits.', rating: 5 },
  { name: 'Priya Agarwal', role: 'FreshMart, Mumbai', text: 'I get fresher produce at better prices. The AI insights help me plan purchases.', rating: 5 },
  { name: 'Suresh Patil', role: 'FPO Leader, Pune', text: 'Our collective revenue increased 40% since joining the platform.', rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      {/* ═══════════════ HEADER ═══════════════ */}
      <Navbar dark />

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16, 42, 67, 0.55), rgba(16, 42, 67, 0.55)), url(https://imgh.in/host/dcomde)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Organic curved shape separating navy from farmer photo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-0">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-start relative">
            {/* Left — text content */}
            <div className="relative z-10 pt-4 sm:pt-8 lg:pt-12 pb-16 sm:pb-20 lg:pb-28">
              {/* Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-agri-700/30 border border-agri-500/30 rounded-full mb-6">
                <span className="text-sm">🌿</span>
                <span className="text-[13px] font-medium text-agri-200">Direct Agri Marketplace</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-white mb-6">
                From Farm to Market,<br />
                <span className="text-mustard-400">Without the Middlemen.</span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-navy-200 mb-8 max-w-md leading-relaxed">
                Mitti2Market connects farmers directly with buyers. Get fair prices, save more, and grow together.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-mustard-400 text-navy-900 font-semibold rounded-xl hover:bg-mustard-300 transition shadow-lg shadow-mustard-400/20"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/25"
                >
                  Explore Marketplace
                </Link>
              </div>
            </div>

            {/* Right — farmer image with organic curve */}
            <div className="relative hidden lg:block">
              {/* Organic shape container */}
              <div className="relative w-full h-[480px] xl:h-[540px]">
                {/* SVG organic curve background */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 500 540"
                  fill="none"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <path
                    d="M120 0 C120 0, 500 0, 500 0 L500 540 C500 540, 500 540, 380 540 C280 540, 180 480, 100 400 C20 320, 0 240, 0 180 C0 120, 40 40, 120 0Z"
                    fill="url(#farmerGrad)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient id="farmerGrad" x1="0" y1="0" x2="500" y2="540">
                      <stop offset="0%" stopColor="#E9B522" />
                      <stop offset="100%" stopColor="#304D2B" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Farmer photograph */}
                <div
                  className="absolute top-8 right-0 w-[85%] h-[88%] rounded-[2rem] overflow-hidden shadow-2xl"
                  style={{
                    clipPath: 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 25%)',
                  }}
                >
                  <img
                    src="/farmer-hero.jpg"
                    alt="Indian farmer in a green field"
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle gradient overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/30 via-transparent to-transparent" />
                </div>

                {/* Decorative floating card */}
                <div className="absolute bottom-12 left-0 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/50 max-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-[11px] font-semibold text-navy-900">Fair Prices</span>
                  </div>
                  <p className="text-[11px] text-navy-600 leading-snug">Farmers earn 17% more on average</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve into cream */}
        <div className="hero-curve-bottom">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,60 L0,20 C240,60 480,0 720,20 C960,40 1200,0 1440,30 L1440,60 Z" fill="#F5F0E6" />
          </svg>
        </div>
      </section>

      {/* ═══════════════ STATISTICS SECTION ═══════════════ */}
      <section className="relative bg-cream pt-8 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { value: '10K+', label: 'Farmers Onboarded', icon: '👨‍🌾', iconBg: 'bg-agri-700' },
              { value: '2.5K+', label: 'Active Buyers', icon: '🏪', iconBg: 'bg-earth-500' },
              { value: '₹15Cr+', label: 'Worth of Produce Sold', icon: '📊', iconBg: 'bg-mustard-400' },
            ].map((stat, i) => (
              <div key={i} className={`flex flex-col items-center text-center ${i < 2 ? 'border-r border-navy-200/30' : ''}`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.iconBg} rounded-full flex items-center justify-center mb-3`}>
                  <span className="text-lg sm:text-xl">{stat.icon}</span>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-navy-900">{stat.value}</p>
                <p className="text-xs sm:text-sm text-navy-500 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SUPPORTING FARMERS CARD ═══════════════ */}
      <section className="relative bg-cream pb-16 -mt-2">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-earth-500 rounded-3xl p-8 sm:p-10 lg:p-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-xl shadow-earth-500/15">
            {/* Leaf icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-agri-700/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Leaf className="w-8 h-8 sm:w-10 sm:h-10 text-agri-200" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-cream leading-tight">
                Supporting Farmers,<br />Strengthening Bharat
              </h3>
              <p className="text-earth-200 mt-2 text-sm sm:text-base">Better income. Better future.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="relative bg-agri-700 py-20 sm:py-24 overflow-hidden">
        {/* Curve top */}
        <div className="how-curve-top">
          <svg viewBox="0 0 1440 50" preserveAspectRatio="none">
            <path d="M0,0 L0,30 C360,0 720,50 1080,20 C1260,10 1380,25 1440,15 L1440,0 Z" fill="#F5F0E6" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
          {/* Section label */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1.5 bg-white/15 text-agri-100 text-[11px] font-semibold tracking-widest uppercase rounded-full">
              How It Works
            </span>
          </div>

          {/* Heading */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-14 leading-tight">
            Simple steps,<br />strong impact.
          </h2>

          {/* Steps */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
            {/* Connecting dotted line (desktop) */}
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-px border-t-2 border-dashed border-white/20" />

            {steps.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Icon circle */}
                <div className="relative z-10 w-20 h-20 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-105 transition-transform">
                  <step.icon className="w-8 h-8 text-agri-700" />
                </div>

                {/* Step number */}
                <span className="text-[11px] font-bold text-mustard-400 tracking-widest uppercase mb-2 block">
                  Step {step.num}
                </span>

                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-agri-100/70 leading-relaxed max-w-[220px] mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="py-20 sm:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              Why Choose Us
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Built for the Future of Agriculture
            </h2>
            <p className="text-base text-navy-500 max-w-2xl mx-auto">
              A platform designed to empower farmers and businesses alike through technology.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm hover:shadow-md transition group">
                <div className="w-11 h-11 bg-mustard-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-mustard-100 transition">
                  <f.icon className="w-5 h-5 text-mustard-600" />
                </div>
                <h3 className="text-sm font-bold text-navy-900 mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-navy-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TRANSPARENT PRICING ═══════════════ */}
      <TransparentPricing />

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="py-20 sm:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              Testimonials
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Trusted by Thousands
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-mustard-400 fill-mustard-400" />
                  ))}
                </div>
                <p className="text-[13px] text-navy-600 mb-5 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-navy-900 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{t.name}</p>
                    <p className="text-[11px] text-navy-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-20 sm:py-24 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Agricultural Trade?
          </h2>
          <p className="text-base text-navy-300 mb-8 max-w-xl mx-auto">
            Join thousands of farmers and businesses already trading directly on Mitti2Market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-mustard-400 text-navy-900 font-bold rounded-xl hover:bg-mustard-300 transition shadow-lg shadow-mustard-400/20 text-base"
            >
              Get Started — It's Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <Footer />
    </div>
  );
}
