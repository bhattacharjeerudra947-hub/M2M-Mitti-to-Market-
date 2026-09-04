import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

// Scroll to the top whenever the route changes, so navigating between pages never opens mid-page
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Public landing sections, rotated automatically every 10 seconds
const ROTATING_SECTIONS = ['/', '/how-it-works', '/marketplace', '/pricing', '/about-us'];
const ROTATION_INTERVAL_MS = 6000;

// Rotates through the public landing pages every 10s. The countdown resets
// whenever the route changes, so manual navigation continues the rotation
// from the currently selected section. The timer pauses while a form field
// is focused so the transition never destroys user input.
function AutoRotateSections() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const timerRef = useRef(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    const isRotatingPage = ROTATING_SECTIONS.includes(pathnameRef.current);

    const isFormControl = (el) =>
      !!el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

    const scheduleNext = () => {
      if (!isRotatingPage) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const idx = ROTATING_SECTIONS.indexOf(pathnameRef.current);
        navigate(ROTATING_SECTIONS[(idx + 1) % ROTATING_SECTIONS.length]);
      }, ROTATION_INTERVAL_MS);
    };

    const pauseWhileTyping = (e) => {
      if (isFormControl(e.target)) clearTimeout(timerRef.current);
    };
    const resumeAfterTyping = (e) => {
      if (isFormControl(e.target)) scheduleNext();
    };

    scheduleNext();
    document.addEventListener('focusin', pauseWhileTyping);
    document.addEventListener('focusout', resumeAfterTyping);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('focusin', pauseWhileTyping);
      document.removeEventListener('focusout', resumeAfterTyping);
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
    <Router>
      <ScrollToTop />
      <AutoRotateSections />
      <AuthProvider>
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
            <Route path="orders" element={<FarmerOrders />} />
            <Route path="logistics" element={<FarmerLogistics />} />
            <Route path="earnings" element={<FarmerEarnings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:conversationId/:otherUserId" element={<Chat />} />
          </Route>

          {/* Business Routes — protected by role */}
          <Route path="/business" element={<ProtectedRoute role="business"><Outlet /></ProtectedRoute>}>
            <Route index element={<BusinessDashboard />} />
            <Route path="browse" element={<Marketplace />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="bulk-order" element={<BulkOrder />} />
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
  );
}
