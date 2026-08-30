"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Clock, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { RetroDitherLayout } from "@/components/canvasui/RetroDitherLayout";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { createInvestigation, listInvestigations, type Investigation } from "@/lib/api";
import { greeting } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

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
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Investigation[]>([]);
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  useEffect(() => {
    if (!user) return;
    listInvestigations().then(setRecent).catch(() => {});
  }, [user]);

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
        router.push(`/workspace/${inv.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start investigation");
        setLoading(false);
      }
    },
    [loading, router]
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

  if (authLoading || !user) {
    return (
      <RetroDitherLayout backgroundClassName="bg-muted/20">
        <div className="flex h-full items-center justify-center pointer-events-none">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </RetroDitherLayout>
    );
  }

  const mainContent = (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-sm text-primary font-medium mb-1">{greeting(user.name)}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          What would you like to investigate?
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ask about any therapeutic area. Live data from ClinicalTrials.gov, openFDA, and PubMed.
        </p>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
        <Input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startInvestigation(query)}
          placeholder="e.g. Phase III trials for Alzheimer's disease..."
          className="w-full pl-12 pr-36 py-6 h-auto text-base bg-card shadow-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
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

      {error && <p className="text-sm text-destructive mb-6 -mt-6">{error}</p>}

      <div className="mb-12">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
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
                  className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm bg-card"
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
    </div>
  );

  return (
    <RetroDitherLayout backgroundClassName="bg-muted/20">
      <div className="flex h-full min-h-0 flex-col overflow-hidden pointer-events-none">
      <div className="flex h-full min-h-0 flex-col overflow-hidden pointer-events-auto bg-background">
      <AppHeader className="shrink-0 bg-card" />

      {recent.length > 0 ? (
        <ResizablePanelGroup
          persistId="axiom-home"
          panelIds={["recent", "main"]}
          orientation="horizontal"
          className="min-h-0 flex-1"
        >
          <ResizablePanel
            id="recent"
            defaultSize="28"
            minSize="18"
            maxSize="42"
            collapsible
            collapsedSize="0"
          >
            <ScrollContainer className="h-full border-r border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Recent investigations
              </p>
              <div className="space-y-2">
                {recent.map((inv) => (
                  <Card
                    key={inv.id}
                    className="cursor-pointer transition-colors hover:border-primary/30 bg-card"
                    onClick={() => router.push(`/workspace/${inv.id}`)}
                  >
                    <CardContent className="py-3">
                      <p className="text-sm line-clamp-2">{inv.query}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(inv.created_at)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollContainer>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="main" defaultSize="72" minSize="40">
            <ScrollContainer className="h-full bg-background">{mainContent}</ScrollContainer>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ScrollContainer className="min-h-0 flex-1 bg-background">{mainContent}</ScrollContainer>
      )}
      </div>
      </div>
    </RetroDitherLayout>
  );
}
