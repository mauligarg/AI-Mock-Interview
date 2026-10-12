"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
  clearAuth,
  getStoredUser,
  getToken,
  setSessionId,
  setStoredUser,
  setToken,
  StoredUser,
} from "@/lib/auth";
import { checkHasPermission, checkHasRole, Role } from "@/lib/permissions";

// ── Types ─────────────────────────────────────────────────
interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  role: Role;
  login: (email: string, password: string, forceLogoutOther?: boolean) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (allowedRoles: Role | Role[]) => boolean;
  hasPermission: (requiredPermission: string) => boolean;
}

// ── Context ───────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount & fetch latest profile from backend
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);

      // Verify token & sync latest user details (role, permissions) from server
      axiosInstance
        .get("/api/auth/me")
        .then(({ data }) => {
          if (data.user) {
            setStoredUser(data.user);
            setUser(data.user);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // ── Login ───────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string, forceLogoutOther = false) => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.post("/api/auth/login", {
          email,
          password,
          forceLogoutOther,
        });

        if (data.token && data.user) {
          setToken(data.token);
          setStoredUser(data.user);
          if (data.sessionId) setSessionId(data.sessionId);
          setTokenState(data.token);
          setUser(data.user);

          // Route according to user role
          const role = data.user.role || "student";
          if (role === "admin") {
            router.push("/admin");
          } else if (role === "mentor") {
            router.push("/mentor");
          } else {
            router.push("/dashboard");
          }
        }
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // ── Register ────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.post("/api/auth/register", {
          name,
          email,
          password,
        });

        if (data.token && data.user) {
          setToken(data.token);
          setStoredUser(data.user);
          if (data.sessionId) setSessionId(data.sessionId);
          setTokenState(data.token);
          setUser(data.user);
          router.push("/dashboard");
        }
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // ── Logout ──────────────────────────────────────────────
  const logout = useCallback(() => {
    clearAuth();
    setTokenState(null);
    setUser(null);
    router.push("/");
  }, [router]);

  // ── Refresh user from API ───────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/api/auth/me");
      if (data.user) {
        setStoredUser(data.user);
        setUser(data.user);
      }
    } catch {
      logout();
    }
  }, [logout]);

  const role: Role = (user?.role as Role) || "student";

  const hasRoleCallback = useCallback(
    (allowedRoles: Role | Role[]) => checkHasRole(user?.role, allowedRoles),
    [user?.role]
  );

  const hasPermissionCallback = useCallback(
    (requiredPermission: string) =>
      checkHasPermission(user?.role as Role, user?.permissions || [], requiredPermission),
    [user?.role, user?.permissions]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: !!token && !!user,
      role,
      login,
      register,
      logout,
      refreshUser,
      hasRole: hasRoleCallback,
      hasPermission: hasPermissionCallback,
    }),
    [user, token, isLoading, role, login, register, logout, refreshUser, hasRoleCallback, hasPermissionCallback]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
