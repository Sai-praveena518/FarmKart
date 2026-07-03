import { Navigate } from "react-router-dom";
import { getStoredUser, getToken, roleKey } from "../utils/auth";

export default function ProtectedRoute({ children, roles = [] }) {
  const user = getStoredUser();
  const role = localStorage.getItem("role")?.toLowerCase() || roleKey(user?.role);

  if (!getToken() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length && !roles.map(roleKey).includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
