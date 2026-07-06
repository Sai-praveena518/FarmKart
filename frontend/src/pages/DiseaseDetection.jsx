import { useEffect, useMemo, useRef, useState } from "react";
import { FaCamera, FaRedo, FaSyncAlt, FaTimes, FaUpload } from "react-icons/fa";
import api from "../services/api";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Toast from "../components/Toast";

const CAMERA_ERROR_MESSAGES = {
  NotAllowedError: "Camera permission denied. Please allow camera access or upload an image.",
  PermissionDeniedError: "Camera permission denied. Please allow camera access or upload an image.",
  NotFoundError: "Camera not available. Please connect a camera or upload an image.",
  DevicesNotFoundError: "Camera not available. Please connect a camera or upload an image.",
};

function CameraButton({ children, className = "", ...props }) {
  return (
    <button
      className={`min-h-[42px] rounded-lg px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export default function DiseaseDetection() {
  const [mode, setMode] = useState("upload");
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("error");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const isFrontCamera = facingMode === "user";

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const showToast = (message, type = "error") => {
    setToast(message);
    setToastType(type);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const closeCamera = () => {
    stopCamera();
    showToast("Camera closed.", "success");
  };

  const openCamera = async (nextFacingMode = facingMode) => {
    setMode("camera");
    setResult(null);
    showToast("", "error");

    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Browser doesn't support camera. Please use image upload instead.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode } },
        audio: false,
      });
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current === stream) {
            streamRef.current = null;
            setCameraOpen(false);
            showToast("Camera closed.", "success");
          }
        };
      });
      streamRef.current = stream;
      setFacingMode(nextFacingMode);
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      stopCamera();
      showToast(CAMERA_ERROR_MESSAGES[error.name] || "Unable to open camera. Please try again or upload an image.");
    }
  };

  const switchCamera = async () => {
    const nextFacingMode = isFrontCamera ? "environment" : "user";
    setFacingMode(nextFacingMode);
    await openCamera(nextFacingMode);
  };

  const detect = async (selectedImage = image) => {
    if (!selectedImage) {
      showToast("Upload a leaf image first.");
      return;
    }
    const payload = new FormData();
    payload.append("image", selectedImage);
    if (crop) payload.append("crop_name", crop);
    setLoading(true);
    showToast("", "error");
    try {
      const res = await api.post("/api/ai/disease-detect", payload, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      showToast("Disease detection completed successfully.", "success");
    } catch (error) {
      setResult(null);
      showToast(error.response?.status === 403 ? "Access denied. Please login as Farmer." : error.response?.data?.message || "Disease detection failed.");
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!cameraOpen || !video || !canvas || !streamRef.current) {
      showToast("Open camera before capturing a photo.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      showToast("Camera preview is still loading. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast("Could not capture photo. Please try again.");
        return;
      }

      const capturedImage = new File([blob], `leaf-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImage(capturedImage);
      stopCamera();
      await detect(capturedImage);
    }, "image/jpeg", 0.92);
  };

  const retakePhoto = async () => {
    setImage(null);
    setResult(null);
    await openCamera(facingMode);
  };

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setResult(null);
    showToast("", "error");
    if (nextMode === "upload") {
      stopCamera();
    }
  };

  const handleUpload = (file) => {
    setImage(file || null);
    setResult(null);
    showToast("", "error");
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Disease Detection" tone="green" back notification={false} />
        <div className="screen-body pb-0 text-left">
          <Toast message={toast} type={toastType} />
          <label className="block text-sm font-bold">Crop Name<input className="field mt-2" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Optional" /></label>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-green-50 p-2">
            <button className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg text-sm font-extrabold ${mode === "upload" ? "bg-white text-green-700 shadow-sm" : "text-green-800"}`} type="button" onClick={() => chooseMode("upload")}>
              <FaUpload /> Upload Image
            </button>
            <button className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg text-sm font-extrabold ${mode === "camera" ? "bg-white text-green-700 shadow-sm" : "text-green-800"}`} type="button" onClick={() => chooseMode("camera")}>
              <FaCamera /> Use Camera
            </button>
          </div>

          {mode === "upload" && (
            <>
              <label className="mt-4 block text-sm font-bold">Upload Leaf Image</label>
              <input className="mt-3 block w-full text-sm" type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])} />
            </>
          )}

          {preview ? (
            <img src={preview} alt="Leaf disease preview" className="mt-3 h-[205px] w-full rounded-lg object-cover" />
          ) : (
            <div className="mt-3 grid h-[205px] place-items-center rounded-lg bg-green-50 text-sm font-bold text-green-700">No image selected</div>
          )}

          {mode === "camera" && (
            <section className="mt-5 rounded-lg border border-green-100 bg-green-50 p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-green-800">{isFrontCamera ? "Front Camera" : "Back Camera"}</p>
                <CameraButton className="flex items-center gap-2 border border-green-700 bg-white text-green-700" onClick={switchCamera} disabled={loading}>
                  <FaSyncAlt /> Switch Camera
                </CameraButton>
              </div>
              <div className="relative overflow-hidden rounded-lg bg-slate-950">
                <video ref={videoRef} className={`h-[245px] w-full object-cover ${cameraOpen ? "block" : "hidden"} ${isFrontCamera ? "scale-x-[-1]" : ""}`} autoPlay playsInline muted />
                {!cameraOpen && (
                  <div className="grid h-[245px] place-items-center px-4 text-center text-sm font-bold text-green-100">Camera preview appears here</div>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <CameraButton className="flex items-center justify-center gap-2 bg-gradient-to-b from-green-600 to-green-700 text-white shadow-sm" onClick={() => openCamera(facingMode)} disabled={loading || cameraOpen}>
                  <FaCamera /> Open Camera
                </CameraButton>
                <CameraButton className="flex items-center justify-center gap-2 bg-gradient-to-b from-green-600 to-green-700 text-white shadow-sm" onClick={capturePhoto} disabled={loading || !cameraOpen}>
                  <FaCamera /> Capture Photo
                </CameraButton>
                <CameraButton className="flex items-center justify-center gap-2 border border-green-700 bg-white text-green-700" onClick={retakePhoto} disabled={loading}>
                  <FaRedo /> Retake Photo
                </CameraButton>
                <CameraButton className="flex items-center justify-center gap-2 border border-red-200 bg-white text-red-700" onClick={closeCamera} disabled={!cameraOpen}>
                  <FaTimes /> Close Camera
                </CameraButton>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </section>
          )}

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
