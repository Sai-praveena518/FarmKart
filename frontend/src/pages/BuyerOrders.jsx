import { useEffect, useState } from "react";
import api from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";

const tones = { Pending: "bg-yellow-100 text-yellow-700", Accepted: "bg-blue-100 text-blue-700", Packed: "bg-indigo-100 text-indigo-700", Shipped: "bg-purple-100 text-purple-700", Delivered: "bg-green-100 text-green-700", Cancelled: "bg-red-100 text-red-700", Rejected: "bg-red-100 text-red-700" };
const steps = ["Pending", "Accepted", "Packed", "Shipped", "Delivered"];

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/orders/buyer").then((res) => setOrders(res.data || [])).finally(() => setLoading(false));
  }, []);

  const cancelOrder = async (order) => {
    await api.put(`/api/orders/${order.id}/status`, { status: "Cancelled" });
    setOrders((items) => items.map((item) => (item.id === order.id ? { ...item, status: "Cancelled" } : item)));
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Buyer Orders" tone="blue" back />
        <div className="screen-body text-left">
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
            {["Pending", "Accepted", "Shipped", "Delivered"].map((status) => (
              <span key={status} className={`rounded-lg px-2 py-2 ${tones[status]}`}>{status}</span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {loading && <Loading label="Loading your orders..." />}
            {!loading && orders.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No orders yet.</p>}
            {orders.map((order) => (
              <article key={order.id} className="card p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-extrabold">#{order.id}</p>
                    <p className="text-sm text-gray-700">{order.crop_name} - {order.quantity} Kg</p>
                    <p className="text-sm text-gray-700">Method: {order.payment_method || "Pay Later"}</p>
                    <p className="text-sm text-gray-700">Payment: {order.payment_status || "Pending"}</p>
                    <p className="text-xs text-gray-500">{order.delivery_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold">Rs {order.total_price}</p>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[order.status] || "bg-gray-100 text-gray-700"}`}>{order.status}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
                  {steps.map((step) => <span key={step} className={`rounded-full px-3 py-1 ${steps.indexOf(step) <= steps.indexOf(order.status) ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>{step}</span>)}
                </div>
                {["Pending", "Accepted", "Packed"].includes(order.status) && <button className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700" onClick={() => cancelOrder(order)}>Cancel Order</button>}
              </article>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
