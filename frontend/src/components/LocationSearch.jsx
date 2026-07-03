import { useEffect, useMemo, useState } from "react";
import { FaMapMarkerAlt, FaSpinner } from "react-icons/fa";
import api from "../services/api";

export default function LocationSearch({ value = "", onSelect, onManualChange, label = "Search Village / Town", disabled = false }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const canSearch = useMemo(() => query.trim().length >= 3, [query]);

  useEffect(() => {
    if (disabled || !canSearch) {
      setSuggestions([]);
      setError("");
      return undefined;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/location/search", { params: { q: query.trim() } });
        setSuggestions(res.data || []);
        if ((res.data || []).length === 0) {
          setError("Location not found. Please enter manually.");
        }
      } catch (apiError) {
        setSuggestions([]);
        setError(apiError.response?.data?.message || "Location not found. Please enter manually.");
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(handle);
  }, [canSearch, disabled, query]);

  const choose = (location) => {
    setQuery(location.display_name);
    setSuggestions([]);
    setError("");
    onSelect?.(location);
  };

  const change = (event) => {
    const next = event.target.value;
    setQuery(next);
    onManualChange?.(next);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold">
        {label}
        <div className="relative mt-2">
          <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
          <input className="field pl-10 pr-10" value={query} onChange={change} placeholder="Type village or town" disabled={disabled} />
          {loading && <FaSpinner className="absolute right-3 top-3 animate-spin text-gray-400" />}
        </div>
      </label>
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((location) => (
            <button
              key={`${location.display_name}-${location.latitude}-${location.longitude}`}
              type="button"
              className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-green-50"
              onClick={() => choose(location)}
            >
              <span className="font-bold text-gray-900">{location.village}</span>
              <span className="block text-gray-600">{location.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}
