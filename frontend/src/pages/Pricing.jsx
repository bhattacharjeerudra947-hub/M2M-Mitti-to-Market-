import { Link } from 'react-router-dom';
import { ArrowRight, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TransparentPricing from '../components/TransparentPricing';

const proofPoints = [
  { icon: TrendingUp, tint: 'text-agri-700 bg-agri-50', title: 'Farmers earn up to 17% more', desc: 'By selling directly to buyers, without trader margins.' },
  { icon: TrendingDown, tint: 'text-red-600 bg-red-50', title: 'Buyers pay up to 14% less', desc: 'Fresh produce at honest, transparent market rates.' },
  { icon: Shield, tint: 'text-navy-700 bg-navy-50', title: 'No hidden fees — ever', desc: 'See exactly what you earn and what buyers pay on every trade.' },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar dark />

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        style={{
          backgroundImage:
            'linear-gradient(rgba(16, 42, 67, 0.55), rgba(16, 42, 67, 0.55)), url(https://i.ibb.co/zhQ4vWmp/farmersmiling.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-mustard-400/10 border border-mustard-400/25 rounded-full mb-6">
              <span className="text-[13px] font-medium text-mustard-300">Transparent Pricing</span>
            </div>
            <h1 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-white mb-6">
              Fair prices on<br />
              <span className="text-mustard-400">every single trade.</span>
            </h1>
            <p className="text-base sm:text-lg text-navy-200 mb-8 max-w-xl leading-relaxed">
              No commissions eating into your margins. No opaque rates. Mitti2Market is a direct
              marketplace — farmers set their price, buyers see it, and everyone knows the value is real.
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
      </section>

      {/* ═══════════════ PRICING COMPARISON (existing component) ═══════════════ */}
      <TransparentPricing />

      {/* ═══════════════ PROOF POINTS ═══════════════ */}
      <section className="py-16 sm:py-20 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-5">
            {proofPoints.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-navy-100/50 shadow-sm text-center">
                <div className={`w-11 h-11 ${p.tint} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-navy-900 mb-1.5">{p.title}</h3>
                <p className="text-[13px] text-navy-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-20 sm:py-24 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Everyone wins. No middlemen.
          </h2>
          <p className="text-base text-navy-300 mb-8 max-w-xl mx-auto">
            Join the marketplace where farmers earn more, buyers pay less and food waste is reduced.
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
