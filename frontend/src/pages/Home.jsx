import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaChartLine, FaCloudSun, FaHandshake, FaLeaf, FaMapMarkerAlt, FaSeedling, FaShoppingBasket, FaStar, FaTruck, FaUserCheck } from "react-icons/fa";
import api from "../services/api";
import { assets } from "../data/marketData";
import farmKartLogoLockup from "../assets/farmkart-logo-lockup-transparent.png";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";
import StatCard from "../components/StatCard";
import { clearSession } from "../utils/auth";
import useCms, { cmsAsset } from "../hooks/useCms";

const features = [
  ["Direct Farmer to Buyer Market", FaHandshake],
  ["AI Price Prediction", FaChartLine],
  ["Crop Disease Detection", FaLeaf],
  ["Nearby Farmers", FaMapMarkerAlt],
  ["Transport Sharing", FaTruck],
  ["Live Weather", FaCloudSun],
  ["Profit Report", FaShoppingBasket],
  ["Secure Orders", FaUserCheck],
  ["Reviews and Ratings", FaStar],
  ["Admin Verification", FaUserCheck],
];

export default function Home() {
  const [stats, setStats] = useState({ farmers: 0, buyers: 0, products: 0, orders: 0 });
  const { settings, banners } = useCms();
  const heroImage = cmsAsset(settings.home_page_hero_image) || assets.farmKartHero;
  const activeBanner = banners[0];

  useEffect(() => {
    clearSession();
    api.get("/api/public/stats").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div className="farm-landing min-h-screen">
      <WebsiteNavbar />
      <main>
        <section className="farm-hero website-container grid min-h-[calc(100vh-92px)] items-center gap-12 pb-28 pt-10 md:grid-cols-[0.9fr_1fr]">
          <div className="farm-hero-copy">
            <img className="farm-logo-lockup" src={farmKartLogoLockup} alt="FarmKart - Your Farm. Your Market." />
            <p className="font-extrabold text-green-700">{settings.home_page_caption}</p>
            <p className="farm-hero-text">{settings.home_page_description}</p>
            <div className="farm-hero-actions">
              <Link to="/register" className="farm-hero-primary">Get Started <FaArrowRight /></Link>
              <Link to="/products" className="farm-hero-secondary">View Products</Link>
            </div>
            {activeBanner && (
              <a href={activeBanner.target_url || "#features"} className="mt-5 block rounded-lg border border-green-100 bg-white/90 p-3 text-sm font-bold text-green-800 shadow-sm">
                {activeBanner.title}
                {activeBanner.caption && <span className="mt-1 block text-xs text-gray-600">{activeBanner.caption}</span>}
              </a>
            )}
          </div>
          <div className="farm-hero-photo">
            <div>
              <img src={heroImage} alt="FarmKart farmer" />
            </div>
          </div>
        </section>

        <section className="farm-stats-wrap">
          <div className="farm-stats website-container grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<FaSeedling />} label="Farmers" value={stats.farmers ? `${stats.farmers}+` : "10K+"} />
            <StatCard icon={<FaHandshake />} label="Buyers" value={stats.buyers ? `${stats.buyers}+` : "25K+"} tone="blue" />
            <StatCard icon={<FaShoppingBasket />} label="Products" value={stats.products ? `${stats.products}+` : "50K+"} tone="orange" />
            <StatCard icon={<FaTruck />} label="Orders Delivered" value={stats.orders ? `${stats.orders}+` : "5K+"} tone="purple" />
          </div>
        </section>

        <section id="features" className="website-container py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold text-gray-950">Built for modern farm commerce</h2>
            <p className="mt-3 text-gray-600">Everything needed to sell, buy, verify, transport, and analyze farm produce in one platform.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {features.map(([title, Icon]) => (
              <article key={title} className="card p-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-700"><Icon /></span>
                <h3 className="mt-3 font-extrabold text-gray-950">{title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 py-16">
          <div className="website-container grid gap-8 md:grid-cols-3">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-950">How It Works</h2>
              <ol className="mt-5 grid gap-3 text-sm font-bold text-gray-700">
                <li>1. Farmer registers</li>
                <li>2. Farmer adds products</li>
                <li>3. Buyer places order</li>
                <li>4. Farmer accepts order</li>
                <li>5. Transport, payment, and profit tracking</li>
              </ol>
            </div>
            <div className="card p-6">
              <h3 className="text-xl font-extrabold text-green-800">For Farmers</h3>
              <p className="mt-3 text-gray-600">Sell directly, manage products, accept orders, track revenue, and use AI tools.</p>
            </div>
            <div className="card p-6">
              <h3 className="text-xl font-extrabold text-blue-800">For Buyers</h3>
              <p className="mt-3 text-gray-600">Search products, buy fresh crops, contact farmers, and track orders.</p>
            </div>
          </div>
        </section>
      </main>
      <WebsiteFooter />
    </div>
  );
}
