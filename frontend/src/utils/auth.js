export const normalizeRole = (role) => {
  const value = String(role || "").trim();
  const aliases = {
    superadmin: "SuperAdmin",
    "super admin": "SuperAdmin",
    super_admin: "SuperAdmin",
    admin: "Admin",
    farmer: "Farmer",
    buyer: "Buyer",
  };
  return aliases[value.toLowerCase()] || value;
};

export const roleKey = (role) => normalizeRole(role).toLowerCase();

export const hasRole = (user, roles = []) => roles.map(roleKey).includes(roleKey(user?.role));

export const getStoredUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || localStorage.getItem("fmd_user") || "null");
    const storedRole = localStorage.getItem("role");
    return user ? { ...user, role: normalizeRole(user.role || storedRole) } : null;
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem("token") || localStorage.getItem("fmd_token");

export const setSession = ({ token, user }) => {
  const normalizedUser = { ...user, role: normalizeRole(user?.role) };
  localStorage.setItem("token", token);
  localStorage.setItem("role", normalizedUser.role);
  localStorage.setItem("user", JSON.stringify(normalizedUser));
  localStorage.setItem("fmd_token", token);
  localStorage.setItem("fmd_user", JSON.stringify(normalizedUser));
};

export const clearSession = () => {
  [
    "token",
    "access_token",
    "refresh_token",
    "role",
    "user",
    "fmd_token",
    "fmd_user",
    "fmd_access_token",
    "fmd_refresh_token",
  ].forEach((key) => localStorage.removeItem(key));

  Object.keys(localStorage)
    .filter((key) => key.startsWith("fmd_") || key.toLowerCase().includes("token"))
    .forEach((key) => localStorage.removeItem(key));
};

export const userLocation = (user) => {
  if (!user) return "";
  return [user.village, user.district, user.state].filter(Boolean).join(", ") || user.address || "";
};
