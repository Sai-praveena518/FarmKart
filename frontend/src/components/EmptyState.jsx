export default function EmptyState({ message = "No data found." }) {
  return <div className="card p-6 text-center text-sm font-bold text-gray-600">{message}</div>;
}
