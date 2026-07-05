import { useMemo, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { assets, crops } from "../data/marketData";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";
import { getStoredUser, getToken, userLocation } from "../utils/auth";

export default function AddProduct() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const token = getToken();

  const [form, setForm] = useState({
    crop_name: "Tomato",
    category: "Vegetables",
    quantity: "",
    price: "",
    unit: "Kg",
    location: userLocation(user) || "",
    status: "Available",
    description: "",
  });

  const [images, setImages] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showCropSuggestions, setShowCropSuggestions] = useState(false);

  const preview = useMemo(() => {
    if (images[0]) {
      return URL.createObjectURL(images[0]);
    }
    return assets.tomato;
  }, [images]);

  const cropSuggestions = useMemo(() => {
    const search = form.crop_name.trim().toLowerCase();
    if (!search) {
      return crops;
    }
    return crops.filter((crop) => crop.toLowerCase().includes(search));
  }, [form.crop_name]);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaved(false);
    setError("");

    const role = (user?.role || "").toLowerCase();

    if (!token) {
      setError("Please login first.");
      navigate("/login?role=Farmer");
      return;
    }

    if (role !== "farmer") {
      setError("Access denied. Please login as Farmer.");
      return;
    }

    const cropName = form.crop_name.trim();

    if (!cropName) {
      setError("Please enter crop name.");
      return;
    }

    if (Number(form.quantity) <= 0) {
      setError("Please enter valid stock quantity.");
      return;
    }

    if (Number(form.price) <= 0) {
      setError("Please enter valid price.");
      return;
    }

    if (!form.location.trim()) {
      setError("Please enter product location.");
      return;
    }

    const payload = new FormData();

    payload.append("crop_name", cropName);
    payload.append("category", form.category);
    payload.append("quantity", form.quantity);
    payload.append("price", form.price);
    payload.append("unit", form.unit);
    payload.append("location", form.location);
    payload.append("status", form.status);
    payload.append("description", form.description);

    images.forEach((image) => {
      payload.append("images", image);
    });

    try {
      const res = await api.post("/api/products", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Product saved:", res.data);

      setSaved(true);

      setForm({
        crop_name: "Tomato",
        category: "Vegetables",
        quantity: "",
        price: "",
        unit: "Kg",
        location: userLocation(user) || "",
        status: "Available",
        description: "",
      });

      setImages([]);

      setTimeout(() => {
        navigate("/farmer/products");
      }, 700);
    } catch (apiError) {
      console.log("Add Product Error:", apiError);

      const status = apiError.response?.status;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        "Product save failed.";

      if (status === 401) {
        setError("Session expired. Please login again.");
        localStorage.clear();
        navigate("/login?role=Farmer");
        return;
      }

      if (status === 403) {
        setError("Access denied. Please login as Farmer.");
        return;
      }

      setError(message);
    }
  };

  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader
          title="Add Product"
          tone="green"
          back
          notification={false}
        />

        <form onSubmit={submit} className="screen-body space-y-4 text-left">
          {saved && (
            <div className="rounded-lg bg-green-100 p-3 text-center text-sm font-extrabold text-green-700">
              Product saved successfully
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-center text-sm font-extrabold text-red-700">
              {error}
            </div>
          )}

          <label className="block text-sm font-bold">
            Crop Name
            <div className="relative mt-2">
              <input
                className="field"
                value={form.crop_name}
                onChange={(event) => {
                  update("crop_name", event.target.value);
                  setShowCropSuggestions(true);
                }}
                onFocus={() => setShowCropSuggestions(true)}
                onBlur={() => setShowCropSuggestions(false)}
                placeholder="Select or type crop name"
                autoComplete="off"
              />
              {showCropSuggestions && cropSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {cropSuggestions.map((crop) => (
                    <button
                      key={crop}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm font-bold text-gray-700 hover:bg-green-50"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        update("crop_name", crop);
                        setShowCropSuggestions(false);
                      }}
                    >
                      {crop}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label className="block text-sm font-bold">
            Category
            <select
              className="field mt-2"
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              {["Vegetables", "Fruits", "Grains", "Pulses", "Spices", "Others"].map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Stock
            <input
              className="field mt-2"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
              placeholder="Enter stock quantity"
            />
          </label>

          <div className="grid grid-cols-[1fr_90px] gap-3">
            <label className="block text-sm font-bold">
              Price
              <input
                className="field mt-2"
                type="number"
                min="1"
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder="₹"
              />
            </label>

            <label className="block text-sm font-bold">
              Unit
              <select
                className="field mt-2"
                value={form.unit}
                onChange={(event) => update("unit", event.target.value)}
              >
                {["Kg", "Quintal", "Ton", "Piece", "Bag"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold">
            Location
            <div className="relative mt-2">
              <input
                className="field pr-10"
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="Village / District"
              />
              <FaMapMarkerAlt className="absolute right-3 top-3 text-gray-700" />
            </div>
          </label>

          <label className="block text-sm font-bold">
            Availability
            <select
              className="field mt-2"
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
            >
              {["Available", "Pending", "Sold Out"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Upload Photos
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setImages(Array.from(event.target.files || []))
              }
            />
          </label>

          <label className="block text-sm font-bold">
            Description
            <textarea
              className="textarea mt-2"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Enter product description"
            />
          </label>

          <img
            src={preview}
            alt="Product preview"
            className="h-[105px] w-[205px] rounded-lg object-cover"
          />

          <button className="primary-green" type="submit">
            Submit
          </button>
        </form>
      </PhoneFrame>
    </AppStage>
  );
}
