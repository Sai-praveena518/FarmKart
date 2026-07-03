import { Link } from "react-router-dom";
import {
  FaHome,
  FaBoxOpen,
  FaShoppingCart,
  FaUser
} from "react-icons/fa";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t flex justify-around py-3 z-50">

      <Link
        to="/farmer/dashboard"
        className="flex flex-col items-center text-green-700"
      >
        <FaHome size={22} />
        <span className="text-xs">Home</span>
      </Link>

      <Link
        to="/farmer/products"
        className="flex flex-col items-center text-blue-700"
      >
        <FaBoxOpen size={22} />
        <span className="text-xs">Products</span>
      </Link>

      <Link
        to="/farmer/orders"
        className="flex flex-col items-center text-yellow-600"
      >
        <FaShoppingCart size={22} />
        <span className="text-xs">Orders</span>
      </Link>

      <Link
        to="/farmer/profile"
        className="flex flex-col items-center text-purple-700"
      >
        <FaUser size={22} />
        <span className="text-xs">Profile</span>
      </Link>

    </div>
  );
}
