import { useEffect, useState } from "react";
import { FaCloudSun, FaCompressArrowsAlt, FaEye, FaSun, FaTint, FaWind } from "react-icons/fa";
import api from "../services/api";
import Loading from "./Loading";
import { getStoredUser, userLocation } from "../utils/auth";

const weatherIconUrl = (icon) => icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";
const formatValue = (value, suffix = "") => value === null || value === undefined || value === "" ? "--" : `${value}${suffix}`;
const kmVisibility = (value) => value === null || value === undefined ? "--" : `${(Number(value) / 1000).toFixed(1)} km`;

export default function WeatherCard({ refreshKey = "" }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    const user = getStoredUser();
    const params = {};
    if (user?.latitude && user?.longitude) {
      params.lat = user.latitude;
      params.lon = user.longitude;
    } else {
      const city = userLocation(user);
      if (city) params.city = city;
    }

    api.get("/api/weather/current", { params })
      .then((res) => {
        setWeather(res.data);
        setMessage("");
      })
      .catch((error) => {
        setWeather(null);
        setMessage(error.response?.status === 403 ? "Access denied for this account." : error.response?.data?.message || "Weather unavailable.");
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <section className="card mt-4 p-4 text-left">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold">Live Weather</p>
        <FaCloudSun className="text-green-600" />
      </div>
      {loading && <div className="mt-3"><Loading label="Loading weather..." /></div>}
      {!loading && message && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm font-bold text-yellow-800">{message}</p>}
      {!loading && weather && (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-50 p-3">
            <div>
              <p className="text-sm font-bold text-gray-700">{weather.location || "Your location"}</p>
              <p className="mt-1 text-3xl font-extrabold text-green-700">{formatValue(weather.temperature, " C")}</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">{weather.weather_condition || weather.condition}</p>
            </div>
            {weather.weather_icon ? <img src={weatherIconUrl(weather.weather_icon)} alt={weather.weather_condition || "Weather"} className="h-16 w-16" /> : <FaCloudSun className="text-4xl text-green-600" />}
          </div>
          <div className="mt-3 grid gap-2 text-xs font-bold text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
            <span className="rounded-lg bg-orange-50 p-2"><FaSun className="mb-1 text-orange-600" /> Feels {formatValue(weather.feels_like, " C")}</span>
            <span className="rounded-lg bg-blue-50 p-2"><FaTint className="mb-1 text-blue-600" /> Humidity {formatValue(weather.humidity, "%")}</span>
            <span className="rounded-lg bg-gray-50 p-2"><FaWind className="mb-1 text-gray-600" /> Wind {formatValue(weather.wind_speed, " m/s")}</span>
            <span className="rounded-lg bg-purple-50 p-2"><FaCompressArrowsAlt className="mb-1 text-purple-600" /> Pressure {formatValue(weather.pressure, " hPa")}</span>
            <span className="rounded-lg bg-sky-50 p-2"><FaEye className="mb-1 text-sky-600" /> Visibility {kmVisibility(weather.visibility)}</span>
            <span className="rounded-lg bg-green-50 p-2">Rain {weather.rain_probability ?? "N/A"}%</span>
          </div>
          <div className="mt-3 grid gap-2 text-xs font-bold text-gray-700 sm:grid-cols-2">
            <span className="rounded-lg bg-yellow-50 p-2">Sunrise {weather.sunrise || "--"}</span>
            <span className="rounded-lg bg-amber-50 p-2">Sunset {weather.sunset || "--"}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-green-700">{weather.suggestion}</p>
        </>
      )}
    </section>
  );
}
