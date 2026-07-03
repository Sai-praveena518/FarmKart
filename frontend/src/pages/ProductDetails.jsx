import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaHeart, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import api, { imageUrl } from "../services/api";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import Loading from "../components/Loading";
import Toast from "../components/Toast";
import { getStoredUser, userLocation } from "../utils/auth";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const user = getStoredUser();
  const [deliveryAddress, setDeliveryAddress] = useState(userLocation(user));
  const [paymentMethod, setPaymentMethod] = useState("Pay Later");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([
      api.get(`/api/products/${id}`),
      api.get(`/reviews/${id}`).catch(() => ({ data: [] })),
    ]).then(([productRes, reviewsRes]) => {
      setProduct(productRes.data);
      setReviews(reviewsRes.data || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const placeOrder = async () => {
    try {
      await api.post("/api/orders", { product_id: product.id, quantity, payment_method: paymentMethod, delivery_address: deliveryAddress });
      setToast("Order placed successfully");
    } catch (apiError) {
      setToast(apiError.response?.data?.message || "Unable to place order.");
    }
  };

  const addToCart = async () => {
    await api.post("/api/cart", { product_id: product.id, quantity }).then(() => setToast("Added to cart.")).catch((apiError) => setToast(apiError.response?.data?.message || "Unable to add to cart."));
  };

  if (loading) {
    return <AppStage><PhoneFrame><ScreenHeader title="Product Details" tone="blue" back notification={false} /><Loading /></PhoneFrame></AppStage>;
  }

  if (!product) {
    return <AppStage><PhoneFrame><ScreenHeader title="Product Details" tone="blue" back notification={false} /><div className="screen-body"><p className="card p-4 text-center font-bold">Product not found.</p></div></PhoneFrame></AppStage>;
  }

  const average = reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length).toFixed(1) : "New";
  const farmerLocation = [product.village, product.district, product.state].filter(Boolean).join(", ") || product.location;
  const productImage = imageUrl(product.images?.[0] || product.image) || product.image;

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="Product Details" tone="blue" back notification={false} />
        <div className="screen-body text-left">
          <Toast message={toast} />
          {productImage ? (
            <div className="mt-3 h-44 w-full rounded-xl bg-gray-50 p-3">
              <img src={productImage} alt={product.crop_name} className="h-full w-full rounded-xl object-contain" />
            </div>
          ) : (
            <div className="mt-3 flex h-44 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-500">
              No Image
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <h1 className="text-xl font-extrabold">{product.crop_name}</h1>
            <p className="text-lg font-extrabold text-green-700">Rs {product.price} / {product.unit || "Kg"}</p>
          </div>
          <dl className="mt-3 space-y-4 text-sm">
            <div className="flex justify-between"><dt className="font-bold">Farmer</dt><dd>{product.farmer_name}</dd></div>
            <div className="flex justify-between"><dt className="font-bold">Quantity</dt><dd>{product.quantity} {product.unit || "Kg"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold">Location</dt><dd className="text-right">{farmerLocation} <FaMapMarkerAlt className="inline text-gray-700" /></dd></div>
          </dl>
          <label className="mt-5 block text-sm font-bold">Order Quantity<input className="field mt-2" type="number" min="1" max={product.quantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
          <label className="mt-4 block text-sm font-bold">Delivery Address<textarea className="textarea mt-2" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} /></label>
          <label className="mt-4 block text-sm font-bold">Payment Method<select className="field mt-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{["Pay Later", "Cash on Delivery"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="mt-5">
            <h2 className="font-extrabold">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{product.description || "No description added."}</p>
          </div>
          <section className="card mt-5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Reviews</h2>
              <span className="flex items-center gap-1 text-sm font-bold text-yellow-600"><FaStar /> {average}</span>
            </div>
            <div className="mt-3 space-y-3">
              {reviews.length === 0 && <p className="text-sm text-gray-600">No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} className="border-t border-gray-100 pt-3">
                  <p className="font-bold">{review.reviewer_name || review.buyer_name}</p>
                  <p className="text-sm text-gray-600">{review.review}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="mt-5 flex gap-3">
            <button className="grid h-11 w-12 place-items-center rounded-lg bg-red-50 text-red-500"><FaHeart /></button>
            <button className="rounded-lg bg-green-50 px-4 font-extrabold text-green-700" onClick={addToCart}>Cart</button>
            <button className="primary-blue" onClick={placeOrder}>Place Order</button>
          </div>
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
