import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { imageUrl } from "../services/api";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import { getStoredUser, roleKey } from "../utils/auth";

export default function PublicProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const user = getStoredUser();
  const currentRole = roleKey(user?.role);

  useEffect(() => {
    api.get(`/api/public/products/${id}`).then((res) => setProduct(res.data)).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [id]);

  const placeOrder = async () => {
    try {
      await api.post("/api/orders", { product_id: product.id, quantity: 1, payment_method: "Pay Later" });
      setMessage("Order placed successfully.");
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Unable to place order.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container py-10">
        {loading && <Loading label="Loading product..." />}
        {!loading && !product && <EmptyState message="Product not found." />}
        {product && (
          <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
            <img src={imageUrl(product.image) || product.image} alt={product.crop_name} className="h-[460px] w-full rounded-lg object-cover" />
            <section>
              <h1 className="text-4xl font-extrabold text-gray-950">{product.crop_name}</h1>
              <p className="mt-3 text-3xl font-extrabold text-green-700">Rs {product.price} / Kg</p>
              <div className="mt-5 grid gap-3 text-sm font-bold text-gray-700">
                <p>Quantity: {product.quantity} Kg</p>
                <p>Farmer: {product.farmer_name}</p>
                <p>Phone: {product.farmer_phone || "-"}</p>
                <p>Location: {[product.village, product.district, product.state, product.location].filter(Boolean).join(", ")}</p>
              </div>
              <p className="mt-5 text-gray-600">{product.description || "Fresh product listed by the farmer."}</p>
              {message && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}
              {currentRole === "buyer" ? (
                <button className="primary-green mt-6 max-w-xs" onClick={placeOrder}>Place Order</button>
              ) : (
                <Link to="/login?role=Buyer" className="mt-6 inline-flex rounded-lg bg-green-700 px-5 py-3 font-extrabold text-white">Login as Buyer to Order</Link>
              )}
              <section className="mt-8">
                <h2 className="text-xl font-extrabold">Reviews</h2>
                {(product.reviews || []).length === 0 && <p className="mt-3 text-sm font-bold text-gray-600">No reviews yet.</p>}
                {(product.reviews || []).map((review) => (
                  <article key={review.id} className="card mt-3 p-4">
                    <p className="font-extrabold">{review.reviewer_name || "Buyer"}</p>
                    <p className="text-sm text-gray-600">{review.review}</p>
                  </article>
                ))}
              </section>
            </section>
          </div>
        )}
      </main>
      <WebsiteFooter />
    </div>
  );
}
