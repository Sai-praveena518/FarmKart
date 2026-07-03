import {
  FaBell,
  FaChartLine,
  FaCloudSun,
  FaComments,
  FaFileInvoice,
  FaHandHoldingUsd,
  FaMicrophone,
  FaMoneyCheckAlt,
  FaRegStar,
  FaSeedling,
  FaShieldAlt,
  FaShoppingBag,
  FaUser,
  FaWallet,
} from "react-icons/fa";
import { FaFlaskVial } from "react-icons/fa6";
import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";

const modules = [
  { title: "Orders", sub: "Track & Manage", icon: <FaShoppingBag /> },
  { title: "Profit Report", sub: "Charts & Analytics", icon: <FaChartLine /> },
  { title: "Weather", sub: "Real-time Info", icon: <FaCloudSun /> },
  { title: "AI Yield", sub: "Prediction", icon: <FaSeedling /> },
  { title: "AI Crop", sub: "Recommendation", icon: <FaSeedling /> },
  { title: "AI Fertilizer", sub: "Recommendation", icon: <FaFlaskVial /> },
  { title: "Chat", sub: "Farmer-Buyer", icon: <FaComments /> },
  { title: "Voice Assistant", sub: "Telugu / English", icon: <FaMicrophone /> },
  { title: "Notifications", sub: "Alerts & Updates", icon: <FaBell /> },
  { title: "Government", sub: "Schemes", icon: <FaHandHoldingUsd /> },
  { title: "Crop Insurance", sub: "Protection", icon: <FaShieldAlt /> },
  { title: "Loan", sub: "Information", icon: <FaMoneyCheckAlt /> },
  { title: "Payments", sub: "UPI, Cards", icon: <FaWallet /> },
  { title: "Invoice", sub: "Generation", icon: <FaFileInvoice /> },
  { title: "Reviews", sub: "Ratings", icon: <FaRegStar /> },
  { title: "Profile", sub: "Management", icon: <FaUser /> },
];

export default function FeatureHub() {
  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="More Features Included" tone="green" back notification={false} />
        <div className="screen-body text-left">
          <div className="grid grid-cols-2 gap-3">
            {modules.map((module) => (
              <article key={module.title} className="card grid min-h-[112px] place-items-center p-3 text-center">
                <span className="text-2xl text-green-700">{module.icon}</span>
                <div>
                  <p className="text-sm font-extrabold text-gray-950">{module.title}</p>
                  <p className="text-[11px] font-semibold text-gray-600">{module.sub}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
