export default function Loading({ label = "Loading..." }) {
  return (
    <div className="grid min-h-32 place-items-center text-sm font-bold text-gray-500">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />
      <span className="mt-2">{label}</span>
    </div>
  );
}
