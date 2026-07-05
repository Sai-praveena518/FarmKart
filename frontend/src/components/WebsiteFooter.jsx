import { FaFacebook, FaInstagram, FaLinkedin, FaSeedling, FaYoutube } from "react-icons/fa";
import useCms from "../hooks/useCms";

export default function WebsiteFooter() {
  const { settings } = useCms();
  const appName = settings.application_name || "FarmKart";
  const socials = [
    [settings.facebook_link, FaFacebook],
    [settings.instagram_link, FaInstagram],
    [settings.youtube_link, FaYoutube],
    [settings.linkedin_link, FaLinkedin],
  ].filter(([href]) => href);

  return (
    <footer className="border-t border-green-100 bg-white">
      <div className="website-container grid gap-6 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold text-green-800"><FaSeedling /> {appName}</div>
          <p className="mt-2 font-bold text-green-700">{settings.home_page_caption || "Your Farm. Your Market."}</p>
          <p className="mt-3 max-w-md text-sm text-gray-600">{settings.footer_text}</p>
          <p className="mt-3 text-xs font-bold text-gray-500">{settings.copyright_text}</p>
        </div>
        <div>
          <p className="font-extrabold text-gray-950">Contact</p>
          <p className="mt-2 text-sm text-gray-600">{settings.contact_email || "-"}</p>
          <p className="mt-1 text-sm text-gray-600">{settings.contact_phone || settings.whatsapp_number || "-"}</p>
          <p className="mt-1 text-sm text-gray-600">{settings.office_address || "-"}</p>
          {settings.google_maps_location && <a className="mt-2 inline-block text-sm font-bold text-green-700" href={settings.google_maps_location} target="_blank" rel="noreferrer">Google Maps</a>}
        </div>
        <div>
          <p className="font-extrabold text-gray-950">Legal</p>
          <div className="mt-2 grid gap-1 text-sm text-gray-600">
            <span>Privacy Policy</span>
            <span>Terms</span>
          </div>
          <div className="mt-4 flex gap-3 text-green-700">
            {socials.map(([href, Icon]) => <a key={href} href={href} target="_blank" rel="noreferrer"><Icon /></a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
