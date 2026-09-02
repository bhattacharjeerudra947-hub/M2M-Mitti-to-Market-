<<<<<<< HEAD
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
=======
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c
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
<<<<<<< HEAD
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Landing />} />
=======
          <Route path="/signup" element={<Signup />} />

          {/* Farmer Routes — protected, require FARMER role */}
          <Route path="/farmer" element={<ProtectedRoute requiredRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/farmer/produce" element={<ProtectedRoute requiredRole="farmer"><FarmerProducts /></ProtectedRoute>} />
          <Route path="/farmer/add-produce" element={<ProtectedRoute requiredRole="farmer"><AddProduce /></ProtectedRoute>} />
          <Route path="/farmer/price-advisor" element={<ProtectedRoute requiredRole="farmer"><PriceAdvisorPage /></ProtectedRoute>} />
          <Route path="/farmer/buyer-requests" element={<ProtectedRoute requiredRole="farmer"><BuyerRequests /></ProtectedRoute>} />
          <Route path="/farmer/orders" element={<ProtectedRoute requiredRole="farmer"><FarmerOrders /></ProtectedRoute>} />
          <Route path="/farmer/logistics" element={<ProtectedRoute requiredRole="farmer"><FarmerLogistics /></ProtectedRoute>} />
          <Route path="/farmer/earnings" element={<ProtectedRoute requiredRole="farmer"><FarmerEarnings /></ProtectedRoute>} />

          {/* Business Routes — protected, require BUSINESS role */}
          <Route path="/business" element={<ProtectedRoute requiredRole="business"><BusinessDashboard /></ProtectedRoute>} />
          <Route path="/business/browse" element={<ProtectedRoute requiredRole="business"><Marketplace /></ProtectedRoute>} />
          <Route path="/business/product/:id" element={<ProtectedRoute requiredRole="business"><ProductDetails /></ProtectedRoute>} />
          <Route path="/business/bulk-order" element={<ProtectedRoute requiredRole="business"><BulkOrder /></ProtectedRoute>} />
          <Route path="/business/insights" element={<ProtectedRoute requiredRole="business"><MarketInsights /></ProtectedRoute>} />
          <Route path="/business/logistics" element={<ProtectedRoute requiredRole="business"><BusinessLogistics /></ProtectedRoute>} />
          <Route path="/business/orders" element={<ProtectedRoute requiredRole="business"><BusinessOrders /></ProtectedRoute>} />
          <Route path="/business/find-farmers" element={<ProtectedRoute requiredRole="business"><FindFarmers /></ProtectedRoute>} />
          <Route path="/business/suppliers" element={<ProtectedRoute requiredRole="business"><SavedSuppliers /></ProtectedRoute>} />
          <Route path="/business/analytics" element={<ProtectedRoute requiredRole="business"><BusinessAnalytics /></ProtectedRoute>} />
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c
        </Routes>
      </AuthProvider>
    </Router>
  );
}
