import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaAd,
  FaBrain,
  FaChartLine,
  FaCog,
  FaCreditCard,
  FaFileExport,
  FaRupeeSign,
  FaShieldAlt,
  FaShoppingBag,
  FaTruck,
  FaUserCheck,
  FaUsers,
  FaUsersCog,
} from "react-icons/fa";
import api from "../services/api";
import { MetricCard } from "../components/MobileShell";
import Loading from "../components/Loading";
import Forbidden from "./Forbidden";
import DashboardLayout from "../components/DashboardLayout";

function MiniChart({ title, points = [], tone = "#6d28d9" }) {
  const max = Math.max(...points.map((item) => Number(item.value || 0)), 1);
  const graph = points.slice(-8).map((item, index) => {
    const x = index * 36;
    const y = 72 - (Number(item.value || 0) / max) * 58;
    return `${x},${y}`;
  }).join(" ");

  return (
    <article className="card p-4">
      <p className="font-extrabold">{title}</p>
      <svg className="line-chart mt-3" viewBox="0 0 260 82" role="img" aria-label={title}>
        <polyline fill="none" stroke={tone} strokeWidth="3" points={graph || "0,72 260,72"} />
      </svg>
    </article>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/superadmin/dashboard")
      .then((res) => setStats(res.data))
      .catch((apiError) => setError(apiError.response?.status === 403 ? "403" : apiError.response?.data?.message || "Unable to load Super Admin dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (error === "403") return <Forbidden />;

  const actions = [
    ["Create Admin", FaShieldAlt, "/superadmin/create-admin"],
    ["Manage Admins", FaUsersCog, "/superadmin/admins"],
    ["Manage Users", FaUsers, "/superadmin/users"],
    ["Reports", FaFileExport, "/superadmin/reports"],
    ["Analytics", FaChartLine, "/superadmin/analytics"],
    ["Payments", FaCreditCard, "/superadmin/payments"],
    ["Settings", FaCog, "/superadmin/settings"],
    ["AI Modules", FaBrain, "/superadmin/ai-modules"],
    ["Advertisements", FaAd, "/superadmin/advertisements"],
  ];

  const cards = [
    ["/superadmin/users", <FaUsers />, "Total Users", stats?.total_users, "purple"],
    ["/superadmin/farmers", <FaUserCheck />, "Farmers", stats?.total_farmers, "green"],
    ["/superadmin/buyers", <FaUsers />, "Buyers", stats?.total_buyers, "blue"],
    ["/superadmin/admins", <FaShieldAlt />, "Admins", stats?.total_admins, "purple"],
    ["/superadmin/farmers", <FaUserCheck />, "Verified Farmers", stats?.verified_farmers, "green"],
    ["/superadmin/verifications", <FaUsersCog />, "Pending Verification", stats?.pending_verification, "orange"],
    ["/superadmin/products", <FaShoppingBag />, "Products", stats?.total_products, "orange"],
    ["/superadmin/orders", <FaShoppingBag />, "Orders", stats?.total_orders, "purple"],
    ["/superadmin/payments", <FaRupeeSign />, "Payments", stats?.payments, "green"],
    ["/superadmin/transport", <FaTruck />, "Transport", stats?.transport_requests, "blue"],
    ["/superadmin/complaints", <FaFileExport />, "Complaints", stats?.complaints, "orange"],
    ["/superadmin/ai-usage", <FaBrain />, "AI Usage", stats?.ai_usage, "purple"],
    ["/superadmin/activity", <FaChartLine />, "Daily Active", stats?.daily_active_users, "green"],
  ];

  return (
    <DashboardLayout role="SuperAdmin" title="Super Admin">
        <div className="text-left">
          {loading && <Loading label="Loading platform analytics..." />}
          {!loading && error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {!loading && stats && (
            <>
              <section className="rounded-lg bg-gradient-to-br from-purple-800 to-green-700 p-4 text-white shadow-lg">
                <p className="text-sm font-bold opacity-90">FarmKart Platform Control</p>
                <p className="mt-2 text-3xl font-extrabold">Rs {stats.revenue || 0}</p>
                <p className="mt-1 text-sm font-semibold opacity-90">Total revenue from live MySQL records</p>
              </section>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(([path, icon, label, value, tone]) => (
                  <button key={label} type="button" className="cursor-pointer rounded-lg text-left transition hover:-translate-y-0.5 active:scale-[0.98]" onClick={() => navigate(path)}>
                    <MetricCard icon={icon} label={label} value={value || 0} tone={tone} />
                  </button>
                ))}
              </div>

              <section className="mt-4 grid grid-cols-2 gap-2">
                {actions.map(([label, Icon, path]) => (
                  <button key={label} type="button" className="card flex min-h-[58px] items-center gap-2 p-3 text-left text-sm font-extrabold text-gray-900 transition hover:-translate-y-0.5 active:scale-[0.98]" onClick={() => navigate(path)}>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-100 text-purple-700"><Icon /></span>
                    {label}
                  </button>
                ))}
              </section>

              <section className="mt-4 grid gap-3">
                <MiniChart title="Revenue" points={stats.charts?.revenue || []} tone="#16a34a" />
                <MiniChart title="Orders" points={stats.charts?.orders || []} tone="#2563eb" />
                <MiniChart title="Products" points={stats.charts?.products || []} tone="#f97316" />
                <MiniChart title="User Growth" points={stats.charts?.user_growth || []} tone="#7c3aed" />
              </section>
            </>
          )}
        </div>
    </DashboardLayout>
  );
}
