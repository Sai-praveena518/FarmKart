import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import api from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { clearSession, setSession } from "../utils/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearSession();
    const rememberedEmail = localStorage.getItem("farmkart_admin_email") || "";
    if (rememberedEmail) {
      setForm((current) => ({ ...current, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      let res;
      try {
        res = await api.post("/api/admin/login", form);
      } catch (apiError) {
        if (apiError.response?.status !== 404) throw apiError;
        res = await api.post("/admin/login", form);
      }
      const user = res.data.user;
      setSession({ token: res.data.access_token || res.data.token, user });
      if (rememberMe) {
        localStorage.setItem("farmkart_admin_email", form.email);
      } else {
        localStorage.removeItem("farmkart_admin_email");
      }
      setSuccess("Welcome Back, Admin");
      setTimeout(() => navigate("/admin/dashboard", { replace: true }), 700);
    } catch (apiError) {
      const backendMessage = apiError.response?.data?.message || apiError.response?.data;
      setError(typeof backendMessage === "string" ? backendMessage : "Server Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKey = (event) => {
    setCapsLockOn(event.getModifierState?.("CapsLock") || false);
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Admin Login" tone="purple" back notification={false} />
        <form onSubmit={submit} className="screen-body space-y-4 text-left">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {success && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">{success}</p>}
          <label className="block text-sm font-bold">
            Email
            <input className="field mt-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block text-sm font-bold">
            Password
            <span className="relative mt-2 block">
              <input
                className="field pr-11"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={handlePasswordKey}
                onKeyUp={handlePasswordKey}
                onBlur={() => setCapsLockOn(false)}
                required
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-colors duration-200 hover:text-purple-700"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </span>
            {capsLockOn && <span className="mt-1 block text-xs font-extrabold text-orange-600">Caps Lock is ON</span>}
          </label>
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 font-bold text-gray-700">
              <input
                className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember Me
            </label>
            <a className="font-extrabold text-purple-700 transition-colors duration-200 hover:text-purple-900" href="mailto:admin@farmkart.local?subject=FarmKart Admin Password Reset">
              Forgot Password?
            </a>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-3 font-extrabold text-white shadow-lg transition duration-200 hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
            {loading ? <><FaSpinner className="animate-spin" /> Signing In...</> : "Login Securely"}
          </button>
        </form>
      </PhoneFrame>
    </AppStage>
  );
}
