import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { getStoredUser, hasRole, normalizeRole } from "../utils/auth";

export default function RoleBasedRoute({ roles = [], children, forbidden = null }) {
  const user = getStoredUser();

  return (
    <ProtectedRoute allowedRoles={roles}>
      {roles.length === 0 || hasRole(user, roles) ? children : forbidden || (
        <div className="grid min-h-screen place-items-center bg-gray-50 p-6">
          <div className="card max-w-md p-6 text-center">
            <p className="text-xl font-extrabold text-red-700">Access denied.</p>
            <p className="mt-2 text-sm font-bold text-gray-600">Please login as {normalizeRole(roles[0])}.</p>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
