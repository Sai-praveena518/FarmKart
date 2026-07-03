export default function DashboardCard({ title }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg cursor-pointer">
      <h3 className="font-semibold text-center">{title}</h3>
    </div>
  );
}