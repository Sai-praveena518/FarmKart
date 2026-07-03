import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = filter === "All" ? {} : { status: filter };
      const res = await api.get("/api/payments", { params });
      setPayments(res.data || []);
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const totals = useMemo(() => payments.reduce((sum, item) => sum + Number(item.amount || 0), 0), [payments]);

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Payments" tone="green" back />
        <div className="screen-body pb-0 text-left">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {["All", "Pending", "Paid"].map((item) => (
              <button key={item} type="button" className={`rounded-lg py-2 text-sm font-extrabold ${filter === item ? "bg-green-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"}`} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <section className="mb-3 rounded-lg bg-green-50 p-3">
            <p className="text-xs font-bold text-green-700">Listed Amount</p>
            <p className="text-xl font-extrabold text-green-900">{money(totals)}</p>
          </section>
          {loading && <Loading label="Loading payments..." />}
          {message && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}
          {!loading && !message && payments.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">No payments found.</p>}
          <div className="space-y-3">
            {payments.map((payment) => (
              <article key={payment.order_id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">Order #{payment.order_id}</p>
                    <p className="text-sm font-semibold text-gray-600">Buyer: {payment.buyer || "-"}</p>
                    <p className="text-sm font-semibold text-gray-600">Farmer: {payment.farmer || "-"}</p>
                    <p className="text-sm font-semibold text-gray-600">Method: {payment.payment_method || "Pay Later"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${payment.payment_status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {payment.payment_status || "Pending"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-gray-700">
                  <span>Amount: {money(payment.amount)}</span>
                  <span>Order: {payment.order_status || "-"}</span>
                  <span className="col-span-2">Transaction: {payment.transaction_id || "-"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
