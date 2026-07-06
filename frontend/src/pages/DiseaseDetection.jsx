import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Toast from "../components/Toast";

export default function DiseaseDetection() {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [toast, setToast] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, []);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setToast("");
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Browser not supported. Please use image upload instead.");
      return;
    }

    try {
      closeCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setToast("Camera permission denied. Please allow camera access or upload an image.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setToast("Camera not available. Please connect a camera or upload an image.");
      } else {
        setToast("Unable to open camera. Please try again or upload an image.");
      }
      closeCamera();
    }
  };

  const detect = async (selectedImage = image) => {
    if (!selectedImage) {
      setToast("Upload a leaf image first.");
      return;
    }
    const payload = new FormData();
    payload.append("image", selectedImage);
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

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!cameraOpen || !video || !canvas || !streamRef.current) {
      setToast("Open camera before capturing a photo.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setToast("Camera preview is still loading. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setToast("Could not capture photo. Please try again.");
        return;
      }

      const capturedImage = new File([blob], `leaf-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImage(capturedImage);
      await detect(capturedImage);
    }, "image/jpeg", 0.92);
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
          <section className="mt-5 rounded-lg border border-green-100 bg-green-50 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <button className="primary-green" type="button" onClick={openCamera} disabled={loading}>
                Open Camera
              </button>
              <button className="primary-green" type="button" onClick={capturePhoto} disabled={loading || !cameraOpen}>
                Capture Photo
              </button>
              <button className="min-h-[42px] rounded-lg border border-green-700 bg-white px-4 text-sm font-extrabold text-green-700 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={closeCamera} disabled={!cameraOpen}>
                Close Camera
              </button>
            </div>
            <div className="relative mt-3 overflow-hidden rounded-lg bg-slate-950">
              <video ref={videoRef} className={`h-[205px] w-full object-cover ${cameraOpen ? "block" : "hidden"}`} autoPlay playsInline muted />
              {!cameraOpen && (
                <div className="grid h-[205px] place-items-center px-4 text-center text-sm font-bold text-green-100">Camera preview appears here</div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </section>
          <button className="primary-green mt-5" onClick={() => detect()} disabled={loading}>{loading ? "Checking..." : "Detect Disease"}</button>
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
