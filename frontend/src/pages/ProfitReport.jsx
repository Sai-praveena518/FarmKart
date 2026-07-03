import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaFileExcel } from "react-icons/fa";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

export default function ProfitReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/reports/profit").then((res) => {
      setReport(res.data);
      setError("");
    }).catch((apiError) => {
      setReport(null);
      setError(apiError.response?.status === 403 ? "Access denied. Please login as Farmer." : apiError.response?.data?.message || "Unable to load profit report.");
    }).finally(() => setLoading(false));
  }, []);

  const monthlyPoints = report?.monthly_sales || [];
  const maxMonthly = Math.max(...monthlyPoints.map((item) => Number(item.value || 0)), 1);
  const line = monthlyPoints.map((item, index) => {
    const x = monthlyPoints.length === 1 ? 130 : (index / (monthlyPoints.length - 1)) * 260;
    const y = 76 - (Number(item.value || 0) / maxMonthly) * 64;
    return `${x},${y}`;
  }).join(" ");

  const hasSales = useMemo(() => Number(report?.actual_revenue || 0) > 0 || Number(report?.estimated_revenue || 0) > 0, [report]);

  if (loading) {
    return <AppStage><PhoneFrame><ScreenHeader title="Profit Report" tone="green" back /><div className="screen-body"><Loading label="Loading real analytics..." /></div></PhoneFrame></AppStage>;
  }

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Profit Report" tone="green" back />
        <div className="screen-body pb-0 text-left">
          {!report && <p className="card p-4 text-center text-sm font-bold text-red-600">{error || "Unable to load profit report."}</p>}
          {report && (
            <>
              {!hasSales && <p className="mb-3 rounded-lg bg-gray-50 p-3 text-center text-sm font-bold text-gray-600">No sales yet</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Actual Revenue</p><p className="text-lg font-extrabold text-green-700">{money(report.actual_revenue)}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Estimated Revenue</p><p className="text-lg font-extrabold text-blue-700">{money(report.estimated_revenue)}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Pending Payments</p><p className="text-lg font-extrabold text-orange-600">{money(report.pending_payments)}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Total Orders</p><p className="text-lg font-extrabold text-gray-900">{report.total_orders}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Accepted Orders</p><p className="text-lg font-extrabold text-purple-700">{report.accepted_orders}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Delivered Orders</p><p className="text-lg font-extrabold text-green-700">{report.delivered_orders}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Cancelled Orders</p><p className="text-lg font-extrabold text-red-600">{report.cancelled_orders}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Sold Kg</p><p className="text-lg font-extrabold text-green-700">{report.sold_quantity}</p></div>
                <div className="card p-3"><p className="text-xs font-bold text-gray-600">Net Profit</p><p className="text-lg font-extrabold text-green-700">{money(report.net_profit)}</p></div>
              </div>

              <section className="card mt-5 p-4">
                <h2 className="font-extrabold">Monthly Sales</h2>
                {monthlyPoints.length === 0 ? <p className="mt-3 text-sm font-bold text-gray-600">No monthly sales data.</p> : (
                  <svg className="line-chart mt-4" viewBox="0 0 260 82">
                    <polyline fill="none" stroke="#07933d" strokeWidth="3" points={line} />
                  </svg>
                )}
              </section>

              <section className="card mt-5 p-4">
                <h2 className="font-extrabold">Crop-wise Revenue</h2>
                <div className="mt-3 space-y-2">
                  {(report.crop_revenue || []).length === 0 && <p className="text-sm font-bold text-gray-600">No crop revenue yet.</p>}
                  {(report.crop_revenue || []).map((item) => (
                    <div key={item.crop_name} className="flex items-center justify-between rounded-lg bg-green-50 p-3 text-sm font-bold">
                      <span>{item.crop_name}</span>
                      <span>{money(item.value)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card mt-5 p-4">
                <h2 className="font-extrabold">Exports</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button className="primary-green gap-2" onClick={() => window.print()}><FaDownload /> PDF</button>
                  <button className="primary-blue gap-2" onClick={() => window.print()}><FaFileExcel /> Excel</button>
                </div>
              </section>
            </>
          )}
        </div>
        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
