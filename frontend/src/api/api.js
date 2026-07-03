import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("fmd_token") ||
    localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authErrorText = JSON.stringify(error.response?.data || {}).toLowerCase();
    const isJwt422 =
      error.response?.status === 422 &&
      ["jwt", "token", "signature", "claim", "subject"].some((item) =>
        authErrorText.includes(item)
      );

    if (error.response?.status === 401 || isJwt422) {
      [
        "token",
        "access_token",
        "refresh_token",
        "role",
        "user",
        "fmd_token",
        "fmd_user",
        "fmd_access_token",
        "fmd_refresh_token",
      ].forEach((key) => localStorage.removeItem(key));

      Object.keys(localStorage)
        .filter((key) => key.startsWith("fmd_") || key.toLowerCase().includes("token"))
        .forEach((key) => localStorage.removeItem(key));
    }

    return Promise.reject(error);
  }
);

export const imageUrl = (path) => {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const cleanPath = String(path).replace(/^\/+/, "");

  if (cleanPath.startsWith("uploads/")) {
    return `${API_BASE_URL}/${cleanPath}`;
  }

  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

export default api;
