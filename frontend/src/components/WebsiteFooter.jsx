import { FaFacebook, FaInstagram, FaLinkedin, FaSeedling, FaTwitter } from "react-icons/fa";

export default function WebsiteFooter() {
  return (
    <footer className="border-t border-green-100 bg-white">
      <div className="website-container grid gap-6 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold text-green-800"><FaSeedling /> FarmKart</div>
          <p className="mt-2 font-bold text-green-700">Your Farm. Your Market.</p>
          <p className="mt-3 max-w-md text-sm text-gray-600">Direct farmer-to-buyer commerce with orders, transport, AI farming tools, and verified users.</p>
        </div>
        <div>
          <p className="font-extrabold text-gray-950">Contact</p>
          <p className="mt-2 text-sm text-gray-600">Pothula Sai Praveena</p>
          <p className="mt-1 text-sm text-gray-600">saipraveenareddypothula518@gmail.com</p>
          <p className="mt-1 text-sm text-gray-600">Nandyal, Andhra Pradesh, India</p>
        </div>
        <div>
          <p className="font-extrabold text-gray-950">Legal</p>
          <div className="mt-2 grid gap-1 text-sm text-gray-600">
            <span>Privacy Policy</span>
            <span>Terms</span>
          </div>
          <div className="mt-4 flex gap-3 text-green-700"><FaFacebook /><FaTwitter /><FaInstagram /><FaLinkedin /></div>
        </div>
      </div>
    </footer>
  );
}
