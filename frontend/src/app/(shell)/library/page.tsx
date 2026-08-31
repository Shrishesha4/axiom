"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { LibraryGooeyBrowser } from "@/components/home/LibraryGooeyBrowser";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";

export default function LibraryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  if (!user) return null;

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your library</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">All sessions</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse every investigation, grouped by day.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions..."
              className="rounded-xl bg-[#f5f6f6] pl-9"
              aria-label="Search sessions"
            />
          </div>
        </div>

        <LibraryGooeyBrowser search={search} />
      </div>
    </ScrollContainer>
  );
}
