import { useEffect, useState } from "react";
import { FaEdit, FaEye, FaTrash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api, { imageUrl } from "../services/api";
import {
  AppStage,
  BottomNav,
  PhoneFrame,
  ScreenHeader,
} from "../components/MobileShell";
import Loading from "../components/Loading";
import { getStoredUser, getToken } from "../utils/auth";

export default function MyProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    const token = getToken();
    const user = getStoredUser();
    const role = (user?.role || "").toLowerCase();

    if (!token) {
      navigate("/login?role=Farmer");
      return;
    }

    if (role !== "farmer") {
      setError("Access denied. Please login as Farmer.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/api/products/my");

      const data = res.data?.products || res.data || [];

      setProducts(Array.isArray(data) ? data : []);
      setError("");
    } catch (apiError) {
      console.log("My Products Error:", apiError);

      const status = apiError.response?.status;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        "Unable to load your products.";

      if (status === 401) {
        localStorage.clear();
        navigate("/login?role=Farmer");
        return;
      }

      if (status === 403) {
        setError("Access denied. Please login as Farmer.");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const remove = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirmDelete) return;

    const oldProducts = [...products];

    setProducts((items) => items.filter((item) => item.id !== id));

    try {
      await api.delete(`/api/products/${id}`);
      showToast("Product deleted successfully.");
    } catch (apiError) {
      console.log("Delete Product Error:", apiError);
      setProducts(oldProducts);
      showToast(
        apiError.response?.data?.message ||
          apiError.response?.data?.error ||
          "Unable to delete product.",
        "error"
      );
    }
  };

  const save = async () => {
    if (!editing) return;

    try {
      const res = await api.put(`/api/products/${editing.id}`, {
        crop_name: editing.crop_name,
        category: editing.category,
        quantity: editing.quantity,
        price: editing.price,
        unit: editing.unit,
        location: editing.location,
        status: editing.status,
        description: editing.description,
      });

      const updatedProduct = res.data?.product || res.data;

      setProducts((items) =>
        items.map((item) =>
          item.id === editing.id ? { ...item, ...updatedProduct } : item
        )
      );

      showToast("Product updated successfully.");
      setEditing(null);
    } catch (apiError) {
      console.log("Update Product Error:", apiError);
      showToast(
        apiError.response?.data?.message ||
          apiError.response?.data?.error ||
          "Unable to update product.",
        "error"
      );
    }
  };

  const getProductImage = (product) => {
    const firstImage =
      product.images?.[0] ||
      product.image ||
      product.image_url ||
      product.photo ||
      "";

    return imageUrl(firstImage) || firstImage;
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="My Products" tone="green" back />

        <div className="screen-body pb-24">
          <div className="space-y-3">
            {loading && <Loading label="Loading your products..." />}

            {toast && (
              <p
                className={`rounded-lg p-3 text-center text-sm font-extrabold ${
                  toast.type === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {toast.message}
              </p>
            )}

            {!loading && error && (
              <p className="card p-4 text-center text-sm font-bold text-red-600">
                {error}
              </p>
            )}

            {!loading && !error && products.length === 0 && (
              <p className="card p-4 text-center text-sm font-bold text-gray-600">
                No products added yet. Add your first product.
              </p>
            )}

            {products.map((product) => (
              <article key={product.id} className="card overflow-hidden text-left">
                {getProductImage(product) ? (
                  <div className="h-44 w-full bg-gray-50 p-3">
                    <img
                      src={getProductImage(product)}
                      alt={product.crop_name}
                      className="h-full w-full rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-500">
                    No Image
                  </div>
                )}

                <div className="p-4">
                  {editing?.id === product.id ? (
                    <div className="space-y-2">
                      <input
                        className="field"
                        value={editing.crop_name || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            crop_name: e.target.value,
                          })
                        }
                        placeholder="Crop Name"
                      />

                      <input
                        className="field"
                        value={editing.category || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            category: e.target.value,
                          })
                        }
                        placeholder="Category"
                      />

                      <input
                        className="field"
                        type="number"
                        min="0"
                        value={editing.quantity || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            quantity: e.target.value,
                          })
                        }
                        placeholder="Quantity"
                      />

                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editing.price || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            price: e.target.value,
                          })
                        }
                        placeholder="Price"
                      />

                      <input
                        className="field"
                        value={editing.unit || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            unit: e.target.value,
                          })
                        }
                        placeholder="Unit"
                      />

                      <input
                        className="field"
                        value={editing.location || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            location: e.target.value,
                          })
                        }
                        placeholder="Location"
                      />

                      <select
                        className="field"
                        value={editing.status || "Available"}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            status: e.target.value,
                          })
                        }
                      >
                        {["Available", "Pending", "Sold Out", "Hidden"].map(
                          (item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          )
                        )}
                      </select>

                      <textarea
                        className="textarea"
                        value={editing.description || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            description: e.target.value,
                          })
                        }
                        placeholder="Description"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="primary-blue"
                          onClick={save}
                        >
                          Save Changes
                        </button>

                        <button
                          type="button"
                          className="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-700"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-extrabold">
                            {product.crop_name}
                          </h2>

                          <p className="text-xs font-bold text-gray-500">
                            ID #{product.id} - Category:{" "}
                            {product.category || "Uncategorized"}
                          </p>

                          <p className="text-sm text-gray-600">
                            <span className="font-bold">Location:</span>{" "}
                            {product.location || "No location"}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {product.status || "Available"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <p>
                          <span className="font-bold">Stock:</span>{" "}
                          {product.quantity} {product.unit || "Kg"}
                        </p>

                        <p>
                          <span className="font-bold">Price:</span> Rs.{" "}
                          {product.price} / {product.unit || "Kg"}
                        </p>

                        <p>
                          <span className="font-bold">Unit:</span>{" "}
                          {product.unit || "Kg"}
                        </p>

                        <p>
                          <span className="font-bold">Status:</span>{" "}
                          {product.status || "Available"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Link
                          to={`/products/${product.id}`}
                          className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-center text-sm font-bold text-blue-700"
                        >
                          <FaEye />
                          View
                        </Link>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-lg bg-yellow-100 py-2 text-sm font-bold text-yellow-700"
                          onClick={() => setEditing({ ...product })}
                        >
                          <FaEdit />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-lg bg-red-100 py-2 text-sm font-bold text-red-700"
                          onClick={() => remove(product.id)}
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <BottomNav />
      </PhoneFrame>
    </AppStage>
  );
}
