import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaHeart, FaLeaf, FaMapMarkerAlt, FaPhone, FaSearch, FaSeedling, FaShoppingCart, FaStar, FaWarehouse } from "react-icons/fa";
import api, { imageUrl } from "../services/api";
import { categories } from "../data/marketData";
import Loading from "../components/Loading";
import { getStoredUser, setSession, userLocation } from "../utils/auth";
import Toast from "../components/Toast";
import DashboardLayout from "../components/DashboardLayout";

const icons = { leaf: <FaLeaf />, apple: <FaLeaf />, wheat: <FaSeedling />, seedling: <FaSeedling />, warehouse: <FaWarehouse /> };
const categoryCrops = {
  Vegetables: ["tomato", "onion", "potato", "brinjal", "chilli", "carrot", "cabbage"],
  Fruits: ["mango", "banana", "apple", "orange", "grapes", "papaya"],
  Grains: ["rice", "wheat", "maize", "corn", "millet"],
  Pulses: ["dal", "gram", "lentil", "pea", "bean"],
};

export default function BuyerDashboard() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("Latest");
  const [priceRange, setPriceRange] = useState("all");
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(getStoredUser());
  const [toast, setToast] = useState("");

  const loadProducts = async (locationUser = user) => {
    setLoading(true);
    setToast("");
    const hasLocation = locationUser?.latitude && locationUser?.longitude;
    try {
      const res = await api.get(hasLocation ? "/api/products/nearby" : "/api/products", {
        params: hasLocation ? { lat: locationUser.latitude, lng: locationUser.longitude, radius: 50 } : {},
      });
      setProducts(res.data || []);
    } catch (apiError) {
      setProducts([]);
      setToast(apiError.response?.data?.message || "Unable to load products near your location.");
    } finally {
      setLoading(false);
    }
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setToast("Location access is not available in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.put("/api/auth/location", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            village: user?.village,
            district: user?.district,
            state: user?.state,
          });
          setSession({ token: localStorage.getItem("fmd_token") || localStorage.getItem("token"), user: res.data.user });
          setUser(res.data.user);
          loadProducts(res.data.user);
        } catch (apiError) {
          setToast(apiError.response?.data?.message || "Unable to save GPS location.");
          setLoading(false);
        }
      },
      () => {
        setToast("Location permission denied. Products are shown without distance sorting.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    loadProducts(user);
  }, []);

  const visible = useMemo(() => {
    const filtered = products.filter((item) => {
    const crop = (item.crop_name || "").toLowerCase();
    const matchesSearch = crop.includes(query.toLowerCase());
    const categoryTerms = categoryCrops[category] || [];
    const matchesCategory = !category || item.category === category || category === "Others" || categoryTerms.some((term) => crop.includes(term));
    const price = Number(item.price || 0);
    const matchesPrice = priceRange === "all" || (priceRange === "low" && price <= 50) || (priceRange === "mid" && price > 50 && price <= 150) || (priceRange === "high" && price > 150);
    return matchesSearch && matchesCategory && matchesPrice;
  });
    return [...filtered].sort((a, b) => {
      if (sort === "Popular") return Number(b.orders_count || 0) - Number(a.orders_count || 0);
      if (sort === "Nearby") return Number(a.distance_km || 9999) - Number(b.distance_km || 9999);
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [category, priceRange, products, query, sort]);

  const buy = async (product, addToCart = false) => {
    try {
      if (addToCart) {
        await api.post("/api/cart", { product_id: product.id, quantity: 1 });
        setToast("Added to cart.");
        return;
      }
      await api.post("/api/orders", { product_id: product.id, crop_name: product.crop_name, quantity: 1, payment_method: "Pay Later", delivery_address: userLocation(user) });
      setToast("Order placed successfully.");
      loadProducts(user);
    } catch (apiError) {
      setToast(apiError.response?.data?.message || "Unable to complete action.");
    }
  };

  return (
    <DashboardLayout role="Buyer" title="Buyer Dashboard">
        <div className="text-left">
          <Toast message={toast} type="error" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-extrabold">{user?.village ? `Products near ${user.village}` : "Location"}</p>
              <p className="text-sm text-gray-700">{userLocation(user) || "Allow location to see nearby products first"}</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700" onClick={useGps} aria-label="Use current location">
              <FaMapMarkerAlt />
            </button>
          </div>
          <div className="relative mt-4">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input className="field pl-10" placeholder="Search for products..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Categories</h2>
            <Link to="/buyer/orders" className="text-sm font-bold text-blue-700">Orders</Link>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {categories.map((item) => (
              <button key={item.label} className="text-center text-[10px] font-bold text-gray-700" onClick={() => setCategory((current) => current === item.label ? "" : item.label)}>
                <span className={`mx-auto mb-1 grid h-11 w-11 place-items-center rounded-full text-xl ${item.label === category ? "bg-blue-100 text-blue-700" : "bg-orange-50 text-green-700"}`}>{icons[item.icon]}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Available Products</h2>
            <select className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-blue-700" value={sort} onChange={(e) => setSort(e.target.value)}>
              {["Latest", "Nearby", "Popular"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-bold">
            {[
              ["all", "All"],
              ["low", "Under 50"],
              ["mid", "50-150"],
              ["high", "150+"],
            ].map(([value, label]) => (
              <button key={value} className={`rounded-lg px-2 py-2 ${priceRange === value ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setPriceRange(value)}>{label}</button>
            ))}
          </div>
          <div className="mt-2 space-y-3">
            {loading && <Loading label="Loading products..." />}
            {!loading && visible.length === 0 && <p className="card p-4 text-center text-sm font-bold text-gray-600">{user?.latitude ? "No products near your location" : "No available products found."}</p>}
            {visible.map((product) => (
              <article key={product.id} className="card overflow-hidden">
                {imageUrl(product.images?.[0] || product.image) || product.image ? (
                  <Link to={`/products/${product.id}`} className="block h-44 w-full bg-gray-50 p-3">
                    <img src={imageUrl(product.images?.[0] || product.image) || product.image} alt={product.crop_name} className="h-full w-full rounded-xl object-contain" />
                  </Link>
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-500">
                    No Image
                  </div>
                )}
                <div className="p-3">
                  <div className="flex justify-between gap-2">
                    <Link to={`/products/${product.id}`} className="font-extrabold text-gray-950">{product.crop_name}</Link>
                    <button onClick={() => setWishlist((items) => items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id])} className="text-red-500">
                      <FaHeart className={wishlist.includes(product.id) ? "" : "opacity-30"} />
                    </button>
                  </div>
                  <p className="mt-1 font-extrabold text-green-700">Rs {product.price} / {product.unit || "Kg"}</p>
                  <p className="text-sm text-gray-700">{product.farmer_name} - {product.village || product.district || "Farm"}</p>
                  <p className="text-sm text-gray-700">{product.distance_km ? `${product.distance_km} km away` : [product.village, product.district].filter(Boolean).join(", ")}</p>
                  <p className="text-xs font-bold text-gray-500">Stock: {product.quantity} {product.unit || "Kg"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-600"><FaStar /> {Number(product.rating || 0) ? product.rating : "New"}</span>
                    {product.farmer_phone && <a href={`tel:${product.farmer_phone}`} className="rounded-md bg-blue-50 px-2 py-2 text-xs font-extrabold text-blue-700"><FaPhone className="inline" /> Call</a>}
                    <button onClick={() => buy(product, true)} className="rounded-md bg-green-50 px-2 py-2 text-xs font-extrabold text-green-700">Cart</button>
                    <button onClick={() => buy(product)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-extrabold text-white">
                      <FaShoppingCart className="inline" /> Buy Now
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Link to="/buyer/notifications" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-3 font-bold text-blue-700">
            <FaBell /> Price, weather and transport alerts
          </Link>
        </div>
    </DashboardLayout>
  );
}
