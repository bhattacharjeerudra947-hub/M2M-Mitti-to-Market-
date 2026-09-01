import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, PlusCircle, Brain, ShoppingCart, ClipboardList, Truck, Wallet, User, Bell, Settings, LogOut, Store, Search, FileText, Heart, BarChart3, X, Menu, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import M2MLogo from './M2MLogo';

const farmerLinks = [
  { to: '/farmer', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/produce', icon: Package, label: 'My Produce' },
  { to: '/farmer/add-produce', icon: PlusCircle, label: 'Add Produce' },
  { to: '/farmer/price-advisor', icon: Brain, label: 'AI Price Advisor' },
  { to: '/farmer/buyer-requests', icon: ShoppingCart, label: 'Buyer Requests' },
  { to: '/farmer/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/farmer/logistics', icon: Truck, label: 'Logistics' },
  { to: '/farmer/earnings', icon: Wallet, label: 'Earnings' },
];

const businessLinks = [
  { to: '/business', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/business/browse', icon: Search, label: 'Browse Produce' },
  { to: '/business/find-farmers', icon: User, label: 'Find Farmers' },
  { to: '/business/bulk-order', icon: FileText, label: 'Bulk Orders' },
  { to: '/business/orders', icon: ClipboardList, label: 'My Orders' },
  { to: '/business/suppliers', icon: Heart, label: 'Saved Suppliers' },
  { to: '/business/insights', icon: TrendingUp, label: 'Market Insights' },
  { to: '/business/logistics', icon: Truck, label: 'Logistics' },
  { to: '/business/analytics', icon: BarChart3, label: 'Analytics' },
];

const bottomLinks = [
  { to: '#', icon: User, label: 'Profile' },
  { to: '#', icon: Bell, label: 'Notifications' },
  { to: '#', icon: Settings, label: 'Settings' },
  { to: '/login', icon: LogOut, label: 'Logout' },
];

export default function Sidebar({ role = 'farmer' }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = role === 'farmer' ? farmerLinks : businessLinks;
  const profile = role === 'farmer' ? 'Rajesh Kumar' : 'FreshMart';
  const profileIcon = role === 'farmer' ? '👨‍🌾' : '🏪';

  const NavLink = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-mustard-50 text-navy-900 border border-mustard-200 shadow-sm'
            : 'text-navy-600 hover:bg-mustard-50/50 hover:text-navy-900'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-navy-900' : 'text-navy-400'}`} />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Link to="/" className="flex items-center mb-6">
          <M2MLogo size="sm" />
        </Link>
        <div className="flex items-center gap-3 mb-6 p-3 bg-mustard-50 border border-mustard-200 rounded-xl">
          <span className="text-2xl">{profileIcon}</span>
          <div>
            <p className="text-sm font-semibold text-navy-900">{profile}</p>
            <p className="text-xs text-navy-500 capitalize">{role} Account</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => (
          <NavLink key={link.to} {...link} />
        ))}
      </div>

      <div className="border-t border-navy-100 p-3 space-y-0.5">
        {bottomLinks.map((link) => (
          <NavLink key={link.label} {...link} />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg rounded-xl p-2 border border-navy-100"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5 text-navy-900" /> : <Menu className="w-5 h-5 text-navy-900" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-navy-100 h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-navy-900/20" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col border-r border-navy-100">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
