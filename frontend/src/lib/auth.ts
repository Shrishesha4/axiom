const TOKEN_KEY = "axiom_token";
const USER_KEY = "axiom_user";
const AUTH_STORE_EVENT = "axiom-auth-change";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
  avatar_url?: string | null;
  token_limit: number;
  tokens_used: number;
  tokens_remaining: number;
  is_active: boolean;
  has_password?: boolean;
  auth_provider?: "google" | "password";
  created_at: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = getStoredUserSnapshot();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredUserSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}

export function subscribeAuthStorage(onStoreChange: () => void): () => void {
  const handleChange = () => onStoreChange();
  window.addEventListener(AUTH_STORE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(AUTH_STORE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function notifyAuthStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STORE_EVENT));
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthStorageChange();
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthStorageChange();
}

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export function handleSessionExpired() {
  clearAuth();
  sessionExpiredHandler?.();
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function greeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name.split(" ")[0]}`;
  if (hour < 17) return `Good afternoon, ${name.split(" ")[0]}`;
  return `Good evening, ${name.split(" ")[0]}`;
}

export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
