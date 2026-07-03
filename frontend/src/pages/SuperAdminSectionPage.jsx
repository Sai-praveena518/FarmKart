import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChartLine, FaCog, FaFileExport, FaPlus, FaRobot, FaBullhorn } from "react-icons/fa";
import api from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import Loading from "../components/Loading";

const sections = {
  "create-admin": {
    title: "Create Admin",
    description: "Create and review administrator access for platform operations.",
    endpoint: "/api/superadmin/admins",
    icon: FaPlus,
  },
  reports: {
    title: "Reports",
    description: "Review platform report data before exporting operational records.",
    endpoint: "/api/admin/analytics",
    icon: FaFileExport,
  },
  analytics: {
    title: "Analytics",
    description: "Monitor users, orders, revenue, AI activity, and platform growth.",
    endpoint: "/api/admin/analytics",
    icon: FaChartLine,
  },
  settings: {
    title: "Settings",
    description: "Manage system-level configuration values for the FarmKart platform.",
    endpoint: "/api/superadmin/system-settings",
    icon: FaCog,
  },
  "ai-modules": {
    title: "AI Modules",
    description: "Track AI feature availability and usage across the platform.",
    endpoint: "/api/admin/analytics",
    icon: FaRobot,
  },
  advertisements: {
    title: "Advertisements",
    description: "Prepare promotional placements and review advertising configuration.",
    endpoint: "/api/admin/analytics",
    icon: FaBullhorn,
  },
};

function valueLabel(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return `${Object.keys(value).length} group${Object.keys(value).length === 1 ? "" : "s"}`;
  return String(value);
}

export default function SuperAdminSectionPage({ section }) {
  const navigate = useNavigate();
  const config = sections[section] || sections.analytics;
  const Icon = config.icon;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(config.endpoint));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!config.endpoint) return undefined;

    let ignore = false;
    setLoading(true);
    setError("");
    api
      .get(config.endpoint)
      .then((res) => {
        if (!ignore) setData(res.data);
      })
      .catch((apiError) => {
        if (!ignore) setError(apiError.response?.data?.message || "Unable to load this section yet.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [config.endpoint]);

  const summaryEntries = Object.entries(data || {})
    .filter(([, value]) => !Array.isArray(value) || value.length > 0)
    .slice(0, 12);

  return (
    <DashboardLayout role="SuperAdmin" title={config.title}>
      <div className="text-left">
        <button type="button" className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-extrabold text-gray-700" onClick={() => navigate("/superadmin/dashboard")}>
          <FaArrowLeft /> Back
        </button>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-purple-100 text-xl text-purple-700"><Icon /></span>
            <div>
              <h2 className="text-xl font-extrabold text-gray-950">{config.title}</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">{config.description}</p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          {loading && <Loading label={`Loading ${config.title.toLowerCase()}...`} />}
          {!loading && error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {!loading && !error && summaryEntries.length === 0 && (
            <p className="card p-4 text-center text-sm font-bold text-gray-600">This section is ready. No records found yet.</p>
          )}
          {!loading && !error && summaryEntries.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summaryEntries.map(([key, value]) => (
                <article key={key} className="card p-4">
                  <p className="text-xs font-extrabold uppercase text-gray-400">{key.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-lg font-extrabold text-gray-950">{valueLabel(value)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
