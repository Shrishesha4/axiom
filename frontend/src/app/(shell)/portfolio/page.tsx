"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getPortfolio, type PortfolioItem, type PortfolioRollup } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function PortfolioPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  if (!user) return null;

  const kpis = [
    { label: "Investigations", value: rollup?.investigation_count ?? 0 },
    { label: "Trials Tracked", value: rollup?.total_trials_tracked ?? 0 },
    { label: "Conditions Covered", value: rollup?.distinct_conditions ?? 0 },
    { label: "Avg Top Momentum", value: rollup?.avg_top_momentum_score ?? "—" },
  ];

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snapshot from each investigation&apos;s last completed run — not a live or
            time-series view.
          </p>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card
              key={kpi.label}
              className="rounded-2xl border-border/50 bg-[#f5f6f6] text-center shadow-none"
            >
              <CardContent className="pt-4">
                <p className="text-2xl font-light text-primary">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
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
                  className="h-full cursor-pointer rounded-2xl border-border/50 bg-[#f5f6f6] shadow-none transition-all hover:border-primary/40 hover:bg-[#eef0f0]"
                  onClick={() => router.push(`/workspace/${item.id}`)}
                >
                  <CardContent className="space-y-3 py-4">
                    <div>
                      <p className="line-clamp-1 text-sm font-medium">
                        {item.condition || item.query}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>

                    {(item.top_mechanism || item.top_therapy) && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.top_mechanism && (
                          <Badge variant="outline" className="border-primary/30 text-primary">
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
  );
}
