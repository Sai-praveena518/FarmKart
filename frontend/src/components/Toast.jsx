export default function Toast({ message, type = "success" }) {
  if (!message) return null;
  const tone = type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
  return <div className={`rounded-lg p-3 text-center text-sm font-extrabold ${tone}`}>{message}</div>;
}
