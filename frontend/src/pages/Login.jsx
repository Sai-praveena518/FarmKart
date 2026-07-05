import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash, FaSeedling } from "react-icons/fa";
import api from "../services/api";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";
import { clearSession, normalizeRole, roleKey, setSession } from "../utils/auth";
import useCms, { cmsAsset } from "../hooks/useCms";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = useMemo(() => (normalizeRole(params.get("role")) === "Buyer" ? "Buyer" : "Farmer"), [params]);
  const [form, setForm] = useState({ email: "", password: "", role: initialRole });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { settings } = useCms();
  const loginBanner = cmsAsset(settings.login_page_banner);

  useEffect(() => {
    clearSession();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const res = await api.post("/api/auth/login", form);
      const user = res.data.user;
      setSession({ token: res.data.access_token || res.data.token, user });
      navigate(roleKey(user.role) === "buyer" ? "/buyer/dashboard" : "/farmer/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Login failed. Check your email and password.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container grid min-h-[calc(100vh-160px)] items-center gap-10 py-12 lg:grid-cols-[1fr_460px]">
        <section>
          <p className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-extrabold text-green-700"><FaSeedling /> FarmKart Login</p>
          <h1 className="mt-5 text-4xl font-extrabold text-gray-950 md:text-6xl">Welcome back to your market.</h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">Login as a farmer or buyer to manage products, orders, AI tools, transport, and notifications.</p>
          {loginBanner && <img className="mt-6 aspect-[16/9] w-full max-w-xl rounded-lg object-cover shadow-sm" src={loginBanner} alt="FarmKart login" />}
        </section>
        <form onSubmit={submit} className="card p-6">
          <h2 className="text-2xl font-extrabold text-gray-950">Login</h2>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {["Farmer", "Buyer"].map((role) => (
              <button key={role} type="button" className={`rounded-lg py-3 text-sm font-extrabold ${form.role === role ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setForm({ ...form, role })}>{role}</button>
            ))}
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <label className="mt-5 block text-sm font-bold">Email<input className="field mt-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label className="mt-4 block text-sm font-bold">
            Password
            <span className="relative mt-2 block">
              <input className="field pr-11" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-colors duration-200 hover:text-green-700" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </span>
          </label>
          <button className={form.role === "Buyer" ? "primary-blue mt-5" : "primary-green mt-5"}>Login Securely</button>
          <p className="mt-4 text-center text-sm text-gray-700">New user? <Link className="font-extrabold text-green-700" to="/register">Register</Link></p>
          <p className="mt-2 text-center text-xs text-gray-500"><Link to="/admin/login">Admin?</Link></p>
        </form>
      </main>
      <WebsiteFooter />
    </div>
  );
}
