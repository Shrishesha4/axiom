"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listInvestigations, type Investigation } from "@/lib/api";

interface ChromeRecentContextValue {
  recent: Investigation[];
  recentLoaded: boolean;
  setRecent: (recent: Investigation[]) => void;
  refreshRecent: () => Promise<void>;
}

const ChromeRecentContext = createContext<ChromeRecentContextValue | null>(null);

export function ChromeRecentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [recent, setRecent] = useState<Investigation[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);

  const refreshRecent = useCallback(async () => {
    if (!user) {
      setRecent([]);
      setRecentLoaded(true);
      return;
    }
    try {
      setRecent(await listInvestigations());
    } catch {
      setRecent([]);
    } finally {
      setRecentLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user) {
        if (!cancelled) {
          setRecent([]);
          setRecentLoaded(true);
        }
        return;
      }

      try {
        const data = await listInvestigations();
        if (!cancelled) setRecent(data);
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setRecentLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo(
    () => ({ recent, recentLoaded, setRecent, refreshRecent }),
    [recent, recentLoaded, refreshRecent],
  );

  return (
    <ChromeRecentContext.Provider value={value}>{children}</ChromeRecentContext.Provider>
  );
}

export function useChromeRecent() {
  const ctx = useContext(ChromeRecentContext);
  if (!ctx) {
    throw new Error("useChromeRecent must be used within ChromeRecentProvider");
  }
  return ctx;
}
