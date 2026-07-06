import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import FarmerDashboard from "./pages/FarmerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminListPage from "./pages/SuperAdminListPage";
import SuperAdminSectionPage from "./pages/SuperAdminSectionPage";
import AddProduct from "./pages/AddProduct";
import MyProducts from "./pages/MyProducts";
import PricePrediction from "./pages/PricePrediction";
import DiseaseDetection from "./pages/DiseaseDetection";
import Orders from "./pages/Orders";
import ProductDetails from "./pages/ProductDetails";
import BuyerOrders from "./pages/BuyerOrders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PublicProducts from "./pages/PublicProducts";
import PublicProductDetails from "./pages/PublicProductDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AIPricePrediction from "./pages/AIPricePrediction";
import NearbyFarmers from "./pages/NearbyFarmers";
import ProfitReport from "./pages/ProfitReport";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import FeatureHub from "./pages/FeatureHub";
import Forbidden from "./pages/Forbidden";
import RoleBasedRoute from "./components/RoleBasedRoute";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/products" element={<PublicProducts />} />

        <Route path="/products/:id" element={<PublicProductDetails />} />

        <Route path="/about" element={<About />} />

        <Route path="/contact" element={<Contact />} />

        <Route
          path="/farmer/dashboard"
          element={<RoleBasedRoute roles={["Farmer"]}><FarmerDashboard /></RoleBasedRoute>}
        />

        <Route
          path="/farmer-dashboard"
          element={<Navigate to="/farmer/dashboard" replace />}
        />

        <Route
          path="/buyer/dashboard"
          element={<RoleBasedRoute roles={["Buyer"]}><BuyerDashboard /></RoleBasedRoute>}
        />

        <Route
          path="/buyer-dashboard"
          element={<Navigate to="/buyer/dashboard" replace />}
        />

        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}><AdminDashboard /></ProtectedRoute>}
        />

        <Route
          path="/superadmin/dashboard"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminDashboard /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/create-admin"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="create-admin" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/users"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="users" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/farmers"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="farmers" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/buyers"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="buyers" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/admins"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="admins" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/verifications"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="verifications" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/products"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="products" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/orders"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="orders" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/payments"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="payments" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/transport"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="transport" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/complaints"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="complaints" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/ai-usage"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="ai-usage" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/activity"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminListPage section="activity" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/reports"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="reports" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/analytics"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="analytics" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/settings"
          element={<RoleBasedRoute roles={["SuperAdmin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="settings" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/ai-modules"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="ai-modules" /></RoleBasedRoute>}
        />

        <Route
          path="/superadmin/advertisements"
          element={<RoleBasedRoute roles={["SuperAdmin", "Admin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="advertisements" /></RoleBasedRoute>}
        />

        <Route
          path="/admin-dashboard"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        <Route
          path="/add-product"
          element={<Navigate to="/farmer/add-product" replace />}
        />

        <Route
          path="/farmer/add-product"
          element={<RoleBasedRoute roles={["Farmer"]}><AddProduct /></RoleBasedRoute>}
        />

        <Route
          path="/my-products"
          element={<Navigate to="/farmer/products" replace />}
        />

        <Route
          path="/farmer/products"
          element={<RoleBasedRoute roles={["Farmer"]}><MyProducts /></RoleBasedRoute>}
        />

        <Route
          path="/price-prediction"
          element={<Navigate to="/farmer/price-prediction" replace />}
        />

        <Route
          path="/farmer/price-prediction"
          element={<RoleBasedRoute roles={["Farmer"]}><PricePrediction /></RoleBasedRoute>}
        />

        <Route
          path="/disease-detection"
          element={<Navigate to="/farmer/disease-detection" replace />}
        />

        <Route
          path="/farmer/disease-detection"
          element={<RoleBasedRoute roles={["Farmer"]}><DiseaseDetection /></RoleBasedRoute>}
        />

        <Route
          path="/transport-sharing"
          element={<Navigate to="/farmer/transport" replace />}
        />

        <Route
          path="/farmer/transport"
          element={<RoleBasedRoute roles={["Farmer"]}><NearbyFarmers /></RoleBasedRoute>}
        />

        <Route
          path="/farmer/weather"
          element={<RoleBasedRoute roles={["Farmer"]}><Profile /></RoleBasedRoute>}
        />

        <Route
          path="/orders"
          element={<RoleBasedRoute roles={["Farmer", "Admin", "SuperAdmin"]}><Orders /></RoleBasedRoute>}
        />

        <Route
          path="/farmer/orders"
          element={<RoleBasedRoute roles={["Farmer"]}><Orders /></RoleBasedRoute>}
        />

        <Route
          path="/product-details"
          element={<Navigate to="/products" replace />}
        />

        <Route
          path="/product-details/:id"
          element={<PublicProductDetails />}
        />

        <Route
          path="/buyer-orders"
          element={<Navigate to="/buyer/orders" replace />}
        />

        <Route
          path="/buyer/orders"
          element={<RoleBasedRoute roles={["Buyer", "Admin", "SuperAdmin"]}><BuyerOrders /></RoleBasedRoute>}
        />

        <Route
          path="/buyer/products"
          element={<RoleBasedRoute roles={["Buyer"]}><BuyerDashboard /></RoleBasedRoute>}
        />

        <Route
          path="/buyer/notifications"
          element={<RoleBasedRoute roles={["Buyer"]}><Notifications /></RoleBasedRoute>}
        />

        <Route
          path="/buyer/profile"
          element={<RoleBasedRoute roles={["Buyer"]}><Profile /></RoleBasedRoute>}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* NEW ROUTES */}

        <Route
          path="/ai-price"
          element={<Navigate to="/farmer/ai-price" replace />}
        />

        <Route
          path="/farmer/ai-price"
          element={<RoleBasedRoute roles={["Farmer"]}><AIPricePrediction /></RoleBasedRoute>}
        />

        <Route
          path="/nearby-farmers"
          element={<Navigate to="/farmer/nearby-farmers" replace />}
        />

        <Route
          path="/farmer/nearby"
          element={<Navigate to="/farmer/nearby-farmers" replace />}
        />

        <Route
          path="/farmer/nearby-farmers"
          element={<RoleBasedRoute roles={["Farmer", "Buyer"]}><NearbyFarmers /></RoleBasedRoute>}
        />

        <Route
          path="/profit-report"
          element={<Navigate to="/farmer/profit-report" replace />}
        />

        <Route
          path="/farmer/profit-report"
          element={<RoleBasedRoute roles={["Farmer", "Admin", "SuperAdmin"]}><ProfitReport /></RoleBasedRoute>}
        />

        <Route
          path="/farmer/payments"
          element={<RoleBasedRoute roles={["Farmer", "Admin", "SuperAdmin"]}><Payments /></RoleBasedRoute>}
        />

        <Route
          path="/profile"
          element={<RoleBasedRoute roles={["Farmer", "Buyer", "Admin", "SuperAdmin"]}><Profile /></RoleBasedRoute>}
        />

        <Route
          path="/farmer/profile"
          element={<RoleBasedRoute roles={["Farmer"]}><Profile /></RoleBasedRoute>}
        />

        <Route
          path="/farmer/notifications"
          element={<RoleBasedRoute roles={["Farmer"]}><Notifications /></RoleBasedRoute>}
        />

        <Route
          path="/notifications"
          element={<RoleBasedRoute roles={["Farmer", "Buyer", "Admin", "SuperAdmin"]}><Notifications /></RoleBasedRoute>}
        />

        <Route
          path="/features"
          element={<RoleBasedRoute roles={["Farmer"]}><FeatureHub /></RoleBasedRoute>}
        />

        <Route path="/admin/farmers" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/buyers" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/products" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
        <Route path="/admin/payments" element={<RoleBasedRoute roles={["Admin", "SuperAdmin"]} forbidden={<Forbidden />}><SuperAdminListPage section="payments" /></RoleBasedRoute>} />
        <Route path="/admin/verification" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/complaints" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/settings" element={<RoleBasedRoute roles={["SuperAdmin"]} forbidden={<Forbidden />}><SuperAdminSectionPage section="settings" /></RoleBasedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
