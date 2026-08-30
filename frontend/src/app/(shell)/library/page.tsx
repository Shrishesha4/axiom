"use client";

import { LibraryGooeyBrowser } from "@/components/home/LibraryGooeyBrowser";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LibraryPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">All sessions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse every investigation, grouped by day.
          </p>
        </div>

        <LibraryGooeyBrowser />
      </div>
    </ScrollContainer>
  );
}
