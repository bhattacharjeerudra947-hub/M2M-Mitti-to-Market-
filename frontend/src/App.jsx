import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FarmerProvider } from './context/FarmerContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
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
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Landing />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
