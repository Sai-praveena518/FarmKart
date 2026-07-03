import { useMemo, useState } from "react";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Toast from "../components/Toast";

export default function DiseaseDetection() {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);

  const detect = async () => {
    if (!image) {
      setToast("Upload a leaf image first.");
      return;
    }
    const payload = new FormData();
    payload.append("image", image);
    if (crop) payload.append("crop_name", crop);
    setLoading(true);
    setToast("");
    try {
      const res = await api.post("/api/ai/disease-detect", payload, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
    } catch (error) {
      setResult(null);
      setToast(error.response?.status === 403 ? "Access denied. Please login as Farmer." : error.response?.data?.message || "Disease detection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Disease Detection" tone="green" back notification={false} />
        <div className="screen-body pb-0 text-left">
          <Toast message={toast} type="error" />
          <label className="block text-sm font-bold">Crop Name<input className="field mt-2" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Optional" /></label>
          <label className="mt-4 block text-sm font-bold">Upload Leaf Image</label>
          <input className="mt-3 block w-full text-sm" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
          {preview ? (
            <img src={preview} alt="Leaf disease preview" className="mt-3 h-[205px] w-full rounded-lg object-cover" />
          ) : (
            <div className="mt-3 grid h-[205px] place-items-center rounded-lg bg-green-50 text-sm font-bold text-green-700">No image selected</div>
          )}
          <button className="primary-green mt-5" onClick={detect} disabled={loading}>{loading ? "Checking..." : "Detect Disease"}</button>
          {result && (
            <section className="card mt-5 space-y-4 p-4">
              <div>
                <p className="text-sm text-gray-700">Status</p>
                <p className="mt-1 text-xl font-extrabold text-green-700">{result.result || result.status}</p>
              </div>
              <p className="rounded-lg bg-yellow-50 p-3 text-sm font-bold text-yellow-800">{result.message}</p>
              {(result.disease || result.disease_name) && (
                <>
                  <div><p className="font-bold">Disease</p><p className="text-sm text-gray-700">{result.disease_name || result.disease}</p></div>
                  <div><p className="font-bold">Confidence</p><p className="text-sm text-gray-700">{result.confidence}%</p></div>
                  <div><p className="font-bold">Treatment</p><p className="text-sm text-gray-700">{result.treatment}</p></div>
                  <div><p className="font-bold">Fertilizer Recommendation</p><p className="text-sm text-gray-700">{result.fertilizer_recommendation}</p></div>
                  <div><p className="font-bold">Prevention Tips</p><p className="text-sm text-gray-700">{result.prevention || result.prevention_tips}</p></div>
                </>
              )}
            </section>
          )}
        </div>
        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
