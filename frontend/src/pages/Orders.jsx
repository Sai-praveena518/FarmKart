import { useEffect, useState } from "react";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";

const steps = ["Pending", "Accepted", "Packed", "Shipped", "Delivered"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/api/orders/farmer").then((res) => setOrders(res.data || [])).finally(() => setLoading(false));
  }, []);

  const setStatus = async (id, status) => {
    setMessage("");
    try {
      await api.put(`/api/orders/${id}/status`, { status });
      setOrders((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to update order status.");
    }
  };

  const markPaid = async (order) => {
    setMessage("");
    try {
      await api.put(`/api/payments/${order.id}/mark-paid`);
      setOrders((items) => items.map((item) => (item.id === order.id ? { ...item, payment_status: "Paid" } : item)));
      setMessage("Payment marked as paid.");
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to mark payment paid.");
    }
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Farmer Orders" tone="green" back />
        <div className="screen-body pb-0 text-left">
          <div className="space-y-3">
            {loading && <Loading label="Loading received orders..." />}
            {message && <p className="rounded-lg bg-green-50 p-3 text-center text-sm font-extrabold text-green-700">{message}</p>}
            {!loading && orders.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No orders received yet.</p>}
            {orders.map((order) => (
              <article key={order.id} className="card p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-extrabold">Order ID: #{order.id}</p>
                    <p className="text-sm text-gray-700">{order.crop_name} - {order.quantity} Kg</p>
                    <p className="text-sm text-gray-700">Buyer: {order.buyer_name} {order.buyer_phone ? `(${order.buyer_phone})` : ""}</p>
                    <p className="text-sm text-gray-700">Payment: {order.payment_method || "Pay Later"} - {order.payment_status || "Pending"}</p>
                  </div>
                  <span className="h-fit rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{order.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["Accepted", "Rejected", "Packed", "Shipped", "Delivered"].map((status) => (
                    <button key={status} className={`rounded-lg py-2 text-xs font-bold text-white ${status === "Rejected" ? "bg-red-600" : "bg-green-600"}`} onClick={() => setStatus(order.id, status)}>{status}</button>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="font-bold">Order Status Timeline</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {steps.map((step) => (
                      <span key={step} className={`rounded-full px-3 py-1 text-xs font-bold ${steps.indexOf(step) <= steps.indexOf(order.status) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{step}</span>
                    ))}
                    {["Rejected", "Cancelled"].includes(order.status) && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{order.status}</span>}
                  </div>
                </div>
                {order.payment_status !== "Paid" && (
                  (order.payment_method === "Cash on Delivery" && order.status === "Delivered") ||
                  (order.payment_method !== "Cash on Delivery" && !["Pending", "Rejected", "Cancelled"].includes(order.status))
                ) && (
                  <button className="mt-3 w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-extrabold text-white" onClick={() => markPaid(order)}>
                    {order.payment_method === "Cash on Delivery" && order.status === "Delivered" ? "Mark Payment Collected" : "Mark Payment Paid"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
