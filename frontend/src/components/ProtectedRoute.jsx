import { Navigate } from "react-router-dom";
import { getStoredUser, getToken, roleKey } from "../utils/auth";

export default function ProtectedRoute({ children, roles = [], allowedRoles = [] }) {
  const user = getStoredUser();
  const allowedRolesList = allowedRoles.length ? allowedRoles : roles;
  const userRole = (user?.role || localStorage.getItem("role") || "").toLowerCase();
  const allowed = allowedRolesList.map((role) => role.toLowerCase()).includes(userRole);

  if (!getToken() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRolesList.length && !allowed && !allowedRolesList.map(roleKey).includes(roleKey(user?.role))) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
