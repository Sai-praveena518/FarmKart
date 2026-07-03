import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaSeedling, FaSignOutAlt, FaTimes } from "react-icons/fa";
import { clearSession, getStoredUser } from "../utils/auth";

export const navItems = {
  Farmer: [
    ["Dashboard", "/farmer/dashboard"],
    ["Add Product", "/farmer/add-product"],
    ["My Products", "/farmer/products"],
    ["Orders", "/farmer/orders"],
    ["AI Price Prediction", "/farmer/ai-price"],
    ["Disease Detection", "/farmer/disease-detection"],
    ["Nearby Farmers", "/farmer/nearby-farmers"],
    ["Transport Sharing", "/farmer/transport"],
    ["Weather", "/farmer/weather"],
    ["Profit Report", "/farmer/profit-report"],
    ["Payments", "/farmer/payments"],
    ["Notifications", "/farmer/notifications"],
    ["Profile", "/farmer/profile"],
  ],
  Buyer: [
    ["Dashboard", "/buyer/dashboard"],
    ["Browse Products", "/buyer/products"],
    ["My Orders", "/buyer/orders"],
    ["Nearby Products", "/buyer/products"],
    ["Reviews", "/buyer/products"],
    ["Notifications", "/buyer/notifications"],
    ["Profile", "/buyer/profile"],
  ],
  Admin: [
    ["Dashboard", "/admin/dashboard"],
    ["Farmers", "/admin/farmers"],
    ["Buyers", "/admin/buyers"],
    ["Products", "/admin/products"],
    ["Orders", "/admin/orders"],
    ["Payments", "/admin/payments"],
    ["Verification", "/admin/verification"],
    ["Reports", "/admin/reports"],
    ["Analytics", "/admin/analytics"],
    ["Complaints", "/admin/complaints"],
  ],
  SuperAdmin: [
    ["Platform Overview", "/superadmin/dashboard"],
    ["Create Admin", "/superadmin/create-admin"],
    ["Manage Admins", "/superadmin/admins"],
    ["Manage Users", "/superadmin/users"],
    ["Users", "/superadmin/users"],
    ["Farmers", "/superadmin/farmers"],
    ["Buyers", "/superadmin/buyers"],
    ["Products", "/superadmin/products"],
    ["Orders", "/superadmin/orders"],
    ["Payments", "/superadmin/payments"],
    ["Transport", "/superadmin/transport"],
    ["AI Usage", "/superadmin/ai-usage"],
    ["Reports", "/superadmin/reports"],
    ["Analytics", "/superadmin/analytics"],
    ["Settings", "/superadmin/settings"],
    ["AI Modules", "/superadmin/ai-modules"],
    ["Advertisements", "/superadmin/advertisements"],
  ],
};

export default function DashboardLayout({ role = "Farmer", title, children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const items = navItems[role] || [];
  const logout = () => {
    clearSession();
    navigate("/");
  };

  const sidebar = (
    <aside className={`dashboard-sidebar ${open ? "open" : ""}`}>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-green-800"><FaSeedling /> FarmKart</Link>
        <button className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 md:hidden" onClick={() => setOpen(false)}><FaTimes /></button>
      </div>
      <p className="mb-3 text-xs font-extrabold uppercase text-gray-400">{role}</p>
      <nav className="grid gap-1">
        {items.map(([label, to]) => (
          <NavLink key={`${label}-${to}`} to={to} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={() => setOpen(false)}>{label}</NavLink>
        ))}
      </nav>
      <button className="sidebar-link mt-4 w-full" onClick={logout}><FaSignOutAlt /> Logout</button>
    </aside>
  );

  return (
    <div className="dashboard-shell">
      <div className="dashboard-grid">
        {sidebar}
        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-800 md:hidden" onClick={() => setOpen(true)}><FaBars /></button>
              <div>
                <h1 className="text-xl font-extrabold text-gray-950">{title}</h1>
                <p className="text-sm font-semibold text-gray-500">Your Farm. Your Market.</p>
              </div>
            </div>
            <div className="text-right text-sm font-bold text-gray-700">{user?.name || role}</div>
          </header>
          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
