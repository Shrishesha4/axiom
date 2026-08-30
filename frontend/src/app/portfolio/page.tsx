"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { RetroDitherLayout } from "@/components/canvasui/RetroDitherLayout";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getPortfolio, type PortfolioItem, type PortfolioRollup } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function PortfolioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [rollup, setRollup] = useState<PortfolioRollup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPortfolio()
      .then((data) => {
        setItems(data.investigations);
        setRollup(data.rollup);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <RetroDitherLayout backgroundClassName="bg-muted/20">
        <div className="flex h-full items-center justify-center pointer-events-none">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </RetroDitherLayout>
    );
  }

  const kpis = [
    { label: "Investigations", value: rollup?.investigation_count ?? 0 },
    { label: "Trials Tracked", value: rollup?.total_trials_tracked ?? 0 },
    { label: "Conditions Covered", value: rollup?.distinct_conditions ?? 0 },
    { label: "Avg Top Momentum", value: rollup?.avg_top_momentum_score ?? "—" },
  ];

  return (
    <RetroDitherLayout backgroundClassName="bg-muted/20">
      <div className="flex h-full min-h-0 flex-col overflow-hidden pointer-events-none">
        <div className="flex h-full min-h-0 flex-col overflow-hidden pointer-events-auto bg-background">
        <AppHeader subtitle="Portfolio" className="shrink-0 bg-card" />

        <ScrollContainer className="min-h-0 flex-1 bg-background">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolio</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Snapshot from each investigation&apos;s last completed run — not a live or
              time-series view.
            </p>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 mb-10">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="text-center">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-light text-primary">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="w-6 h-6 text-primary" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No completed investigations yet.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className="cursor-pointer transition-colors hover:border-primary/30 bg-card h-full"
                      onClick={() => router.push(`/workspace/${item.id}`)}
                    >
                      <CardContent className="py-4 space-y-3">
                        <div>
                          <p className="text-sm font-medium line-clamp-1">
                            {item.condition || item.query}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(item.created_at)}
                          </p>
                        </div>

                        {(item.top_mechanism || item.top_therapy) && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.top_mechanism && (
                              <Badge variant="outline" className="text-primary border-primary/30">
                                {item.top_mechanism}
                              </Badge>
                            )}
                            {item.top_therapy && (
                              <Badge variant="outline">{item.top_therapy}</Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{item.total_trials} trials</span>
                          <span>{item.total_companies} companies</span>
                          <span>{item.phase_iii_count} Phase III</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollContainer>
        </div>
      </div>
    </RetroDitherLayout>
  );
}
