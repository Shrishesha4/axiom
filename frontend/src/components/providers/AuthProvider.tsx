"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AuthUser,
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
  setSessionExpiredHandler,
} from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/login", "/signup"];

function subscribe() {
  return () => {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Must start `null` on every render, matching the server (which has no
  // localStorage) — seeding this from getStoredUser() in a lazy initializer
  // would make the client's first hydration pass diverge from the
  // server-rendered HTML wherever `user` gates output (e.g. AppHeader),
  // triggering a hydration mismatch (React error #418).
  const storedUser = useSyncExternalStore(subscribe, getStoredUser, () => null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const activeUser = user ?? storedUser;

  const fetchCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearAuth();
      return null;
    }
    const data = (await res.json()) as AuthUser;
    localStorage.setItem("axiom_user", JSON.stringify(data));
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await fetchCurrentUser());
  }, [fetchCurrentUser]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      router.replace("/login");
    });
    return () => setSessionExpiredHandler(null);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser().then((data) => {
      if (!cancelled) {
        setUser(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!activeUser && !isPublic) {
      router.replace("/login");
    } else if (activeUser && isPublic) {
      router.replace("/");
    }
  }, [loading, activeUser, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    setAuth(data.access_token, data.user);
    setUser(data.user);
    router.push("/");
  }, [router]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Signup failed");
    }
    const data = await res.json();
    setAuth(data.access_token, data.user);
    setUser(data.user);
    router.push("/");
  }, [router]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user: activeUser, loading, login, signup, logout, refreshUser }),
    [activeUser, loading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
