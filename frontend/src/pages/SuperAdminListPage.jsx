import { useEffect, useMemo, useState } from "react";
import { FaCheck, FaEye, FaPause, FaPlay, FaRupeeSign, FaShieldAlt, FaTimes, FaTrash } from "react-icons/fa";
import api from "../services/api";
import Loading from "../components/Loading";
import Forbidden from "./Forbidden";
import DashboardLayout from "../components/DashboardLayout";
import { roleKey } from "../utils/auth";

const configs = {
  users: {
    title: "Total Users",
    endpoint: "/api/superadmin/users",
    columns: ["id", "name", "email", "phone", "role", "status", "village", "district", "created_at"],
    actions: ["view", "toggleStatus", "delete", "changeRole"],
  },
  farmers: {
    title: "Farmers",
    endpoint: "/api/superadmin/farmers",
    columns: ["name", "email", "phone", "village", "district", "verified_status", "products_count", "orders_count"],
    actions: ["verify", "toggleStatus", "viewProducts"],
  },
  buyers: {
    title: "Buyers",
    endpoint: "/api/superadmin/buyers",
    columns: ["name", "email", "phone", "village", "district", "total_orders", "created_at"],
    actions: ["viewOrders", "toggleStatus"],
  },
  admins: {
    title: "Admins",
    endpoint: "/api/superadmin/admins",
    columns: ["id", "name", "email", "phone", "role", "status", "last_login_at", "created_at"],
    actions: ["createAdmin", "toggleStatus", "delete"],
  },
  verifications: {
    title: "Pending Verification",
    endpoint: "/api/superadmin/verifications",
    columns: ["id", "name", "email", "phone", "role", "village", "district", "status", "created_at"],
    actions: ["approve", "reject"],
  },
  products: {
    title: "Products",
    endpoint: "/api/superadmin/products",
    columns: ["crop_name", "farmer_name", "price", "quantity", "status", "location", "created_at"],
    actions: ["approveProduct", "rejectProduct", "deleteProduct"],
  },
  orders: {
    title: "Orders",
    endpoint: "/api/superadmin/orders",
    columns: ["order_id", "buyer_name", "farmer_name", "crop_name", "quantity", "total_price", "status", "payment_status", "created_at"],
    actions: [],
    filters: { status: ["All", "Pending", "Accepted", "Packed", "Shipped", "Delivered", "Rejected", "Cancelled"] },
  },
  payments: {
    title: "Payments",
    endpoint: "/api/superadmin/payments",
    columns: ["order_id", "buyer", "farmer", "amount", "payment_method", "payment_status", "order_status", "transaction_id", "created_at"],
    actions: ["markPaid"],
    filters: { payment_status: ["All", "Pending", "Paid"] },
  },
  transport: {
    title: "Transport",
    endpoint: "/api/superadmin/transport",
    columns: ["id", "farmer_name", "origin_village", "destination", "crop_name", "quantity", "vehicle_type", "travel_date", "status", "joined_members"],
    actions: ["viewMembers"],
  },
  complaints: {
    title: "Complaints",
    endpoint: "/api/superadmin/complaints",
    columns: ["id", "name", "email", "role", "subject", "message", "status", "created_at"],
    actions: [],
  },
  activity: {
    title: "Daily Active",
    endpoint: "/api/superadmin/activity",
    columns: ["id", "name", "email", "role", "action", "details", "created_at"],
    actions: [],
  },
};

const aiSections = [
  {
    key: "price_predictions",
    title: "Price Predictions",
    columns: ["id", "user_name", "crop_name", "market", "current_price", "predicted_price_3_days", "predicted_price_7_days", "trend", "prediction_type", "created_at"],
  },
  {
    key: "disease_detection_requests",
    title: "Disease Detection Requests",
    columns: ["id", "user_name", "crop_name", "disease_name", "confidence", "status", "created_at"],
  },
  {
    key: "weather_requests",
    title: "Weather Requests",
    columns: ["id", "user_name", "temperature", "humidity", "condition_text", "suggestion", "created_at"],
  },
];

const labels = {
  id: "ID",
  order_id: "Order ID",
  crop_name: "Crop",
  farmer_name: "Farmer",
  buyer_name: "Buyer",
  user_name: "User",
  account_status: "Status",
  verified_status: "Verified",
  products_count: "Products",
  orders_count: "Orders",
  total_orders: "Orders",
  joined_members: "Members",
  payment_method: "Method",
  payment_status: "Payment",
  order_status: "Order",
  transaction_id: "Transaction",
  created_at: "Created",
  last_login_at: "Last Login",
};

function formatValue(value, key) {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "verified_status") return value ? "Verified" : "Pending";
  if (Array.isArray(value)) return `${value.length} member${value.length === 1 ? "" : "s"}`;
  return String(value);
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-purple-50 text-purple-900">
          <tr>
            {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-extrabold">{labels[column] || column.replaceAll("_", " ")}</th>)}
            <th className="whitespace-nowrap px-3 py-3 font-extrabold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.order_id || index} className="border-t border-gray-100">
              {columns.map((column) => <td key={column} className="max-w-[180px] whitespace-nowrap px-3 py-3 font-semibold text-gray-700">{formatValue(row[column], column)}</td>)}
              <td className="px-3 py-3">{row.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminListPage({ section }) {
  const config = configs[section] || { title: "AI Usage", endpoint: "/api/superadmin/ai-usage", columns: [] };
  const [data, setData] = useState(section === "ai-usage" ? {} : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(config.endpoint);
      setData(res.data || (section === "ai-usage" ? {} : []));
    } catch (apiError) {
      setError(apiError.response?.status === 403 ? "403" : apiError.response?.data?.message || "Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setFilters({});
    load();
  }, [section]);

  const call = async (request, success) => {
    setMessage("");
    try {
      await request();
      setMessage(success);
      await load();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Action failed.");
    }
  };

  const actionButton = (label, Icon, onClick, tone = "purple") => (
    <button type="button" className={`mr-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-extrabold ${tone === "red" ? "bg-red-50 text-red-700" : tone === "green" ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"}`} onClick={onClick}>
      <Icon /> {label}
    </button>
  );

  const createAdmin = async () => {
    const name = window.prompt("Admin name");
    if (!name) return;
    const email = window.prompt("Admin email");
    if (!email) return;
    const password = window.prompt("Temporary password");
    if (!password) return;
    await call(() => api.post("/api/superadmin/admins", { name, email, password }), "Admin created.");
  };

  const withActions = useMemo(() => {
    if (section === "ai-usage") return [];
    const searchText = search.trim().toLowerCase();
    const filteredRows = (Array.isArray(data) ? data : []).filter((row) => {
      const matchesSearch = !searchText || config.columns.some((column) => String(row[column] ?? "").toLowerCase().includes(searchText));
      const matchesFilters = Object.entries(filters).every(([key, value]) => !value || value === "All" || String(row[key] ?? "") === value);
      return matchesSearch && matchesFilters;
    });
    return filteredRows.map((row) => {
      const actions = [];
      if (config.actions.includes("view")) actions.push(actionButton("View", FaEye, () => setMessage(JSON.stringify(row, null, 2))));
      if (config.actions.includes("viewProducts")) actions.push(actionButton("Products", FaEye, () => setMessage(`Products count: ${row.products_count || 0}`)));
      if (config.actions.includes("viewOrders")) actions.push(actionButton("Orders", FaEye, () => setMessage(`Orders count: ${row.total_orders || 0}`)));
      if (config.actions.includes("viewMembers")) actions.push(actionButton("Members", FaEye, () => setMessage((row.members || []).map((member) => `${member.name || "Unknown"} - ${member.phone || "-"}`).join("\n") || "No joined members.")));
      if (config.actions.includes("verify")) actions.push(actionButton("Verify", FaCheck, () => call(() => api.put(`/api/admin/users/${row.id}/verify`, { is_verified: true }), "User verified."), "green"));
      if (config.actions.includes("approve")) actions.push(actionButton("Approve", FaCheck, () => call(() => api.put(`/api/admin/users/${row.id}/verify`, { is_verified: true }), "Verification approved."), "green"));
      if (config.actions.includes("reject")) actions.push(actionButton("Reject", FaTimes, () => call(() => api.put(`/api/admin/users/${row.id}/verify`, { is_verified: false }), "Verification rejected."), "red"));
      if (config.actions.includes("approveProduct")) actions.push(actionButton("Approve", FaCheck, () => call(() => api.put(`/api/admin/products/${row.id}/status`, { status: "Available" }), "Product approved."), "green"));
      if (config.actions.includes("rejectProduct")) actions.push(actionButton("Reject", FaTimes, () => call(() => api.put(`/api/admin/products/${row.id}/status`, { status: "Rejected" }), "Product rejected."), "red"));
      if (config.actions.includes("deleteProduct")) actions.push(actionButton("Delete", FaTrash, () => call(() => api.delete(`/api/admin/products/${row.id}/fake`), "Product deleted."), "red"));
      if (config.actions.includes("toggleStatus")) {
        const suspended = row.status === "Suspended";
        actions.push(actionButton(suspended ? "Activate" : "Suspend", suspended ? FaPlay : FaPause, () => call(() => api.put(`/api/superadmin/users/${row.id}/status`, { account_status: suspended ? "Active" : "Suspended" }), "Status updated."), suspended ? "green" : "red"));
      }
      if (config.actions.includes("changeRole")) {
        const nextRole = roleKey(row.role) === "admin" ? "Farmer" : "Admin";
        actions.push(actionButton(nextRole, FaShieldAlt, () => call(() => api.put(`/api/superadmin/users/${row.id}/role`, { role: nextRole }), "Role updated.")));
      }
      if (config.actions.includes("markPaid") && row.payment_status !== "Paid") actions.push(actionButton("Mark Paid", FaRupeeSign, () => call(() => api.put(`/api/payments/${row.order_id}/mark-paid`), "Payment marked as paid."), "green"));
      if (config.actions.includes("delete")) actions.push(actionButton("Delete", FaTrash, () => call(() => api.delete(`/api/superadmin/users/${row.id}`), "User deleted."), "red"));
      return { ...row, actions: actions.length ? actions : <span className="text-gray-400">-</span> };
    });
  }, [data, config, filters, search, section]);

  if (error === "403") return <Forbidden />;

  return (
    <DashboardLayout role="SuperAdmin" title={config.title}>
        <div className="text-left">
          {loading && <Loading label={`Loading ${config.title.toLowerCase()}...`} />}
          {!loading && error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {message && <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-purple-50 p-3 text-xs font-bold text-purple-800">{message}</pre>}
          {!loading && !error && section !== "ai-usage" && (
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                className="min-h-[42px] flex-1 rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:border-purple-500"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records"
              />
              {Object.entries(config.filters || {}).map(([key, options]) => (
                <select
                  key={key}
                  className="min-h-[42px] rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:border-purple-500"
                  value={filters[key] || "All"}
                  onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                >
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ))}
            </div>
          )}
          {!loading && !error && section === "admins" && (
            <button type="button" className="mb-3 inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-3 text-sm font-extrabold text-white shadow-md active:scale-[0.98]" onClick={createAdmin}>
              <FaShieldAlt /> Create Admin
            </button>
          )}
          {!loading && !error && section !== "ai-usage" && (
            <>
              {withActions.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No data found.</p>}
              {withActions.length > 0 && <DataTable columns={config.columns} rows={withActions} />}
            </>
          )}
          {!loading && !error && section === "ai-usage" && (
            <div className="space-y-4">
              {aiSections.map((item) => {
                const rows = data[item.key] || [];
                return (
                  <section key={item.key}>
                    <h2 className="mb-2 font-extrabold">{item.title}</h2>
                    {rows.length === 0 ? <p className="card p-4 text-center text-sm font-bold text-gray-600">No data found.</p> : <DataTable columns={item.columns} rows={rows.map((row) => ({ ...row, actions: <span className="text-gray-400">-</span> }))} />}
                  </section>
                );
              })}
            </div>
          )}
        </div>
    </DashboardLayout>
  );
}
