import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBars, FaBell, FaBoxOpen, FaHome, FaRegUser, FaShoppingBag } from "react-icons/fa";

export function AppStage({ children }) {
  return <main className="app-stage">{children}</main>;
}

export function PhoneFrame({ children, className = "" }) {
  return <section className={`phone-frame fade-up ${className}`}>{children}</section>;
}

export function ScreenHeader({ title, tone = "green", back = false, menu = false, notification = true }) {
  const navigate = useNavigate();
  return (
    <header className={`screen-header ${tone}`}>
      <button
        className="icon-button"
        aria-label={back ? "Go back" : "Open menu"}
        onClick={() => (back ? navigate(-1) : undefined)}
      >
        {back ? <FaArrowLeft /> : menu ? <FaBars /> : null}
      </button>
      <div className="text-center text-base">{title}</div>
      <Link className="icon-button justify-self-end" aria-label="Notifications" to="/notifications">
        {notification ? <FaBell /> : null}
      </Link>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/farmer/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaHome />
        <span>Home</span>
      </NavLink>
      <NavLink to="/farmer/products" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaBoxOpen />
        <span>Products</span>
      </NavLink>
      <NavLink to="/farmer/orders" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaShoppingBag />
        <span>Orders</span>
      </NavLink>
      <NavLink to="/farmer/profile" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaRegUser />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

export function MetricCard({ icon, label, value, tone = "green" }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg ${colors[tone]} grid place-items-center text-lg`}>{icon}</div>
      <div>
        <p className="text-[11px] font-semibold text-gray-600">{label}</p>
        <p className="text-base font-extrabold text-gray-950">{value}</p>
      </div>
    </div>
  );
}
