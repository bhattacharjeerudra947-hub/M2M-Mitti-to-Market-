import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider, LanguageRouteSync } from './context/LanguageContext';
import { FarmerProvider } from './context/FarmerContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import ExploreMarketplace from './pages/ExploreMarketplace';
import Pricing from './pages/Pricing';
import AboutUs from './pages/AboutUs';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
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
import MessagePopup from './components/MessagePopup';
import Locations from './pages/Locations';
import RoleChoiceModal from './components/RoleChoiceModal';
import AuthRequiredModal from './components/AuthRequiredModal';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminReports from './pages/admin/AdminReports';
import AdminFeedback from './pages/admin/AdminFeedback';

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

export default function App() {
  return (
    <LanguageProvider>
    <Router>
      <ScrollToTop />
      <LanguageRouteSync />
      <AutoRotateSections />
      <AuthProvider>
        <MessagePopup />
        <RoleChoiceModal />
        <AuthRequiredModal />
        <RouteFade>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
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


          {/* Deal Workspace — shared by farmer & buyer */}
          <Route path="/deal/:dealId" element={<ProtectedRoute><DealWorkspace /></ProtectedRoute>} />

          {/* Admin Routes — protected by ADMIN role (frontend guard + Spring Security hasRole('ADMIN')) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="feedback" element={<AdminFeedback />} />
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
