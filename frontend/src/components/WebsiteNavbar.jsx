import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaBars, FaSeedling, FaTimes } from "react-icons/fa";

const links = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Features", "/#features"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

export default function WebsiteNavbar() {
  const [open, setOpen] = useState(false);
  const navClass = ({ isActive }) => `font-extrabold ${isActive ? "text-green-700" : "text-gray-700 hover:text-green-700"}`;

  return (
    <header className="sticky top-0 z-30 border-b border-green-100 bg-white/95 backdrop-blur">
      <div className="website-container flex min-h-[72px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold text-green-800">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-700 text-white"><FaSeedling /></span>
          FarmKart
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, to]) => to.includes("#") ? <a key={label} href={to} className="font-extrabold text-gray-700 hover:text-green-700">{label}</a> : <NavLink key={label} to={to} className={navClass}>{label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="font-extrabold text-gray-700 hover:text-green-700">Login</Link>
          <Link to="/register" className="rounded-lg bg-green-700 px-4 py-2 font-extrabold text-white shadow-sm">Register</Link>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-800 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>
      {open && (
        <div className="border-t border-green-100 bg-white md:hidden">
          <div className="website-container grid gap-3 py-4">
            {links.map(([label, to]) => <Link key={label} to={to.replace("/#", "/#")} className="font-extrabold text-gray-700" onClick={() => setOpen(false)}>{label}</Link>)}
            <Link to="/login" className="font-extrabold text-gray-700" onClick={() => setOpen(false)}>Login</Link>
            <Link to="/register" className="rounded-lg bg-green-700 px-4 py-2 text-center font-extrabold text-white" onClick={() => setOpen(false)}>Register</Link>
          </div>
        </div>
      )}
    </header>
  );
}
