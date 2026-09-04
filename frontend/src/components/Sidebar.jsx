import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, PlusCircle, Brain, ShoppingCart, ClipboardList, Truck, Wallet, User, Bell, Settings, LogOut, Search, FileText, Heart, BarChart3, X, Menu, TrendingUp, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import M2MLogo from './M2MLogo';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';
import { getMyDocuments } from '../services/api';

const farmerLinks = [
  { to: '/farmer', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/produce', icon: Package, label: 'My Produce' },
  { to: '/farmer/add-produce', icon: PlusCircle, label: 'Add Produce' },
  { to: '/farmer/price-advisor', icon: Brain, label: 'AI Price Advisor' },
  { to: '/farmer/buyer-requests', icon: ShoppingCart, label: 'Buyer Requests' },
  { to: '/farmer/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/farmer/earnings', icon: Wallet, label: 'Earnings' },
  { to: '/farmer/chat', icon: MessageCircle, label: 'Messages' },
  { to: '/farmer/deals', icon: Package, label: 'My Deals' },
];

const businessLinks = [
  { to: '/business', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/business/browse', icon: Search, label: 'Browse Produce' },
  { to: '/business/find-farmers', icon: User, label: 'Find Farmers' },
  { to: '/business/bulk-order', icon: FileText, label: 'Bulk Orders' },
  { to: '/business/orders', icon: ClipboardList, label: 'My Orders' },
  { to: '/business/suppliers', icon: Heart, label: 'Saved Suppliers' },
  { to: '/business/insights', icon: TrendingUp, label: 'Market Insights' },
  { to: '/business/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/business/chat', icon: MessageCircle, label: 'Messages' },
  { to: '/business/deals', icon: Package, label: 'My Purchases' },
];

export default function Sidebar({ role = 'farmer' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  const links = role === 'farmer' ? farmerLinks : businessLinks;
  const profileName = user?.name || (role === 'farmer' ? 'Farmer' : 'Business');
  const profileIcon = role === 'farmer' ? '👨‍🌾' : '🏪';

  useEffect(() => {
    async function loadPhoto() {
      const result = await getMyDocuments();
      if (result.ok && result.data?.data) {
        const photo = result.data.data.find(d => d.documentType === 'PROFILE_PHOTO' && d.verificationStatus !== 'REJECTED');
        if (photo?.cloudinaryUrl) setProfilePhotoUrl(photo.cloudinaryUrl);
      }
    }
    loadPhoto();
  }, []);

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login', { replace: true });
  };

  const NavLink = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
    return (
      <Link to={to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-mustard-50 text-navy-900 border border-mustard-200 shadow-sm' : 'text-navy-600 hover:bg-mustard-50/50 hover:text-navy-900'}`}>
        <Icon className={`w-5 h-5 ${isActive ? 'text-navy-900' : 'text-navy-400'}`} />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Link to="/" className="flex items-center mb-6"><M2MLogo size="sm" /></Link>
        <div className="flex items-center gap-3 mb-6 p-3 bg-mustard-50 border border-mustard-200 rounded-xl">
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-mustard-300" />
          ) : (
            <span className="text-2xl">{profileIcon}</span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900 truncate">{profileName}</p>
            <p className="text-xs text-navy-500 capitalize">{role} Account</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => <NavLink key={link.to} {...link} />)}
      </div>

      <div className="border-t border-navy-100 p-3 space-y-0.5">
        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <NavLink to="/profile" icon={User} label="Profile" />
        </Link>
        <button onClick={() => setShowNotifications(!showNotifications)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 hover:bg-mustard-50/50 hover:text-navy-900 transition-all relative">
          <NotificationPanel compact />
          <span>Notifications</span>
          {showNotifications && <span className="ml-1 text-[10px] text-navy-400">(open)</span>}
        </button>
        <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut className="w-5 h-5 text-navy-400" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg rounded-xl p-2 border border-navy-100" onClick={() => setMobileOpen(!mobileOpen)}>
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

      {/* Notifications modal — works on all screen sizes */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-900/20" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-4 top-16 w-96 max-w-[calc(100vw-2rem)] z-50">
            <NotificationPanel />
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Log out?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleLogout} className="flex-1 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition">
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
