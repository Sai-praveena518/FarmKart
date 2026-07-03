import { useState } from "react";
import { FaDownload, FaUpload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { crops } from "../data/marketData";
import {
  AppStage,
  BottomNav,
  PhoneFrame,
  ScreenHeader,
} from "../components/MobileShell";
import Toast from "../components/Toast";
import { getStoredUser, getToken } from "../utils/auth";

export default function AIPricePrediction() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const token = getToken();
  const role = (user?.role || "").toLowerCase();

  const [form, setForm] = useState({
    crop_name: "Tomato",
    market: "",
    quantity: "",
  });

  const [result, setResult] = useState(null);
  const [csv, setCsv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const checkFarmerAccess = () => {
    if (!token) {
      setToastType("error");
      setToast("Please login first.");
      navigate("/login?role=Farmer");
      return false;
    }

    if (role !== "farmer") {
      setToastType("error");
      setToast("Access denied. Please login as Farmer.");
      return false;
    }

    return true;
  };

  const predict = async () => {
    if (!checkFarmerAccess()) return;

    setLoading(true);
    setToast("");
    setResult(null);

    try {
      const res = await api.post("/api/ai/price-predict", form);
      setResult(res.data);
    } catch (error) {
      console.log("AI Price Prediction Error:", error);

      const status = error.response?.status;

      setResult(null);
      setToastType("error");

      if (status === 401) {
        localStorage.clear();
        setToast("Session expired. Please login again.");
        navigate("/login?role=Farmer");
        return;
      }

      if (status === 403) {
        setToast("Access denied. Please login as Farmer.");
        return;
      }

      setToast(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to generate prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async () => {
    if (!checkFarmerAccess()) return;

    if (!csv) {
      setToastType("error");
      setToast("Select a CSV file first.");
      return;
    }

    const payload = new FormData();
    payload.append("file", csv);

    setLoading(true);
    setToast("");

    try {
      const res = await api.post("/api/ai/upload-price-history", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setToastType("success");
      setToast(res.data?.message || "CSV uploaded successfully.");
    } catch (error) {
      console.log("CSV Upload Error:", error);

      const status = error.response?.status;

      setToastType("error");

      if (status === 401) {
        localStorage.clear();
        setToast("Session expired. Please login again.");
        navigate("/login?role=Farmer");
        return;
      }

      if (status === 403) {
        setToast("Access denied. Please login as Farmer.");
        return;
      }

      setToast(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "CSV upload failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const points = result?.chart || [];

  const maxPrice = Math.max(
    ...points.map((point) => Number(point.price || 0)),
    1
  );

  const polyline = points
    .map((point, index) => {
      const x = points.length === 1 ? 130 : (index / (points.length - 1)) * 260;
      const y = 76 - (Number(point.price || 0) / maxPrice) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader
          title="AI Price Prediction"
          tone="green"
          back
          notification={false}
        />

        <div className="screen-body pb-24 text-left">
          <Toast message={toast} type={toastType} />

          <label className="block text-sm font-bold">
            Select Crop
            <select
              className="field mt-2"
              value={form.crop_name}
              onChange={(e) => update("crop_name", e.target.value)}
            >
              {crops.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">
              Market
              <input
                className="field mt-2"
                value={form.market}
                onChange={(e) => update("market", e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="block text-sm font-bold">
              Quantity
              <input
                className="field mt-2"
                type="number"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <button
            className="primary-green mt-5"
            onClick={predict}
            disabled={loading}
          >
            {loading ? "Working..." : "Predict Price"}
          </button>

          <section className="card mt-5 p-4">
            <h2 className="font-extrabold">Upload Historical CSV</h2>

            <p className="mt-1 text-xs font-bold text-gray-600">
              Required columns: crop_name, market, date, price
            </p>

            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept=".csv"
              onChange={(e) => setCsv(e.target.files?.[0] || null)}
            />

            <button
              className="mt-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-green-200 font-extrabold text-green-700"
              onClick={uploadCsv}
              disabled={loading}
            >
              <FaUpload /> Train Model
            </button>
          </section>

          {result && (
            <>
              <section className="card mt-5 space-y-4 p-4">
                <div>
                  <p className="text-sm text-gray-700">
                    Current Market Estimated Price
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-green-700">
                    ₹{result.current_price} / Kg
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-700">
                    Predicted Price After 3 Days
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-blue-700">
                    ₹{result.predicted_price_3_days} / Kg
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-700">
                    Predicted Price After 7 Days
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-orange-600">
                    ₹{result.predicted_price_7_days} / Kg
                  </p>
                </div>

                <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
                  {result.trend} - {result.prediction_type}
                </p>

                <p className="text-sm text-gray-700">{result.note}</p>
              </section>

              {points.length > 0 && (
                <section className="card mt-5 p-4">
                  <h2 className="font-extrabold">Prediction Chart</h2>

                  <svg
                    className="line-chart mt-3"
                    viewBox="0 0 260 82"
                    role="img"
                    aria-label="Prediction chart"
                  >
                    <polyline
                      fill="none"
                      stroke="#07933d"
                      strokeWidth="3"
                      points={polyline}
                    />
                  </svg>

                  <button
                    className="mt-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-green-50 font-extrabold text-green-700"
                    onClick={() => window.print()}
                  >
                    <FaDownload /> Download Report
                  </button>
                </section>
              )}
            </>
          )}
        </div>

        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}