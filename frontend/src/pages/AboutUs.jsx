import { Link } from 'react-router-dom';
import {
  ArrowRight, Brain, CheckCircle2, Leaf, Shield, Star, TrendingUp, Truck, Users, XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const stats = [
  { emoji: '👨‍🌾', value: '10K+', label: 'Farmers Onboarded' },
  { emoji: '🏪', value: '2.5K+', label: 'Active Buyers' },
  { emoji: '📊', value: '₹15Cr+', label: 'Worth of Produce Sold' },
];

const values = [
  { icon: TrendingUp, title: 'Better Prices', desc: 'Farmers earn more by selling directly to verified buyers without middlemen.' },
  { icon: Users, title: 'Direct Access', desc: 'Connect directly with buyers and negotiate fair prices for your produce.' },
  { icon: Shield, title: 'Transparent Pricing', desc: 'No hidden fees. See exactly what you earn and what buyers pay.' },
  { icon: Brain, title: 'AI Price Insights', desc: 'AI-powered recommendations for optimal pricing and demand forecasting.' },
  { icon: Truck, title: 'Smart Logistics', desc: 'AI-optimized delivery routes to reduce transport costs and food waste.' },
  { icon: Leaf, title: 'Less Food Wastage', desc: 'Direct connections mean faster transactions, fresher produce and less waste.' },
];

const oldChain = [
  'Prices are decided far away from the farmer who grows the crop',
  'A chain of middlemen takes a cut at every step',
  'Produce sits in long supply chains and goes to waste',
  'Farmers and buyers rarely meet or build lasting trust',
];

const ourWay = [
  'Farmers and FPOs sell directly to verified buyers',
  'Every listing shows a clear, transparent price',
  'AI insights and smart logistics keep produce fresh and moving',
  'Direct connections build trust — and repeat trade',
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar dark />

      {/* ═══════════════ WHO WE ARE ═══════════════ */}
      <section className="py-20 sm:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
                Who we are
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-5 leading-tight">
                A marketplace built to put farmers first
              </h2>
              <p className="text-base text-navy-600 leading-relaxed mb-4">
                For too long, the people who grow India&apos;s food have earned the smallest share of its
                value. A long chain of middlemen sets the prices, takes the cuts and leaves farmers with
                thin margins — while buyers pay more than they should.
              </p>
              <p className="text-base text-navy-600 leading-relaxed mb-4">
                Mitti2Market shortens that chain to a single, direct connection: farmer to buyer. Built as
                a Smart India Hackathon project and growing into a real platform, we pair that direct
                connection with AI price insights and smart logistics — so farming becomes more profitable
                and less wasteful.
              </p>
              <p className="text-base text-navy-600 leading-relaxed">
                Our belief is simple: <span className="font-semibold text-navy-900">better income. better future.</span>
              </p>
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-navy-100/50 shadow-sm">
              <h3 className="text-sm font-bold text-navy-900 mb-6 tracking-wide">The movement so far</h3>
              <div className="space-y-5">
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-cream rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">
                      {stat.emoji}
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-navy-900">{stat.value}</p>
                      <p className="text-xs text-navy-500 font-medium">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MISSION & VISION ═══════════════ */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              Our purpose
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              What drives us every day
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-cream rounded-3xl p-8 sm:p-10 border border-navy-100/50">
              <div className="w-12 h-12 bg-agri-700 rounded-xl flex items-center justify-center mb-5">
                <Leaf className="w-6 h-6 text-agri-100" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy-900 mb-3">Our Mission</h3>
              <p className="text-sm text-navy-600 leading-relaxed">
                To empower farmers and FPOs by removing the middlemen — so growers keep more of what they
                earn, buyers get fresher produce at honest prices, and less food is wasted on the way.
              </p>
            </div>
            <div className="bg-mustard-50 rounded-3xl p-8 sm:p-10 border border-mustard-200/70">
              <div className="w-12 h-12 bg-mustard-400 rounded-xl flex items-center justify-center mb-5">
                <Star className="w-6 h-6 text-navy-900" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy-900 mb-3">Our Vision</h3>
              <p className="text-sm text-navy-600 leading-relaxed">
                An India where direct, technology-driven trade makes farming reliably profitable — with
                fair prices, AI-guided decisions and smart logistics strengthening farmers and the
                communities that feed us all.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY WE EXIST ═══════════════ */}
      <section className="py-20 sm:py-24 bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-mustard-300 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              The problem we exist to solve
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Mitti2Market exists
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Old way */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10">
              <div className="flex items-center gap-2 mb-6">
                <XCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white">The old supply chain</h3>
              </div>
              <ul className="space-y-3.5">
                {oldChain.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-navy-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400/70 shrink-0 mt-2" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            {/* Our way */}
            <div className="bg-agri-700/20 border border-agri-500/25 rounded-3xl p-8 sm:p-10">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-agri-300" />
                <h3 className="text-base font-bold text-white">What we do instead</h3>
              </div>
              <ul className="space-y-3.5">
                {ourWay.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-navy-200 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-agri-400 shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ VALUES ═══════════════ */}
      <section className="py-20 sm:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-navy-900/5 text-navy-700 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-4">
              What we stand for
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Our values
            </h2>
            <p className="text-base text-navy-500 max-w-2xl mx-auto">
              Every feature on Mitti2Market exists to serve the people at the two ends of the field.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm hover:shadow-md transition group">
                <div className="w-11 h-11 bg-mustard-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-mustard-100 transition">
                  <v.icon className="w-5 h-5 text-mustard-600" />
                </div>
                <h3 className="text-sm font-bold text-navy-900 mb-1.5">{v.title}</h3>
                <p className="text-[13px] text-navy-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-20 sm:py-24 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Supporting Farmers,<br />Strengthening Bharat.
          </h2>
          <p className="text-base text-navy-300 mb-8 max-w-xl mx-auto">
            Better income. Better future. Be part of the direct agri-marketplace changing how India trades.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-mustard-400 text-navy-900 font-bold rounded-xl hover:bg-mustard-300 transition shadow-lg shadow-mustard-400/20 text-base"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/25 text-base"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <Footer />
    </div>
  );
}
