import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChartLine, FaCog, FaDownload, FaFileExport, FaPlus, FaRobot, FaBullhorn, FaSave, FaTrash, FaUpload } from "react-icons/fa";
import api, { imageUrl } from "../services/api";
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

const settingGroups = [
  {
    title: "Application Settings",
    fields: [
      ["application_name", "Application Name"],
      ["home_page_caption", "Home Page Caption"],
      ["home_page_description", "Home Page Description", "textarea"],
      ["footer_text", "Footer Text", "textarea"],
      ["copyright_text", "Copyright Text"],
      ["contact_email", "Contact Email"],
      ["contact_phone", "Contact Phone"],
      ["whatsapp_number", "WhatsApp Number"],
      ["office_address", "Office Address", "textarea"],
      ["google_maps_location", "Google Maps Location"],
      ["facebook_link", "Facebook Link"],
      ["instagram_link", "Instagram Link"],
      ["youtube_link", "YouTube Link"],
      ["linkedin_link", "LinkedIn Link"],
    ],
  },
  {
    title: "Payment Settings",
    fields: [
      ["commission_percent", "Commission %", "number"],
      ["platform_fee", "Platform Fee", "number"],
      ["delivery_fee", "Delivery Fee", "number"],
      ["minimum_order", "Minimum Order", "number"],
      ["maximum_order", "Maximum Order", "number"],
      ["payment_methods", "Payment Methods"],
      ["enable_razorpay", "Enable Razorpay", "toggle"],
      ["enable_phonepe", "Enable PhonePe", "toggle"],
      ["enable_cod", "Enable COD", "toggle"],
    ],
  },
  {
    title: "App Settings",
    fields: [
      ["maintenance_mode", "Maintenance Mode", "toggle"],
      ["app_version", "App Version"],
      ["minimum_app_version", "Minimum App Version"],
      ["force_update", "Force Update", "toggle"],
      ["enable_registration", "Enable Registration", "toggle"],
      ["enable_buyer_registration", "Enable Buyer Registration", "toggle"],
      ["enable_farmer_registration", "Enable Farmer Registration", "toggle"],
    ],
  },
  {
    title: "AI, Weather and Transport",
    fields: [
      ["enable_ai", "Enable AI", "toggle"],
      ["enable_ai_price_prediction", "Enable AI Price Prediction", "toggle"],
      ["enable_disease_detection", "Enable Disease Detection", "toggle"],
      ["weather_api_key", "Weather API Key"],
      ["enable_weather", "Enable Weather", "toggle"],
      ["maximum_sharing_distance", "Maximum Sharing Distance", "number"],
      ["maximum_farmers_per_vehicle", "Maximum Farmers Per Vehicle", "number"],
      ["default_transport_fee", "Default Transport Fee", "number"],
      ["push_notification", "Push Notification", "toggle"],
      ["email_notification", "Email Notification", "toggle"],
      ["sms_notification", "SMS Notification", "toggle"],
    ],
  },
];

const imageFields = [
  ["logo", "Logo"],
  ["splash_screen_image", "Splash Screen Image"],
  ["login_page_banner", "Login Page Banner"],
  ["home_page_hero_image", "Home Page Hero Image"],
];

function CMSSettings() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState({ settings: {}, banners: [], categories: [], media: [], ai_modules: [], organic_certificates: [] });
  const [settings, setSettings] = useState({});
  const [files, setFiles] = useState({});
  const [banner, setBanner] = useState({ title: "", caption: "", target_url: "", sort_order: 0, is_active: "true" });
  const [bannerFile, setBannerFile] = useState(null);
  const [category, setCategory] = useState({ name: "", description: "", is_enabled: "true" });
  const [broadcast, setBroadcast] = useState({ title: "", message: "", role: "" });
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/superadmin/system-settings");
      setPayload(res.data);
      setSettings(res.data.settings || {});
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load CMS settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const saveSettings = async () => {
    setMessage("");
    const formData = new FormData();
    formData.append("settings", JSON.stringify(settings));
    Object.entries(settings).forEach(([key, value]) => formData.append(key, value ?? ""));
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    try {
      const res = await api.put("/api/superadmin/cms-settings", formData);
      setMessage(res.data.message || "CMS settings updated.");
      setFiles({});
      await load();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to save settings.");
    }
  };

  const createBanner = async () => {
    const formData = new FormData();
    Object.entries(banner).forEach(([key, value]) => formData.append(key, value));
    if (bannerFile) formData.append("image", bannerFile);
    try {
      await api.post("/api/superadmin/banners", formData);
      setBanner({ title: "", caption: "", target_url: "", sort_order: 0, is_active: "true" });
      setBannerFile(null);
      setMessage("Banner uploaded.");
      await load();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to upload banner.");
    }
  };

  const updateBannerStatus = async (id, isActive) => {
    await api.put(`/api/superadmin/banners/${id}/status`, { is_active: !isActive });
    setMessage("Banner status updated.");
    await load();
  };

  const deleteBanner = async (id) => {
    await api.delete(`/api/superadmin/banners/${id}`);
    setMessage("Banner deleted.");
    await load();
  };

  const saveCategory = async () => {
    try {
      await api.post("/api/superadmin/categories", category);
      setCategory({ name: "", description: "", is_enabled: "true" });
      setMessage("Category saved.");
      await load();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to save category.");
    }
  };

  const toggleCategory = async (item) => {
    await api.put(`/api/superadmin/categories/${item.id}`, { ...item, is_enabled: !item.is_enabled });
    setMessage("Category updated.");
    await load();
  };

  const deleteCategory = async (id) => {
    await api.delete(`/api/superadmin/categories/${id}`);
    setMessage("Category deleted.");
    await load();
  };

  const uploadMedia = async () => {
    if (!mediaFile) return;
    const formData = new FormData();
    formData.append("file", mediaFile);
    formData.append("title", mediaFile.name);
    await api.post("/api/superadmin/media", formData);
    setMediaFile(null);
    setMessage("Media uploaded.");
    await load();
  };

  const sendBroadcast = async () => {
    try {
      const res = await api.post("/api/superadmin/notifications/broadcast", broadcast);
      setMessage(res.data.message || "Broadcast sent.");
      setBroadcast({ title: "", message: "", role: "" });
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to send broadcast.");
    }
  };

  const quickAction = async (request, success) => {
    try {
      const res = await request();
      setMessage(res.data?.message || success);
      await load();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Action failed.");
    }
  };

  const downloadReport = async (format) => {
    const res = await api.get(`/api/reports/export?format=${format}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `farmkart-report.${format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xls"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardLayout role="SuperAdmin" title="Owner CMS"><Loading label="Loading owner CMS..." /></DashboardLayout>;

  return (
    <DashboardLayout role="SuperAdmin" title="Owner CMS">
      <div className="text-left">
        <button type="button" className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-extrabold text-gray-700" onClick={() => navigate("/superadmin/dashboard")}>
          <FaArrowLeft /> Back
        </button>
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {message && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800">{message}</p>}

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-gray-950">Application Settings</h2>
              <p className="text-sm font-semibold text-gray-600">Every value is stored in MySQL and read live by the frontend.</p>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-3 text-sm font-extrabold text-white" onClick={saveSettings}><FaSave /> Save Settings</button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {settingGroups.map((group) => (
              <article key={group.title} className="rounded-lg border border-gray-100 p-4">
                <h3 className="font-extrabold text-gray-950">{group.title}</h3>
                <div className="mt-3 grid gap-3">
                  {group.fields.map(([key, label, type]) => (
                    <label key={key} className="block text-sm font-bold text-gray-800">
                      {label}
                      {type === "textarea" ? (
                        <textarea className="field mt-2 min-h-24" value={settings[key] || ""} onChange={(event) => setSetting(key, event.target.value)} />
                      ) : type === "toggle" ? (
                        <select className="field mt-2" value={String(settings[key] || "false")} onChange={(event) => setSetting(key, event.target.value)}>
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : (
                        <input className="field mt-2" type={type || "text"} value={settings[key] || ""} onChange={(event) => setSetting(key, event.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {imageFields.map(([key, label]) => (
              <label key={key} className="rounded-lg border border-gray-100 p-3 text-sm font-bold">
                {label}
                {settings[key] && <img className="mt-2 aspect-video w-full rounded-md object-cover" src={imageUrl(settings[key])} alt={label} />}
                <input className="mt-2 w-full text-xs" type="file" accept="image/*" onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] }))} />
              </label>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-extrabold text-gray-950">Banner Management</h3>
            <div className="mt-3 grid gap-2">
              <input className="field" placeholder="Banner title" value={banner.title} onChange={(event) => setBanner({ ...banner, title: event.target.value })} />
              <textarea className="field min-h-20" placeholder="Caption" value={banner.caption} onChange={(event) => setBanner({ ...banner, caption: event.target.value })} />
              <input className="field" placeholder="Target URL" value={banner.target_url} onChange={(event) => setBanner({ ...banner, target_url: event.target.value })} />
              <input className="field" type="number" placeholder="Sort order" value={banner.sort_order} onChange={(event) => setBanner({ ...banner, sort_order: event.target.value })} />
              <input className="text-sm" type="file" accept="image/*" onChange={(event) => setBannerFile(event.target.files?.[0])} />
              <button type="button" className="primary-green" onClick={createBanner}><FaUpload /> Upload Banner</button>
            </div>
            <div className="mt-4 grid gap-2">
              {payload.banners?.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{item.title}</p>
                    <p className="text-xs font-bold text-gray-500">{item.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md bg-purple-50 px-2 py-1 text-xs font-extrabold text-purple-700" type="button" onClick={() => updateBannerStatus(item.id, item.is_active)}>{item.is_active ? "Deactivate" : "Activate"}</button>
                    <button className="rounded-md bg-red-50 px-2 py-1 text-xs font-extrabold text-red-700" type="button" onClick={() => deleteBanner(item.id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-extrabold text-gray-950">Category Management</h3>
            <div className="mt-3 grid gap-2">
              <input className="field" placeholder="Crop category" value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} />
              <textarea className="field min-h-20" placeholder="Description" value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} />
              <select className="field" value={category.is_enabled} onChange={(event) => setCategory({ ...category, is_enabled: event.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select>
              <button type="button" className="primary-green" onClick={saveCategory}><FaSave /> Save Category</button>
            </div>
            <div className="mt-4 grid gap-2">
              {payload.categories?.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <span className="text-sm font-extrabold">{item.name}</span>
                  <div className="flex gap-2">
                    <button className="rounded-md bg-purple-50 px-2 py-1 text-xs font-extrabold text-purple-700" type="button" onClick={() => toggleCategory(item)}>{item.is_enabled ? "Disable" : "Enable"}</button>
                    <button className="rounded-md bg-red-50 px-2 py-1 text-xs font-extrabold text-red-700" type="button" onClick={() => deleteCategory(item.id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-extrabold text-gray-950">Notifications</h3>
            <input className="field mt-3" placeholder="Title" value={broadcast.title} onChange={(event) => setBroadcast({ ...broadcast, title: event.target.value })} />
            <textarea className="field mt-2 min-h-24" placeholder="Message" value={broadcast.message} onChange={(event) => setBroadcast({ ...broadcast, message: event.target.value })} />
            <select className="field mt-2" value={broadcast.role} onChange={(event) => setBroadcast({ ...broadcast, role: event.target.value })}><option value="">All Users</option><option>Farmer</option><option>Buyer</option><option>Admin</option></select>
            <button type="button" className="primary-green mt-3" onClick={sendBroadcast}><FaBullhorn /> Send Broadcast</button>
          </article>

          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-extrabold text-gray-950">Reports and Database</h3>
            <div className="mt-3 grid gap-2">
              <button className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-800" type="button" onClick={() => downloadReport("csv")}><FaDownload /> Export CSV</button>
              <button className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-800" type="button" onClick={() => downloadReport("excel")}><FaDownload /> Export Excel</button>
              <button className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-800" type="button" onClick={() => downloadReport("pdf")}><FaDownload /> Export PDF</button>
              <button className="rounded-lg bg-purple-700 px-4 py-3 text-sm font-extrabold text-white" type="button" onClick={() => quickAction(() => api.post("/api/superadmin/database/backup"), "Backup prepared.")}>Backup Database</button>
              <button className="rounded-lg bg-purple-50 px-4 py-3 text-sm font-extrabold text-purple-700" type="button" onClick={() => quickAction(() => api.post("/api/superadmin/database/restore"), "Restore recorded.")}>Restore Database</button>
            </div>
          </article>

          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-extrabold text-gray-950">Media Library</h3>
            <input className="mt-3 text-sm" type="file" accept="image/*" onChange={(event) => setMediaFile(event.target.files?.[0])} />
            <button className="primary-green mt-3" type="button" onClick={uploadMedia}><FaUpload /> Upload Image</button>
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto">
              {payload.media?.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2">
                  <img className="h-12 w-12 rounded object-cover" src={imageUrl(item.file_url)} alt={item.title || "Media"} />
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">{item.file_url}</p>
                  <button className="text-red-700" type="button" onClick={() => quickAction(() => api.delete(`/api/superadmin/media/${item.id}`), "Media deleted.")}><FaTrash /></button>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="font-extrabold text-gray-950">AI Modules and Organic Management</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {["price_prediction", "disease_detection", "weather", "transport"].map((key) => {
              const item = payload.ai_modules?.find((module) => module.module_key === key);
              return (
                <button key={key} type="button" className="rounded-lg border border-gray-100 p-3 text-left text-sm font-extrabold" onClick={() => quickAction(() => api.put(`/api/superadmin/ai-modules/${key}`, { name: key.replaceAll("_", " "), is_enabled: !item?.is_enabled }), "AI module updated.")}>
                  {key.replaceAll("_", " ")} <span className="ml-2 text-xs text-gray-500">{item?.is_enabled ? "Enabled" : "Disabled"}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-2">
            {payload.organic_certificates?.length ? payload.organic_certificates.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 text-sm font-bold">
                <span>{item.farmer_name || "Farmer"} - {item.crop_name || "Certificate"} - {item.status}</span>
                <div className="flex gap-2">
                  <button className="rounded-md bg-green-50 px-2 py-1 text-green-700" onClick={() => quickAction(() => api.put(`/api/superadmin/organic/${item.id}`, { status: "Approved", organic_badge: true }), "Organic certificate approved.")}>Approve</button>
                  <button className="rounded-md bg-red-50 px-2 py-1 text-red-700" onClick={() => quickAction(() => api.put(`/api/superadmin/organic/${item.id}`, { status: "Rejected", organic_badge: false }), "Organic certificate rejected.")}>Reject</button>
                </div>
              </div>
            )) : <p className="text-sm font-bold text-gray-500">No organic certificates submitted yet.</p>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
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

  if (section === "settings") return <CMSSettings />;

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
