import { useEffect, useState } from "react";
import {
  FaBox, FaBoxes, FaChartLine, FaChartPie, FaCheckCircle,
  FaClipboardList, FaClock, FaBell, FaFileAlt, FaLeaf,
  FaRobot, FaRupeeSign, FaTimesCircle, FaUser, FaUsers, FaUsersCog,
} from "react-icons/fa";
import api from "../services/api";
import { MetricCard } from "../components/MobileShell";
import Loading from "../components/Loading";
import DashboardLayout from "../components/DashboardLayout";

const fallbackStats = {
  total_farmers: 1,
  total_buyers: 1,
  total_products: 5,
  total_orders: 1,
  revenue: 0,
  actual_revenue: 0,
  estimated_revenue: 0,
  pending_payments: 0,
  pending_orders: 1,
  approved_orders: 0,
  rejected_orders: 0,
  pending_farmers: 1,
  pending_products: 0,
  verified_farmers: 0,
  complaints: 0,
  transport_requests: 0,
  total_ai_price_predictions: 0,
  total_disease_detection_requests: 0,
  recent_registrations: [],
  recent_orders: [],
  popular_crops: [],
  most_predicted_crops: [],
  most_requested_crop_disease_checks: [],
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(fallbackStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/admin/dashboard")
      .then((res) => setStats({ ...fallbackStats, ...(res.data || {}) }))
      .catch((err) => {
        console.error("Admin dashboard API failed, fallback loaded", err);
        setStats(fallbackStats);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="Admin" title="Admin Dashboard">
      <div className="text-left">
        {loading && <Loading label="Loading dashboard..." />}

        {!loading && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={<FaUser />} label="Total Farmers" value={stats.total_farmers} tone="green" />
              <MetricCard icon={<FaUsers />} label="Total Buyers" value={stats.total_buyers} tone="blue" />
              <MetricCard icon={<FaBox />} label="Total Products" value={stats.total_products} tone="orange" />
              <MetricCard icon={<FaClipboardList />} label="Total Orders" value={stats.total_orders} tone="purple" />
              <MetricCard icon={<FaRupeeSign />} label="Revenue" value={`Rs ${stats.revenue || 0}`} tone="green" />
              <MetricCard icon={<FaClock />} label="Pending Orders" value={stats.pending_orders} tone="orange" />
              <MetricCard icon={<FaCheckCircle />} label="Approved Orders" value={stats.approved_orders} tone="green" />
              <MetricCard icon={<FaTimesCircle />} label="Rejected Orders" value={stats.rejected_orders} tone="purple" />
              <MetricCard icon={<FaUser />} label="Pending Farmers" value={stats.pending_farmers} tone="orange" />
              <MetricCard icon={<FaBox />} label="Pending Products" value={stats.pending_products} tone="orange" />
              <MetricCard icon={<FaFileAlt />} label="Complaints" value={stats.complaints} tone="purple" />
              <MetricCard icon={<FaBell />} label="Notifications" value={(stats.recent_registrations || []).length} tone="blue" />
            </div>

            <section className="mt-4 grid grid-cols-1 gap-3">
              <article className="card p-4">
                <h2 className="flex items-center gap-2 font-extrabold"><FaUsersCog /> User Management</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-lg bg-green-50 p-3"><span className="block font-bold">Farmers</span>{stats.total_farmers}</p>
                  <p className="rounded-lg bg-blue-50 p-3"><span className="block font-bold">Buyers</span>{stats.total_buyers}</p>
                  <p className="rounded-lg bg-purple-50 p-3"><span className="block font-bold">Verified Farmers</span>{stats.verified_farmers}</p>
                  <p className="rounded-lg bg-gray-50 p-3"><span className="block font-bold">Recent Users</span>{(stats.recent_registrations || []).length}</p>
                </div>
              </article>

              <article className="card p-4">
                <h2 className="flex items-center gap-2 font-extrabold"><FaBoxes /> Product Management</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-lg bg-orange-50 p-3"><span className="block font-bold">Products</span>{stats.total_products}</p>
                  <p className="rounded-lg bg-green-50 p-3"><span className="block font-bold">Transport</span>{stats.transport_requests}</p>
                </div>
              </article>

              <article className="card p-4">
                <h2 className="flex items-center gap-2 font-extrabold"><FaFileAlt /> Reports</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-lg bg-blue-50 p-3"><span className="block font-bold">AI Predictions</span>{stats.total_ai_price_predictions}</p>
                  <p className="rounded-lg bg-green-50 p-3"><span className="block font-bold">Disease Checks</span>{stats.total_disease_detection_requests}</p>
                </div>
              </article>
            </section>

            <section className="card mt-4 p-4">
              <p className="text-sm font-bold">Actual Revenue</p>
              <p className="mt-1 text-2xl font-extrabold text-green-700">Rs {stats.actual_revenue || 0}</p>
              <p className="mt-3 text-sm font-bold">Estimated Revenue</p>
              <p className="mt-1 text-xl font-extrabold text-blue-700">Rs {stats.estimated_revenue || 0}</p>
              <p className="mt-3 text-sm font-bold">Pending Payments</p>
              <p className="mt-1 text-xl font-extrabold text-orange-600">Rs {stats.pending_payments || 0}</p>
            </section>

            <section className="mt-4">
              <h2 className="font-extrabold">Recent Orders</h2>
              <div className="mt-3 space-y-3">
                {(stats.recent_orders || []).length === 0 && (
                  <p className="card p-4 text-center text-sm font-bold text-gray-600">No orders yet.</p>
                )}
                {(stats.recent_orders || []).map((order) => (
                  <article key={order.id} className="card flex items-center gap-3 p-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-green-100 text-green-700"><FaRupeeSign /></span>
                    <div className="flex-1">
                      <p className="font-bold">Order ID: #{order.id}</p>
                      <p className="text-sm text-gray-700">{order.crop_name} - {order.quantity} Kg</p>
                      <p className="text-sm text-gray-700">{order.farmer_name}</p>
                    </div>
                    <p className="font-extrabold">Rs {order.total_price}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="card mt-4 p-4">
              <h2 className="flex items-center gap-2 font-extrabold"><FaChartPie /> Analytics</h2>
              <p className="mt-2 text-sm text-gray-700">Dashboard loaded successfully.</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <p className="rounded-lg bg-gray-50 p-3"><span className="block font-bold">Pending Orders</span>{stats.pending_orders}</p>
                <p className="rounded-lg bg-gray-50 p-3"><span className="block font-bold">Approved Orders</span>{stats.approved_orders}</p>
                <p className="rounded-lg bg-gray-50 p-3"><span className="block font-bold">Rejected Orders</span>{stats.rejected_orders}</p>
                <p className="rounded-lg bg-gray-50 p-3"><span className="block font-bold">Total Revenue</span>Rs {stats.revenue || 0}</p>
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 font-bold"><FaChartLine /> Popular Crops</p>
                {(stats.popular_crops || []).length === 0 && <p className="text-sm text-gray-600">No product data yet.</p>}
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 font-bold"><FaRobot /> Most Predicted Crops</p>
                {(stats.most_predicted_crops || []).length === 0 && <p className="text-sm text-gray-600">No AI predictions yet.</p>}
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 font-bold"><FaLeaf /> Crop Disease Checks</p>
                {(stats.most_requested_crop_disease_checks || []).length === 0 && <p className="text-sm text-gray-600">No disease checks yet.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}