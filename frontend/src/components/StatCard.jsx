export default function StatCard({ icon, label, value, tone = "green", onClick }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  };
  const content = (
    <div className="card flex min-h-[92px] items-center gap-4 p-4 transition hover:-translate-y-0.5">
      <span className={`grid h-12 w-12 place-items-center rounded-lg text-xl ${tones[tone] || tones.green}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold text-gray-600">{label}</span>
        <span className="block text-2xl font-extrabold text-gray-950">{value}</span>
      </span>
    </div>
  );
  if (!onClick) return content;
  return <button type="button" className="w-full cursor-pointer text-left active:scale-[0.99]" onClick={onClick}>{content}</button>;
}
