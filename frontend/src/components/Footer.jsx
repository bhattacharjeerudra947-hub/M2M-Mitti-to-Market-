import { Link } from 'react-router-dom';

const pageLinks = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About Us', to: '/about-us' },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-navy-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:items-start">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
            <div className="flex items-center gap-2">
              <img src="https://i.postimg.cc/L89VZ3GK/icon.png" alt="Mitti2Market logo" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold text-sm">Mitti2Market</span>
            </div>
            <p className="text-xs text-navy-500 max-w-[240px] leading-relaxed">
              From farm to market, without the middlemen. Direct agri marketplace for farmers, FPOs and buyers.
            </p>
          </div>

          {/* Page links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {pageLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs text-navy-400 hover:text-mustard-300 transition"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/signup" className="text-xs font-semibold text-navy-900 bg-mustard-400 hover:bg-mustard-300 px-3.5 py-1.5 rounded-lg transition">
              Get Started
            </Link>
          </nav>
        </div>
        <div className="border-t border-navy-800/50 mt-6 pt-6 text-center text-xs text-navy-600">
          <p className="mb-1">SIH 26033 — Direct Agri Marketplace</p>
          <p>© 2026 Mitti2Market. All rights reserved. Built for Smart India Hackathon.</p>
        </div>
      </div>
    </footer>
  );
}
