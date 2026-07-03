import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container py-16">
        <h1 className="text-5xl font-extrabold text-gray-950">Contact FarmKart</h1>
        <div className="card mt-6 max-w-2xl p-6">
          <p className="font-bold text-gray-700">Name: Pothula Sai Praveena</p>
          <p className="mt-2 font-bold text-gray-700">Email: saipraveenareddypothula518@gmail.com</p>
          <p className="mt-2 font-bold text-gray-700">Location: Nandyal, Andhra Pradesh, India</p>
        </div>
      </main>
      <WebsiteFooter />
    </div>
  );
}
