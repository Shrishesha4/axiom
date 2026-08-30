"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Database, BookOpen, Shield, Loader2, ExternalLink } from "lucide-react";
import {
  getSourceData,
  type SourceKey,
  type SourceData,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollContainer } from "@/components/ScrollContainer";
import {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from "@/components/ui/popover";

const SOURCES: {
  key: SourceKey;
  name: string;
  icon: LucideIcon;
}[] = [
  { key: "clinical-trials", name: "ClinicalTrials.gov", icon: Database },
  { key: "pubmed", name: "PubMed", icon: BookOpen },
  { key: "openfda", name: "openFDA", icon: Shield },
];

interface SourcesPanelProps {
  investigationId: number;
  disabled?: boolean;
}

function SourceDataContent({ data }: { data: SourceData }) {
  if (data.key === "clinical-trials") {
    return (
      <div className="divide-y divide-border">
        {data.trials.map((trial, index) => (
          <motion.div
            key={trial.nct_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="px-3 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-snug line-clamp-2">
                {trial.title || trial.therapy || "Untitled trial"}
              </p>
              <a
                href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {trial.nct_id}
              </span>
              {trial.phase && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {trial.phase.replace("PHASE", "Phase ")}
                </Badge>
              )}
              {trial.status && (
                <span className="text-[10px] text-muted-foreground">{trial.status}</span>
              )}
            </div>
            {(trial.therapy || trial.sponsor) && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {[trial.therapy, trial.sponsor].filter(Boolean).join(" · ")}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  if (data.key === "pubmed") {
    return (
      <div className="divide-y divide-border">
        {data.publications.map((pub, index) => (
          <motion.div
            key={`${pub.pmid}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="px-3 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-snug line-clamp-2">{pub.title}</p>
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">PMID {pub.pmid}</span>
              {pub.pub_date && (
                <span className="text-[10px] text-muted-foreground">{pub.pub_date}</span>
              )}
              {pub.therapy && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {pub.therapy}
                </Badge>
              )}
            </div>
            {pub.abstract && (
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {pub.abstract}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.profiles.map((profile, index) => (
        <motion.div
          key={`${profile.therapy}-${index}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03, duration: 0.2 }}
          className="px-3 py-2.5 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{profile.therapy}</p>
            <span className="text-[10px] text-muted-foreground">
              {profile.total_reports} reports
            </span>
          </div>
          {profile.events.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {profile.events.slice(0, 5).map((event) => (
                <li
                  key={event.reaction}
                  className="flex items-center justify-between text-[10px] text-muted-foreground"
                >
                  <span className="truncate pr-2">{event.reaction}</span>
                  <span className="shrink-0 font-mono text-primary">{event.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground">No adverse events reported</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function SourceCard({
  source,
  investigationId,
  disabled,
}: {
  source: (typeof SOURCES)[number];
  investigationId: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SourceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSourceData(investigationId, source.key)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load source data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, investigationId, source.key]);

  const Icon = source.icon;
  const count = data?.count ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        nativeButton={false}
        render={
          <Card
            size="sm"
            className="cursor-pointer rounded-xl border-border/50 py-2 transition-all duration-200 hover:bg-white hover:ring-primary/30 data-popup-open:bg-white data-popup-open:ring-primary/40"
            onContextMenu={(e) => {
              e.preventDefault();
              if (!disabled) setOpen(true);
            }}
          />
        }
      >
        <CardContent className="flex items-center gap-2 py-0 px-3">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground flex-1">{source.name}</span>
          {count !== null && open && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-primary font-mono"
            >
              {count}
            </motion.span>
          )}
        </CardContent>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverPositioner side="right" align="start" sideOffset={8} collisionPadding={12}>
          <PopoverPopup className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 bg-muted/30">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">{source.name}</span>
              {count !== null && (
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                  {count} records
                </Badge>
              )}
            </div>

            <ScrollContainer className="max-h-72">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-10"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </motion.div>
                )}

                {!loading && error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-6 text-xs text-muted-foreground text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {!loading && !error && data && data.count === 0 && (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-6 text-xs text-muted-foreground text-center"
                  >
                    No data found for this source
                  </motion.p>
                )}

                {!loading && !error && data && data.count > 0 && (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SourceDataContent data={data} />
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollContainer>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

export function SourcesPanel({ investigationId, disabled }: SourcesPanelProps) {
  return (
    <>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Sources</p>
      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
        Click or right-click a source to view all live data
      </p>
      <div className="space-y-2">
        {SOURCES.map((source) => (
          <SourceCard
            key={source.key}
            source={source}
            investigationId={investigationId}
            disabled={disabled}
          />
        ))}
      </div>
    </>
  );
}
