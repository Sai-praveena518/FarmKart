import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import api from "../services/api";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!emailPattern.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!/^\d{10}$/.test(form.phone.trim())) errors.phone = "Phone number must be exactly 10 digits.";
  if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
  if (!form.role) errors.role = "Please select a role.";
  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "Farmer" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    setFieldErrors(validate(next));
    setTouched((current) => ({ ...current, [key]: true }));
    setError("");
    setSuccess("");
  };

  const showFieldError = (key) => touched[key] && fieldErrors[key];

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const validationErrors = validate(form);
    setFieldErrors(validationErrors);
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true, role: true });
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors)[0]);
      return;
    }
    const { confirmPassword, ...payload } = form;
    try {
      setLoading(true);
      const response = await api.post("/api/auth/register", { ...payload, email: payload.email.trim(), phone: payload.phone.trim(), name: payload.name.trim() });
      setSuccess(response.data?.message || "Registration successful.");
      setTimeout(() => navigate(`/login?role=${form.role}`), 900);
    } catch (apiError) {
      console.error("Registration backend error:", apiError.response?.data || apiError);
      setError(apiError.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container grid items-center gap-10 py-12 lg:grid-cols-[1fr_520px]">
        <section>
          <p className="font-extrabold text-green-700">Your Farm. Your Market.</p>
          <h1 className="mt-3 text-4xl font-extrabold text-gray-950 md:text-6xl">Create your FarmKart account.</h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">Register as a farmer or buyer. Admin and SuperAdmin accounts are managed securely by the backend.</p>
        </section>
        <form onSubmit={submit} className="card p-6">
          <h2 className="text-2xl font-extrabold text-gray-950">Register</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Full Name
              <input className="field mt-2" value={form.name} onChange={(e) => update("name", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, name: true }))} required />
              {showFieldError("name") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.name}</span>}
            </label>
            <label className="block text-sm font-bold">
              Email
              <input className="field mt-2" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} required />
              {showFieldError("email") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.email}</span>}
            </label>
            <label className="block text-sm font-bold">
              Phone
              <input className="field mt-2" inputMode="numeric" value={form.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, phone: true }))} required />
              {showFieldError("phone") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.phone}</span>}
            </label>
            <label className="block text-sm font-bold">
              Role
              <select className="field mt-2" value={form.role} onChange={(e) => update("role", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, role: true }))}>
                <option value="Farmer">Farmer</option>
                <option value="Buyer">Buyer</option>
              </select>
              {showFieldError("role") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.role}</span>}
            </label>
            <label className="block text-sm font-bold">
              Password
              <span className="relative mt-2 block">
                <input className="field pr-11" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} required />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-colors duration-200 hover:text-green-700" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </span>
              {showFieldError("password") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.password}</span>}
            </label>
            <label className="block text-sm font-bold">
              Confirm Password
              <span className="relative mt-2 block">
                <input className="field pr-11" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))} required />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-colors duration-200 hover:text-green-700" type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </span>
              {showFieldError("confirmPassword") && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.confirmPassword}</span>}
            </label>
          </div>
          {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {success && <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">{success}</p>}
          <button className="primary-green mt-5 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
            {loading ? <><FaSpinner className="animate-spin" /> Creating Account...</> : "Create Account"}
          </button>
          <p className="mt-4 text-center text-sm text-gray-700">Already registered? <Link className="font-extrabold text-green-700" to="/login">Login</Link></p>
        </form>
      </main>
      <WebsiteFooter />
    </div>
  );
}
