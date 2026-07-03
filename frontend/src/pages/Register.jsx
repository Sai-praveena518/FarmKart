import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "Farmer" });
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const { confirmPassword, ...payload } = form;
    try {
      await api.post("/api/auth/register", payload);
      navigate(`/login?role=${form.role}`);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Registration failed.");
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
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Full Name<input className="field mt-2" value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
            <label className="block text-sm font-bold">Email<input className="field mt-2" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
            <label className="block text-sm font-bold">Phone<input className="field mt-2" value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
            <label className="block text-sm font-bold">Role<select className="field mt-2" value={form.role} onChange={(e) => update("role", e.target.value)}><option value="Farmer">Farmer</option><option value="Buyer">Buyer</option></select></label>
            <label className="block text-sm font-bold">Password<input className="field mt-2" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required /></label>
            <label className="block text-sm font-bold">Confirm Password<input className="field mt-2" type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required /></label>
          </div>
          <button className="primary-green mt-5">Create Account</button>
          <p className="mt-4 text-center text-sm text-gray-700">Already registered? <Link className="font-extrabold text-green-700" to="/login">Login</Link></p>
        </form>
      </main>
      <WebsiteFooter />
    </div>
  );
}
