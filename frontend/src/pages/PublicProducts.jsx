import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import api, { imageUrl } from "../services/api";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";

export default function PublicProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    api.get("/api/public/products").then((res) => setProducts(res.data || [])).catch(() => setProducts([])).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => products.filter((item) => {
    const text = `${item.crop_name || ""} ${item.farmer_name || ""}`.toLowerCase();
    const place = `${item.location || ""} ${item.village || ""} ${item.district || ""}`.toLowerCase();
    return text.includes(search.toLowerCase()) && place.includes(location.toLowerCase());
  }), [products, search, location]);

  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-extrabold text-green-700">Browse Products</p>
            <h1 className="mt-2 text-4xl font-extrabold text-gray-950">Fresh produce from verified farmers</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative block"><FaSearch className="absolute left-3 top-3 text-gray-400" /><input className="field pl-10" placeholder="Search crop" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <label className="relative block"><FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" /><input className="field pl-10" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          </div>
        </div>
        <section className="mt-8">
          {loading && <Loading label="Loading products..." />}
          {!loading && visible.length === 0 && <EmptyState message="No products found." />}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <article key={product.id} className="card overflow-hidden">
                {imageUrl(product.images?.[0] || product.image) || product.image ? (
                  <Link to={`/products/${product.id}`} className="block h-52 w-full bg-gray-50 p-3">
                    <img src={imageUrl(product.images?.[0] || product.image) || product.image} alt={product.crop_name} className="h-full w-full rounded-xl object-contain" />
                  </Link>
                ) : (
                  <div className="flex h-52 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-500">
                    No Image
                  </div>
                )}
                <div className="p-4">
                  <Link to={`/products/${product.id}`} className="text-xl font-extrabold text-gray-950">{product.crop_name}</Link>
                  <p className="mt-1 text-lg font-extrabold text-green-700">Rs {product.price} / Kg</p>
                  <p className="mt-1 text-sm font-bold text-gray-600">Qty: {product.quantity} Kg</p>
                  <p className="mt-1 text-sm text-gray-600">{product.farmer_name || "Farmer"}</p>
                  <p className="mt-1 text-sm text-gray-600">{[product.village, product.district, product.location].filter(Boolean).join(", ")}</p>
                  <Link to={`/products/${product.id}`} className="mt-4 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-extrabold text-white">View Details</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <WebsiteFooter />
    </div>
  );
}
