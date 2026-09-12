import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, LanguageRouteSync } from './context/LanguageContext';
import { FarmerProvider } from './context/FarmerContext';

import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import ExploreMarketplace from './pages/ExploreMarketplace';
import Pricing from './pages/Pricing';
import AboutUs from './pages/AboutUs';
import Login from './pages/Login';
import FarmerLogin from './pages/FarmerLogin';
import BusinessLogin from './pages/BusinessLogin';
import AdminLogin from './pages/AdminLogin';
import SignUp from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import FarmerDashboard from './pages/FarmerDashboard';
import FarmerProducts from './pages/FarmerProducts';
import AddProduce from './pages/AddProduce';
import PriceAdvisorPage from './pages/PriceAdvisorPage';
import BuyerRequests from './pages/BuyerRequests';
import FarmerOrders from './pages/FarmerOrders';
import FarmerLogistics from './pages/FarmerLogistics';
import FarmerEarnings from './pages/FarmerEarnings';
import BusinessDashboard from './pages/BusinessDashboard';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import BulkOrder from './pages/BulkOrder';
import MarketInsights from './pages/MarketInsights';
import BusinessLogistics from './pages/BusinessLogistics';
import BusinessOrders from './pages/BusinessOrders';
import FindFarmers from './pages/FindFarmers';
import SavedSuppliers from './pages/SavedSuppliers';
import BusinessAnalytics from './pages/BusinessAnalytics';
import FarmerRegistration from './pages/FarmerRegistration';
import BusinessRegistration from './pages/BusinessRegistration';
import Chat from './pages/Chat';
import MyDeals from './pages/MyDeals';
import DealWorkspace from './pages/DealWorkspace';
import OfflineDrafts from './pages/OfflineDrafts';
import DealAdvisor from './pages/DealAdvisor';
import BuyerRequirements from './pages/BuyerRequirements';
import FarmerMatches from './pages/FarmerMatches';
import MessagePopup from './components/MessagePopup';
import LiveNotificationToast from './components/LiveNotificationToast';
import Locations from './pages/Locations';
import RoleChoiceModal from './components/RoleChoiceModal';
import AuthRequiredModal from './components/AuthRequiredModal';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminReports from './pages/admin/AdminReports';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminDeals from './pages/admin/AdminDeals';
import AdminProduce from './pages/admin/AdminProduce';
import AdminLogistics from './pages/admin/AdminLogistics';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminAppeals from './pages/admin/AdminAppeals';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';
import AccountStatusScreen from './pages/AccountStatusScreen';

// Scroll to the top whenever the route changes, so navigating between pages never opens mid-page
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Public landing pages, advanced automatically after 10s of continuous
// user inactivity. Any detected activity (scroll, wheel, mouse movement /
// clicks / hover, keyboard, touch) restarts the countdown, so the page
// never switches while the user is interacting.
const ROTATING_SECTIONS = ['/', '/how-it-works', '/marketplace', '/pricing', '/about-us'];
const INACTIVITY_MS = 10000;
const ACTIVITY_EVENTS = [
  'scroll',
  'wheel',
  'mousemove',
  'mouseover',
  'mousedown',
  'mouseup',
  'click',
  'keydown',
  'keyup',
  'touchstart',
  'touchmove',
  'touchend',
];

// Advances through the public pages only after INACTIVITY_MS of continuous
// inactivity. Every user activity clears and restarts the single countdown;
// the countdown also restarts on route change (manual navigation) and is
// always cleared when the route leaves the rotation or the component unmounts.
function AutoRotateSections() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ROTATING_SECTIONS.includes(pathname)) return undefined;

    const scheduleNext = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const idx = ROTATING_SECTIONS.indexOf(pathname);
        navigate(ROTATING_SECTIONS[(idx + 1) % ROTATING_SECTIONS.length]);
      }, INACTIVITY_MS);
    };

    scheduleNext();
    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, scheduleNext, { passive: true }),
    );

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, scheduleNext),
      );
    };
  }, [pathname, navigate]);

  return null;
}

// Subtle fade between routes (used by the auto-rotation and manual navigation)
function RouteFade({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  );
}

function FarmerLayout() {
  return (
    <ProtectedRoute role="farmer">
      <FarmerProvider>
        <Outlet />
      </FarmerProvider>
    </ProtectedRoute>
  );
}

function GlobalAccountStatusBanner() {
  const { user } = useAuth();
  if (!user || (user.status !== 'DEACTIVATED' && user.status !== 'SUSPENDED')) return null;

  const isDeactivated = user.status === 'DEACTIVATED';
  const bgClass = isDeactivated ? 'bg-red-600 border-b border-red-700 text-white' : 'bg-amber-600 border-b border-amber-700 text-white';

  return (
    <div className={`sticky top-0 z-[999] px-4 py-2.5 shadow-lg flex items-center justify-between gap-3 text-xs ${bgClass}`}>
      <div className="flex items-center gap-2.5 max-w-6xl mx-auto w-full">
        <span className="text-base shrink-0">{isDeactivated ? '⛔' : '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <span className="font-extrabold uppercase tracking-wider mr-2">
            {isDeactivated ? 'Account Deactivated' : 'Account Suspended'}:
          </span>
          <span className="font-medium">
            {user.statusReason || 'Administrative action was taken on this account. Marketplace actions are temporarily locked.'}
          </span>
          {user.statusUpdatedAt && (
            <span className="opacity-75 ml-2 text-[11px] hidden md:inline">
              ({new Date(user.statusUpdatedAt).toLocaleString()})
            </span>
          )}
        </div>
        <a
          href="mailto:support@mitti2market.com?subject=Account Appeal"
          className="shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold underline transition"
        >
          Contact Admin
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    
  <LanguageProvider>
    <Router>
      <ScrollToTop />
      <LanguageRouteSync />
      <AutoRotateSections />
      <AuthProvider>
        <GlobalAccountStatusBanner />
        <MessagePopup />
        <LiveNotificationToast />
        <RoleChoiceModal />
        <AuthRequiredModal />
        <RouteFade>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Role-locked login portals — each accepts only its own role and guards against URL bypass */}
          <Route path="/farmer/login" element={<FarmerLogin />} />
          <Route path="/business/login" element={<BusinessLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/marketplace" element={<ExploreMarketplace />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about-us" element={<AboutUs />} />

          {/* Registration wizards (authenticated) */}
          <Route path="/register/farmer" element={<ProtectedRoute role="farmer"><FarmerRegistration /></ProtectedRoute>} />
          <Route path="/register/business" element={<ProtectedRoute role="business"><BusinessRegistration /></ProtectedRoute>} />

          {/* Profile (any authenticated user) */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Farmer Routes — protected by role */}
          <Route path="/farmer" element={<FarmerLayout />}>
            <Route index element={<FarmerDashboard />} />
            <Route path="produce" element={<FarmerProducts />} />
            <Route path="add-produce" element={<AddProduce />} />
            <Route path="matches" element={<FarmerMatches />} />
            <Route path="price-advisor" element={<PriceAdvisorPage />} />
            <Route path="buyer-requests" element={<BuyerRequests />} />
            <Route path="deal-advisor" element={<DealAdvisor />} />
            <Route path="orders" element={<FarmerOrders />} />
            <Route path="logistics" element={<FarmerLogistics />} />
            <Route path="earnings" element={<FarmerEarnings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:conversationId/:otherUserId" element={<Chat />} />
            <Route path="deals" element={<MyDeals />} />
            <Route path="offline-drafts" element={<OfflineDrafts />} />
          </Route>


          {/* Account Status / Appeal dedicated route */}
          <Route path="/suspended" element={<AccountStatusScreen />} />

          {/* Deal Workspace — shared by farmer & buyer */}
          <Route path="/deal/:dealId" element={<ProtectedRoute><DealWorkspace /></ProtectedRoute>} />

          {/* Admin Routes — protected by ADMIN role (frontend guard + Spring Security hasRole('ADMIN')) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="appeals" element={<AdminAppeals />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="deals" element={<AdminDeals />} />
            <Route path="produce" element={<AdminProduce />} />
            <Route path="logistics" element={<AdminLogistics />} />
            <Route path="vehicles" element={<AdminVehicles />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Live Locations — shared by farmer & buyer */}
          <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />

          {/* Business Routes — protected by role */}
          <Route path="/business" element={<ProtectedRoute role="business"><Outlet /></ProtectedRoute>}>
            <Route index element={<BusinessDashboard />} />
            <Route path="browse" element={<Marketplace />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="bulk-order" element={<BulkOrder />} />
            <Route path="requirements" element={<BuyerRequirements />} />
            <Route path="insights" element={<MarketInsights />} />
            <Route path="logistics" element={<BusinessLogistics />} />
            <Route path="orders" element={<BusinessOrders />} />
            <Route path="find-farmers" element={<FindFarmers />} />
            <Route path="suppliers" element={<SavedSuppliers />} />
            <Route path="analytics" element={<BusinessAnalytics />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:conversationId/:otherUserId" element={<Chat />} />
            <Route path="deals" element={<MyDeals />} />
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Landing />} />
        </Routes>
        </RouteFade>
      </AuthProvider>
    </Router>
  </LanguageProvider>
  );
}
