import { Link } from 'react-router-dom';
import { ArrowRight, Users, Truck, Leaf, TrendingUp, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const steps = [
  { num: '01', title: 'List Your Produce', desc: 'Add your crops and set your price.', icon: Leaf },
  { num: '02', title: 'Connect Directly', desc: 'Buyers connect with you directly.', icon: Users },
  { num: '03', title: 'Confirm & Deliver', desc: 'Finalize orders and deliver with ease.', icon: Truck },
  { num: '04', title: 'Get Paid', desc: 'Receive payments securely and on time.', icon: TrendingUp },
];

const farmerPoints = [
  'Add your crops in minutes and set your own price',
  'Get AI-powered recommendations for fair, competitive rates',
  'Connect directly with verified buyers — no middlemen',
  'Confirm orders, deliver and get paid securely and on time',
];

const buyerPoints = [
  'Browse fresh produce listed directly by farmers and FPOs',
  'Compare transparent prices across locations and growers',
  'Order straight from the source and cut out middleman markups',
  'Plan smarter with AI price insights and logistics',
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar dark />

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16, 42, 67, 0.55), rgba(16, 42, 67, 0.55)), url(https://i.ibb.co/zhQ4vWmp/farmersmiling.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-agri-700/30 border border-agri-500/30 rounded-full mb-6">
              <span className="text-sm">🌿</span>
              <span className="text-[13px] font-medium text-agri-200">How It Works</span>
            </div>
            <h1 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-white mb-6">
              From farm to market,<br />
              <span className="text-mustard-400">in four simple steps.</span>
            </h1>
            <p className="text-base sm:text-lg text-navy-200 mb-8 max-w-xl leading-relaxed">
              Mitti2Market removes the middlemen and puts farmers face-to-face with buyers.
              Here&apos;s how the journey works — from listing a crop to getting paid.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-mustard-400 text-navy-900 font-semibold rounded-xl hover:bg-mustard-300 transition shadow-lg shadow-mustard-400/20"
              >
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/25"
              >
                Get Started — It&apos;s Free
              </Link>
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

      {/* ═══════════════ STEPS ═══════════════ */}
      <section className="py-20 sm:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              Simple steps, strong impact
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              How farmers sell on Mitti2Market
            </h2>
            <p className="text-base text-navy-500 max-w-2xl mx-auto">
              A straightforward flow designed so farmers keep more of what they earn.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm hover:shadow-md transition group">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 bg-agri-50 rounded-xl flex items-center justify-center group-hover:bg-agri-100 transition">
                    <step.icon className="w-6 h-6 text-agri-700" />
                  </div>
                  <span className="text-[13px] font-bold text-mustard-500 tracking-widest">STEP {step.num}</span>
                </div>
                <h3 className="text-base font-bold text-navy-900 mb-1.5">{step.title}</h3>
                <p className="text-[13px] text-navy-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FARMERS & BUYERS ═══════════════ */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              One platform, two sides
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Built for farmers and buyers alike
            </h2>
            <p className="text-base text-navy-500 max-w-2xl mx-auto">
              Whether you grow produce or you buy it, the marketplace works in your favour.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Farmers */}
            <div className="bg-cream rounded-3xl p-8 sm:p-10 border border-navy-100/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-agri-700 rounded-xl flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-agri-100" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">For Farmers & FPOs</h3>
                  <p className="text-xs text-navy-500">Grow more, earn more</p>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {farmerPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-navy-600 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-agri-600 shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition"
              >
                Join as a Farmer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Buyers */}
            <div className="bg-mustard-50 rounded-3xl p-8 sm:p-10 border border-mustard-200/70">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-mustard-400 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-navy-900" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">For Businesses & Buyers</h3>
                  <p className="text-xs text-navy-500">Buy fresh, pay fair</p>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {buyerPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-navy-600 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-mustard-600 shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-mustard-400 text-navy-900 text-sm font-semibold rounded-xl hover:bg-mustard-300 transition"
              >
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-20 sm:py-24 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to start trading directly?
          </h2>
          <p className="text-base text-navy-300 mb-8 max-w-xl mx-auto">
            Join thousands of farmers and businesses already trading on Mitti2Market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-mustard-400 text-navy-900 font-bold rounded-xl hover:bg-mustard-300 transition shadow-lg shadow-mustard-400/20 text-base"
            >
              Get Started — It&apos;s Free
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
