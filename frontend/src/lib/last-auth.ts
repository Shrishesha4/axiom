const LAST_AUTH_PROVIDER_KEY = "axiom_last_auth_provider";
const LAST_AUTH_EVENT = "axiom-last-auth-change";

export type AuthProviderName = "google" | "email";

export function setLastAuthProvider(provider: AuthProviderName) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_AUTH_PROVIDER_KEY, provider);
  window.dispatchEvent(new Event(LAST_AUTH_EVENT));
}

export function getLastAuthProvider(): AuthProviderName | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(LAST_AUTH_PROVIDER_KEY);
  return value === "google" || value === "email" ? value : null;
}

export function subscribeLastAuthProvider(onStoreChange: () => void): () => void {
  const handleChange = () => onStoreChange();
  window.addEventListener(LAST_AUTH_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(LAST_AUTH_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function isLastAuthProvider(provider: AuthProviderName) {
  return getLastAuthProvider() === provider;
}
