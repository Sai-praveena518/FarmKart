import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaRupeeSign,
  FaTruck,
  FaWhatsapp,
} from "react-icons/fa";
import api, { imageUrl } from "../services/api";
import { assets } from "../data/marketData";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { getStoredUser, userLocation } from "../utils/auth";
import Loading from "../components/Loading";
import Toast from "../components/Toast";

const today = new Date().toISOString().slice(0, 10);
const LOCATION_REQUIRED_MESSAGE = "Please update your location from Profile to use Nearby Farmers and Transport features.";

export default function NearbyFarmers() {
  const [user] = useState(getStoredUser());
  const [farmers, setFarmers] = useState([]);
  const [transport, setTransport] = useState([]);
  const [radius, setRadius] = useState(25);
  const [activeTab, setActiveTab] = useState("farmers");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("error");
  const [form, setForm] = useState({
    destination: "",
    travel_date: today,
    crop_name: "",
    quantity: "",
    vehicle_type: "Mini truck",
    estimated_total_cost: "",
    max_farmers: 4,
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const showToast = (message, type = "error") => {
    setToast(message);
    setToastType(type);
  };

  const loadDashboard = async (locationUser = user, nextRadius = radius) => {
    setLoading(true);
    setToast("");
    if (!locationUser?.latitude || !locationUser?.longitude) {
      setFarmers([]);
      setTransport([]);
      showToast(LOCATION_REQUIRED_MESSAGE);
      setLoading(false);
      return;
    }
    try {
      const [farmersRes, transportRes] = await Promise.all([
        api.get("/api/nearby-farmers", {
          params: { lat: locationUser?.latitude, lng: locationUser?.longitude, radius: nextRadius },
        }),
        api.get("/api/transport/nearby", {
          params: {
            lat: locationUser?.latitude,
            lng: locationUser?.longitude,
            radius: nextRadius,
            destination: form.destination,
            date: form.travel_date,
          },
        }),
      ]);
      setFarmers(farmersRes.data || []);
      setTransport(transportRes.data || []);
    } catch (apiError) {
      setFarmers([]);
      setTransport([]);
      showToast(apiError.response?.data?.message || "Unable to load nearby dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const createTransport = async (event) => {
    event.preventDefault();
    if (!user?.latitude || !user?.longitude) {
      showToast(LOCATION_REQUIRED_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/transport/create", {
        ...form,
        origin_village: user?.village,
        origin_district: user?.district,
        latitude: user?.latitude,
        longitude: user?.longitude,
      });
      showToast("Transport request created", "success");
      setActiveTab("transport");
      await loadDashboard(user, radius);
    } catch (apiError) {
      showToast(apiError.response?.data?.message || "Unable to create transport request.");
    } finally {
      setLoading(false);
    }
  };

  const joinTransport = async (id) => {
    try {
      const res = await api.post(`/api/transport/join/${id}`);
      showToast(res.data.message || "Joined transport successfully.", "success");
      await loadDashboard(user, radius);
    } catch (apiError) {
      showToast(apiError.response?.data?.message || "Unable to join transport.");
    }
  };

  useEffect(() => {
    loadDashboard(user, radius);
  }, [radius]);

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Nearby Dashboard" tone="green" back notification={false} />
        <div className="screen-body text-left">
          <Toast message={toast} type={toastType} />

          <section className="rounded-lg bg-green-50 p-3">
            <p className="text-sm font-extrabold text-green-900">Your Real-Time Location</p>
            <p className="text-sm text-green-800">{userLocation(user) || LOCATION_REQUIRED_MESSAGE}</p>
            {user?.latitude && user?.longitude && (
              <p className="mt-1 text-xs font-bold text-green-700">{Number(user.latitude).toFixed(5)}, {Number(user.longitude).toFixed(5)}</p>
            )}
          </section>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((km) => (
              <button key={km} className={`rounded-lg border px-2 py-2 text-xs font-extrabold ${radius === km ? "border-green-700 bg-green-50 text-green-700" : "border-gray-200 text-gray-700"}`} onClick={() => setRadius(km)}>
                {km} km
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button className={`rounded-md py-2 text-sm font-extrabold ${activeTab === "farmers" ? "bg-white text-green-700 shadow-sm" : "text-gray-600"}`} onClick={() => setActiveTab("farmers")}>Farmers</button>
            <button className={`rounded-md py-2 text-sm font-extrabold ${activeTab === "transport" ? "bg-white text-green-700 shadow-sm" : "text-gray-600"}`} onClick={() => setActiveTab("transport")}>Transport</button>
          </div>

          {loading && <div className="mt-4"><Loading label="Loading real-time nearby data..." /></div>}

          {!loading && activeTab === "farmers" && (
            <section className="mt-4 space-y-3">
              {farmers.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No nearby farmers found</p>}
              {farmers.map((farmer) => (
                <article key={farmer.farmer_id} className="card p-3">
                  <div className="flex items-center gap-3">
                    <img src={farmer.profile_image ? imageUrl(farmer.profile_image) : assets.farmer} alt={farmer.name} className="h-14 w-14 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-extrabold">{farmer.name}</p>
                      <p className="text-sm text-gray-700">{farmer.available_crops?.join(", ") || "No available crops"}</p>
                      <p className="text-sm text-gray-700">{[farmer.village, farmer.district, farmer.state].filter(Boolean).join(", ")}</p>
                      <p className="text-sm font-bold text-green-700">{farmer.distance_km} km away</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {farmer.phone && <a href={`tel:${farmer.phone}`} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-50 text-sm font-extrabold text-blue-700"><FaPhone /> Call</a>}
                    {farmer.phone_digits && <a href={`https://wa.me/${farmer.phone_digits}`} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-green-50 text-sm font-extrabold text-green-700"><FaWhatsapp /> WhatsApp</a>}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${farmer.latitude},${farmer.longitude}`} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-50 text-sm font-extrabold text-gray-700"><FaMapMarkerAlt /> Map</a>
                  </div>
                </article>
              ))}
            </section>
          )}

          {!loading && activeTab === "transport" && (
            <section className="mt-4">
              <form className="space-y-3 rounded-lg border border-green-100 bg-green-50 p-3" onSubmit={createTransport}>
                <div className="flex items-center gap-2 text-sm font-extrabold text-green-900"><FaTruck /> Create transport from your Profile location</div>
                <label className="block text-sm font-bold">Destination<input className="field mt-2" value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Market / destination" required /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold">Date<input className="field mt-2" type="date" value={form.travel_date} onChange={(e) => update("travel_date", e.target.value)} required /></label>
                  <label className="block text-sm font-bold">Crop<input className="field mt-2" value={form.crop_name} onChange={(e) => update("crop_name", e.target.value)} required /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold">Quantity<input className="field mt-2" type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required /></label>
                  <label className="block text-sm font-bold">Total Cost<input className="field mt-2" type="number" min="1" value={form.estimated_total_cost} onChange={(e) => update("estimated_total_cost", e.target.value)} required /></label>
                </div>
                <button className="primary-green">Create Transport</button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <h2 className="text-sm font-extrabold">Nearby transport suggestions</h2>
                <button className="text-sm font-bold text-green-700" onClick={() => loadDashboard(user, radius)}>Refresh</button>
              </div>

              <div className="mt-3 space-y-3">
                {transport.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No transport sharing available near you</p>}
                {transport.map((item) => {
                  const phoneDigits = String(item.farmer_phone || "").replace(/\D/g, "");
                  return (
                    <article key={item.id} className="card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold">{item.farmer_name}</p>
                          <p className="text-sm text-gray-700">{item.crop_name} - {item.quantity} kg</p>
                          <p className="text-sm text-gray-700">{item.destination}</p>
                          <p className="text-xs font-bold text-gray-500">{item.distance_km} km away</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-extrabold text-green-700">{item.members_count}/{item.max_farmers}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <p className="flex items-center gap-2 font-bold text-gray-700"><FaCalendarAlt /> {item.travel_date}</p>
                        <p className="flex items-center gap-2 font-bold text-green-700"><FaRupeeSign /> {item.cost_per_farmer} each</p>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button className="rounded-lg bg-green-700 px-2 py-2 text-xs font-extrabold text-white" onClick={() => joinTransport(item.id)}>Join</button>
                        {item.farmer_phone && <a className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-2 text-xs font-extrabold text-blue-700" href={`tel:${item.farmer_phone}`}><FaPhone /> Call</a>}
                        {phoneDigits && <a className="flex items-center justify-center gap-1 rounded-lg bg-green-50 px-2 py-2 text-xs font-extrabold text-green-700" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
