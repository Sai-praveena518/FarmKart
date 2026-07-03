import { useEffect, useState } from "react";
import { FaBell, FaMicrophone, FaRobot, FaShieldAlt } from "react-icons/fa";
import api from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";
import { getStoredUser, roleKey } from "../utils/auth";

const future = ["Voice Assistant Telugu + English", "Chatbot", "AI Crop Recommendation", "AI Fertilizer Recommendation", "AI Yield Prediction", "Government Schemes", "Loan Information", "Crop Insurance", "QR Payment", "PhonePe", "Google Pay", "Razorpay", "Invoice Generation"];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const currentRole = roleKey(user?.role);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    await api.put(`/api/notifications/${id}/read`).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Notifications" tone={["admin", "superadmin"].includes(currentRole) ? "purple" : currentRole === "buyer" ? "blue" : "green"} back notification={false} />
        <div className="screen-body text-left">
          <div className="space-y-3">
            {loading && <Loading label="Loading notifications..." />}
            {!loading && notifications.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No notifications yet.</p>}
            {notifications.map((item) => (
              <button key={item.id} className={`card flex w-full gap-3 p-4 text-left ${item.is_read ? "opacity-70" : ""}`} onClick={() => markRead(item.id)}>
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${item.is_read ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}><FaBell /></span>
                <span>
                  <span className="block font-extrabold">{item.title}</span>
                  <span className="block text-sm text-gray-700">{item.message}</span>
                  <span className="mt-1 block text-xs font-bold text-gray-500">{item.created_at}</span>
                </span>
              </button>
            ))}
          </div>
          <section className="card mt-5 p-4">
            <h2 className="flex items-center gap-2 font-extrabold"><FaRobot /> Future Ready Features</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {future.map((item, index) => (
                <span key={item} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">
                  {index === 0 ? <FaMicrophone className="mr-1 inline" /> : index === 7 ? <FaShieldAlt className="mr-1 inline" /> : null}{item}
                </span>
              ))}
            </div>
          </section>
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
