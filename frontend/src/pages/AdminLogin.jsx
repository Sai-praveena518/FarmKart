import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { clearSession, roleKey, setSession } from "../utils/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    clearSession();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
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
      navigate(roleKey(user.role) === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard", { replace: true });
    } catch (apiError) {
      setError(apiError.response?.data?.message || apiError.response?.data || "Admin login failed.");
    }
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Admin Login" tone="purple" back notification={false} />
        <form onSubmit={submit} className="screen-body space-y-4 text-left">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <label className="block text-sm font-bold">
            Email
            <input className="field mt-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block text-sm font-bold">
            Password
            <input className="field mt-2" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button className="rounded-lg bg-purple-700 px-4 py-3 font-extrabold text-white shadow-lg">Login Securely</button>
        </form>
      </PhoneFrame>
    </AppStage>
  );
}
