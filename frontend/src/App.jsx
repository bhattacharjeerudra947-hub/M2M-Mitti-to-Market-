import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Farmer Routes */}
        <Route path="/farmer" element={<FarmerDashboard />} />
        <Route path="/farmer/produce" element={<FarmerProducts />} />
        <Route path="/farmer/add-produce" element={<AddProduce />} />
        <Route path="/farmer/price-advisor" element={<PriceAdvisorPage />} />
        <Route path="/farmer/buyer-requests" element={<BuyerRequests />} />
        <Route path="/farmer/orders" element={<FarmerOrders />} />
        <Route path="/farmer/logistics" element={<FarmerLogistics />} />
        <Route path="/farmer/earnings" element={<FarmerEarnings />} />

        {/* Business Routes */}
        <Route path="/business" element={<BusinessDashboard />} />
        <Route path="/business/browse" element={<Marketplace />} />
        <Route path="/business/product/:id" element={<ProductDetails />} />
        <Route path="/business/bulk-order" element={<BulkOrder />} />
        <Route path="/business/insights" element={<MarketInsights />} />
        <Route path="/business/logistics" element={<BusinessLogistics />} />
        <Route path="/business/orders" element={<BusinessOrders />} />
        <Route path="/business/find-farmers" element={<FindFarmers />} />
        <Route path="/business/suppliers" element={<SavedSuppliers />} />
        <Route path="/business/analytics" element={<BusinessAnalytics />} />
      </Routes>
    </Router>
  );
}
