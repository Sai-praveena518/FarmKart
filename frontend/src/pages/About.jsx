import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <WebsiteNavbar />
      <main className="website-container py-16">
        <h1 className="text-5xl font-extrabold text-gray-950">About FarmKart</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">FarmKart helps farmers sell directly to buyers with verified accounts, live product listings, transport sharing, AI farming tools, orders, and revenue analytics.</p>
      </main>
      <WebsiteFooter />
    </div>
  );
}
