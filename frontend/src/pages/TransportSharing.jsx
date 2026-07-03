import { useEffect, useState } from "react";
import { FaCalendarAlt, FaPhone, FaRupeeSign, FaWhatsapp } from "react-icons/fa";
import api from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { getStoredUser, userLocation } from "../utils/auth";
import Toast from "../components/Toast";

const today = new Date().toISOString().slice(0, 10);
const LOCATION_REQUIRED_MESSAGE = "Please update your location from Profile to use Nearby Farmers and Transport features.";

export default function TransportSharing() {
  const [user] = useState(getStoredUser());
  const [form, setForm] = useState({
    destination: "",
    travel_date: today,
    crop_name: "",
    quantity: "",
    vehicle_type: "Mini truck",
    estimated_total_cost: "",
    max_farmers: 4,
  });
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const loadNearby = async () => {
    setLoading(true);
    if (!user?.latitude || !user?.longitude) {
      setRequests([]);
      setToastType("error");
      setToast(LOCATION_REQUIRED_MESSAGE);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/api/transport/nearby", {
        params: {
          lat: user?.latitude,
          lng: user?.longitude,
          destination: form.destination,
          date: form.travel_date,
          radius: 25,
        },
      });
      setRequests(res.data || []);
    } catch (apiError) {
      setRequests([]);
      setToastType("error");
      setToast(apiError.response?.data?.message || "Unable to load nearby transport.");
    } finally {
      setLoading(false);
    }
  };

  const loadMine = async () => {
    try {
      const res = await api.get("/api/transport/my");
      setMyRequests(res.data || []);
    } catch {
      setMyRequests([]);
    }
  };

  const createTransport = async (event) => {
    event.preventDefault();
    if (!user?.latitude || !user?.longitude) {
      setToastType("error");
      setToast(LOCATION_REQUIRED_MESSAGE);
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
      setToastType("success");
      setToast("Transport request created");
      await loadNearby();
      await loadMine();
    } catch (apiError) {
      setToastType("error");
      setToast(apiError.response?.data?.message || "Unable to create transport request.");
    } finally {
      setLoading(false);
    }
  };

  const joinTransport = async (id) => {
    try {
      const res = await api.post(`/api/transport/join/${id}`);
      setToastType("success");
      setToast(res.data.message || "Joined transport successfully.");
      await loadNearby();
      await loadMine();
    } catch (apiError) {
      setToastType("error");
      setToast(apiError.response?.data?.message || "Unable to join transport.");
    }
  };

  useEffect(() => {
    loadNearby();
    loadMine();
  }, [user?.latitude, user?.longitude]);

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Transport Sharing" tone="green" back notification={false} />
        <div className="screen-body text-left">
          <Toast message={toast} type={toastType} />
          <div className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">
            Origin: {userLocation(user) || LOCATION_REQUIRED_MESSAGE}
          </div>

          <form className="mt-5 space-y-3" onSubmit={createTransport}>
            <label className="block text-sm font-bold">Destination<input className="field mt-2" value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Market or destination" required /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold">Travel Date<input className="field mt-2" type="date" value={form.travel_date} onChange={(e) => update("travel_date", e.target.value)} required /></label>
              <label className="block text-sm font-bold">Crop<input className="field mt-2" value={form.crop_name} onChange={(e) => update("crop_name", e.target.value)} required /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold">Quantity<input className="field mt-2" type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required /></label>
              <label className="block text-sm font-bold">Vehicle<input className="field mt-2" value={form.vehicle_type} onChange={(e) => update("vehicle_type", e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold">Total Cost<input className="field mt-2" type="number" min="1" value={form.estimated_total_cost} onChange={(e) => update("estimated_total_cost", e.target.value)} required /></label>
              <label className="block text-sm font-bold">Max Farmers<input className="field mt-2" type="number" min="2" max="12" value={form.max_farmers} onChange={(e) => update("max_farmers", e.target.value)} /></label>
            </div>
            <button className="primary-green" disabled={loading}>{loading ? "Saving..." : "Create Transport"}</button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Nearby transport suggestions</h2>
            <button className="text-sm font-bold text-green-700" onClick={loadNearby}>Refresh</button>
          </div>
          <div className="mt-3 space-y-3">
            {!loading && requests.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No transport sharing available near you</p>}
            {requests.map((item) => {
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
                    <button className="rounded-lg bg-green-700 px-2 py-2 text-xs font-extrabold text-white" onClick={() => joinTransport(item.id)}>Join Transport</button>
                    {item.farmer_phone && <a className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-2 text-xs font-extrabold text-blue-700" href={`tel:${item.farmer_phone}`}><FaPhone /> Call</a>}
                    {phoneDigits && <a className="flex items-center justify-center gap-1 rounded-lg bg-green-50 px-2 py-2 text-xs font-extrabold text-green-700" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>}
                  </div>
                </article>
              );
            })}
          </div>

          {myRequests.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-extrabold">My transport</h2>
              <div className="mt-3 space-y-2">
                {myRequests.map((item) => (
                  <div key={`${item.relation}-${item.id}`} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <p className="font-extrabold">{item.destination}</p>
                    <p className="text-gray-700">{item.relation} - {item.members_count} farmers - Rs {item.cost_per_farmer} each</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
