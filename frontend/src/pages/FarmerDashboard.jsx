import { Link } from "react-router-dom";
import { FaChartLine, FaCheckCircle, FaLeaf, FaMapMarkerAlt, FaShoppingBasket, FaShoppingCart, FaWallet } from "react-icons/fa";
import { assets } from "../data/marketData";
import { getStoredUser, userLocation } from "../utils/auth";
import { imageUrl } from "../services/api";
import WeatherCard from "../components/WeatherCard";
import DashboardLayout from "../components/DashboardLayout";

const cards = [
  { title: "Add Product", icon: <FaShoppingBasket />, to: "/farmer/add-product", className: "bg-green-100 text-green-700" },
  { title: "My Products", icon: <FaShoppingBasket />, to: "/farmer/products", className: "bg-green-100 text-green-700" },
  { title: "AI Price Prediction", icon: <FaChartLine />, to: "/farmer/ai-price", className: "bg-blue-100 text-blue-700" },
  { title: "Disease Detection", icon: <FaLeaf />, to: "/farmer/disease-detection", className: "bg-orange-100 text-orange-700" },
  { title: "Nearby Dashboard", icon: <FaMapMarkerAlt />, to: "/farmer/nearby-farmers", className: "bg-purple-100 text-purple-700" },
  { title: "Orders", icon: <FaShoppingCart />, to: "/farmer/orders", className: "bg-red-100 text-red-700" },
];

export default function FarmerDashboard() {
  const user = getStoredUser();
  const location = userLocation(user);
  const profileImage = user?.profile_image ? imageUrl(user.profile_image) : assets.farmer;

  return (
    <DashboardLayout role="Farmer" title="Farmer Dashboard">
        <div>
          <section className="flex items-center gap-4">
            <img src={profileImage} alt={user?.name || "Farmer"} className="h-20 w-20 rounded-full object-cover" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-950">{user?.name}</h2>
              </div>
              <p className="text-sm font-semibold text-gray-700">Farmer ID: FM{String(user?.id || "").padStart(4, "0")}</p>
              <p className="text-sm text-gray-700">{location}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-extrabold text-green-700">
                <FaCheckCircle /> {user?.is_verified ? "Verified Farmer" : "Verification Pending"}
              </span>
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link key={card.title} to={card.to} className={`${card.className} flex min-h-[62px] items-center gap-3 rounded-lg p-3 font-bold text-gray-950`}>
                <span className="text-2xl">{card.icon}</span>
                <span className="text-xs leading-tight">{card.title}</span>
              </Link>
            ))}
          </section>

          <Link to="/farmer/profit-report" className="mt-4 flex min-h-[64px] items-center gap-4 rounded-lg bg-yellow-100 p-4 font-extrabold text-gray-950">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-yellow-400 text-white"><FaWallet /></span>
            Profit Report
          </Link>

          <WeatherCard />

          <Link to="/features" className="mt-4 block rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm font-extrabold text-green-700">
            More Features Included
          </Link>
        </div>
    </DashboardLayout>
  );
}
