"use client";

import type { ReactNode } from "react";
import { HomeAppChrome } from "@/components/home/HomeAppChrome";
import { ChromeRecentProvider, useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Spinner } from "@/components/ui/spinner";

function ShellChrome({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { recent } = useChromeRecent();

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#f5f6f6]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#f5f6f6]">
      <HomeAppChrome recent={recent}>{children}</HomeAppChrome>
    </div>
  );
}

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <ChromeRecentProvider>
      <ShellChrome>{children}</ShellChrome>
    </ChromeRecentProvider>
  );
}
