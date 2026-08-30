"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { SessionLibrarySection } from "@/components/home/SessionLibrary";
import { useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { createInvestigation } from "@/lib/api";
import { greeting } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";

const SUGGESTIONS = [
  {
    title: "Oncology landscape",
    query: "Analyze Phase II and III clinical trials for non-small cell lung cancer",
  },
  {
    title: "Mechanism momentum",
    query: "Which emerging mechanisms show the highest momentum in Parkinson's disease research?",
  },
  {
    title: "Safety comparison",
    query: "Compare FDA adverse event profiles for leading GLP-1 therapies",
  },
  {
    title: "White-space finder",
    query: "Which underexploited mechanisms show white-space opportunity in multiple sclerosis?",
  },
  {
    title: "Filing timelines",
    query: "Estimate probability of success and filing timelines for heart failure therapies",
  },
  {
    title: "Investment debate",
    query: "Analyze the competitive landscape for rheumatoid arthritis biologics",
  },
  {
    title: "Approval momentum",
    query: "Rank therapies by momentum for hepatitis C treatments",
  },
  {
    title: "Crowded vs. emerging",
    query: "Compare crowded and emerging mechanisms in obesity drug development",
  },
];

const VISIBLE_COUNT = 3;
const ROTATE_MS = 6000;

export default function CommandCenter() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshRecent } = useChromeRecent();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionOffset((prev) => (prev + VISIBLE_COUNT) % SUGGESTIONS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const visibleSuggestions = Array.from({ length: VISIBLE_COUNT }, (_, i) =>
    SUGGESTIONS[(suggestionOffset + i) % SUGGESTIONS.length]
  );

  const startInvestigation = useCallback(
    async (q: string) => {
      if (!q.trim() || loading) return;
      setLoading(true);
      setError("");
      try {
        const inv = await createInvestigation(q.trim());
        await refreshRecent();
        router.push(`/workspace/${inv.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start investigation");
        setLoading(false);
      }
    },
    [loading, router, refreshRecent]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (authLoading || !user) return null;

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-1 text-sm font-medium text-primary">{greeting(user.name)}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            What would you like to investigate?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask about any therapeutic area. Live data from ClinicalTrials.gov, openFDA, and PubMed.
          </p>
        </div>

        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startInvestigation(query)}
            placeholder="e.g. Phase III trials for Alzheimer's disease..."
            className="h-auto w-full rounded-2xl border-border/60 bg-[#f5f6f6] py-6 pl-12 pr-36 text-base shadow-none"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <Kbd>⌘K</Kbd>
            <Button
              onClick={() => startInvestigation(query)}
              disabled={loading || !query.trim()}
              size="sm"
            >
              {loading ? "Starting..." : "Investigate"}
            </Button>
          </div>
        </div>

        {error && <p className="-mt-6 mb-6 text-sm text-destructive">{error}</p>}

        <div className="mb-12">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Try an example
          </p>
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleSuggestions.map((s) => (
                <motion.div
                  key={s.title}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="cursor-pointer rounded-2xl border-border/50 bg-[#f5f6f6] shadow-none transition-all hover:border-primary/40 hover:bg-[#eef0f0]"
                    onClick={() => !loading && startInvestigation(s.query)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <CardDescription className="line-clamp-1">{s.query}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <SessionLibrarySection />
      </div>
    </ScrollContainer>
  );
}
