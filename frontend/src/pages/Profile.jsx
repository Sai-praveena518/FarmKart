import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaLocationArrow, FaSpinner } from "react-icons/fa";
import api, { imageUrl } from "../services/api";
import { assets } from "../data/marketData";
import { AppStage, BottomNav, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { clearSession, getStoredUser, getToken, roleKey, setSession, userLocation } from "../utils/auth";
import Toast from "../components/Toast";
import LocationSearch from "../components/LocationSearch";
import WeatherCard from "../components/WeatherCard";

export default function Profile() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [profile, setProfile] = useState(user || {});
  const [savedProfile, setSavedProfile] = useState(user || {});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const currentRole = roleKey(profile.role);

  useEffect(() => {
    if (!profileImage) {
      setProfileImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(profileImage);
    setProfileImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profileImage]);

  const startEditing = () => {
    setToast("");
    setToastType("success");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setProfile(savedProfile);
    setProfileImage(null);
    setToast("");
    setToastType("success");
    setIsEditing(false);
  };

  const save = async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    setSaving(true);
    setToast("");
    try {
      const payload = new FormData();
      [
        "name",
        "phone",
        "address",
        "village",
        "district",
        "state",
        "latitude",
        "longitude",
      ].forEach((key) => {
        const value = profile[key];
        if (value !== null && value !== undefined) payload.append(key, value);
      });
      if (profileImage) payload.append("profile_image", profileImage);
      const res = await api.put("/api/auth/profile", payload, { headers: { "Content-Type": "multipart/form-data" } });
      const updatedUser = res.data.user;
      setSession({ token: getToken(), user: updatedUser });
      setProfile(updatedUser);
      setSavedProfile(updatedUser);
      setProfileImage(null);
      setIsEditing(false);
      setToastType("success");
      setToast("Profile updated successfully");
    } catch (apiError) {
      if (apiError.response?.status === 401) {
        navigate("/login");
        return;
      }
      setToastType("error");
      setToast(apiError.response?.status === 403 ? "Access denied. Please login as Farmer." : apiError.response?.data?.message || "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  const applyLocation = (location) => {
    setProfile((current) => ({
      ...current,
      village: location.village || current.village,
      district: location.district || current.district,
      state: location.state || current.state,
      latitude: location.latitude || current.latitude,
      longitude: location.longitude || current.longitude,
    }));
  };

  const useCurrentLocation = () => {
    setToast("");
    if (!navigator.geolocation) {
      setToastType("error");
      setToast("Location access is not available in this browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.put("/api/auth/location", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            village: profile.village,
            district: profile.district,
            state: profile.state,
          });
          setSession({ token: getToken(), user: res.data.user });
          setProfile(res.data.user);
          setToastType("success");
          setToast("GPS location updated");
        } catch (apiError) {
          if (apiError.response?.status === 401) {
            navigate("/login");
            return;
          }
          setToastType("error");
          setToast(apiError.response?.status === 403 ? "Access denied. Please login as Farmer." : apiError.response?.data?.message || "GPS update failed.");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setToastType("error");
        setToast("Location permission denied. Please search and enter manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const logout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Profile" tone={currentRole === "buyer" ? "blue" : ["admin", "superadmin"].includes(currentRole) ? "purple" : "green"} back />
        <div className="screen-body pb-0 text-left">
          <Toast message={toast} type={toastType} />
          <section className="grid place-items-center text-center">
            <img src={profileImagePreview || (profile.profile_image ? imageUrl(profile.profile_image) : assets.farmer)} alt="Profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-green-100" />
            <h1 className="mt-3 text-xl font-extrabold">{profile.name}</h1>
            <p className="flex items-center gap-2 text-sm font-bold text-green-700"><FaCheckCircle /> {profile.is_verified ? "Verified" : "Verification Pending"}</p>
          </section>
          <section className="mt-6 space-y-3">
            <LocationSearch
              value={userLocation(profile)}
              onSelect={applyLocation}
              onManualChange={(value) => setProfile({ ...profile, village: value })}
              disabled={!isEditing}
            />
            <button type="button" className="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-white font-extrabold text-green-700 disabled:opacity-60" onClick={useCurrentLocation} disabled={!isEditing || gpsLoading}>
              {gpsLoading ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />} Use My Current Location
            </button>
            {[
              ["Name", "name"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["Role", "role"],
              ["Village", "village"],
              ["District", "district"],
              ["State", "state"],
              ["Address", "address"],
              ["Latitude", "latitude"],
              ["Longitude", "longitude"],
            ].map(([label, key]) => (
              <label key={key} className="block text-sm font-bold">
                {label}
                <input className="field mt-2" value={profile[key] || ""} disabled={!isEditing || key === "role" || key === "email"} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
              </label>
            ))}
            <label className="block text-sm font-bold">Profile Photo<input className="mt-2 block w-full text-sm disabled:opacity-60" type="file" accept="image/*" disabled={!isEditing} onChange={(e) => setProfileImage(e.target.files?.[0] || null)} /></label>
          </section>
          <p className="mt-3 text-sm font-bold text-gray-600">Location: {userLocation(profile)}</p>
          <WeatherCard refreshKey={`${profile.latitude || ""}-${profile.longitude || ""}-${userLocation(profile)}`} />
          <button className="primary-green mt-5 disabled:opacity-60" onClick={isEditing ? save : startEditing} disabled={saving}>{isEditing ? (saving ? "Saving..." : "Save Profile") : "Edit Profile"}</button>
          {isEditing && <button className="mt-3 flex h-[42px] w-full items-center justify-center rounded-lg border border-gray-300 font-extrabold" onClick={cancelEditing} disabled={saving}>Cancel</button>}
          <button className="mt-3 flex h-[42px] w-full items-center justify-center rounded-lg border border-gray-300 font-extrabold">Change Password</button>
          <button className="mt-3 flex h-[42px] w-full items-center justify-center rounded-lg bg-red-50 font-extrabold text-red-700" onClick={logout}>Logout</button>
        </div>
        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
