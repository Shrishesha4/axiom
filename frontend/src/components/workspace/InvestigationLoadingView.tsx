"use client";

import { useEffect, useMemo, useState } from "react";
import useScreenSize from "@/hooks/use-screen-size";
import { ApodSpotlightCard } from "@/components/workspace/ApodSpotlightCard";
import {
  fetchApod,
  pickFact,
  pickTip,
  preloadImage,
  readCachedApod,
  type ApodCache,
} from "@/lib/loading-content";
import { AgentThinkingFeed, type ThinkingStep } from "@/components/agent/AgentThinkingFeed";
import { cn } from "@/lib/utils";

function truncate(text: string, max = 200) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

interface InvestigationLoadingViewProps {
  investigationId?: number;
  traceSteps?: ThinkingStep[];
  isRunning?: boolean;
  className?: string;
}

export function InvestigationLoadingView({
  investigationId,
  traceSteps = [],
  isRunning = true,
  className,
}: InvestigationLoadingViewProps) {
  const screenSize = useScreenSize();
  const [apod, setApod] = useState<ApodCache | null>(() => readCachedApod());
  const [imageReady, setImageReady] = useState(() => Boolean(readCachedApod()));

  const tip = useMemo(() => pickTip(investigationId), [investigationId]);
  const fact = useMemo(() => pickFact((investigationId ?? 0) + 1), [investigationId]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedApod();

    if (cached) {
      preloadImage(cached.mediaUrl)
        .then(() => {
          if (!cancelled) setImageReady(true);
        })
        .catch(() => {
          if (!cancelled) setImageReady(true);
        });
    }

    (async () => {
      try {
        const content = await fetchApod();
        if (cancelled) return;

        setApod(content);

        if (!cached || cached.mediaUrl !== content.mediaUrl) {
          await preloadImage(content.mediaUrl);
        }
        if (!cancelled) setImageReady(true);
      } catch {
        if (!cancelled) setImageReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const mediaWidth = screenSize.lessThan("sm") ? "72px" : "140px";

  return (
    <div
      className={cn(
        "pointer-events-auto flex min-h-[min(70vh,32rem)] flex-col items-center justify-center gap-5 px-4 py-10 text-center",
        className
      )}
    >
      <AgentThinkingFeed
        steps={traceSteps}
        isRunning={isRunning}
        className="mb-1"
      />

      <div className="max-w-md rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-primary">While you wait</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{tip}</p>
      </div>

      <div className="w-full max-w-lg space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          NASA astronomy picture of the day
        </p>

        {apod && imageReady ? (
          <>
            <ApodSpotlightCard apod={apod} mediaWidth={mediaWidth} revealed={imageReady} />

            <div className="space-y-1.5 px-1">
              <p className="text-sm font-medium text-foreground">{apod.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {truncate(apod.explanation)}
              </p>
              {apod.copyright && (
                <p className="text-[10px] text-muted-foreground/70">© {apod.copyright}</p>
              )}
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-sm space-y-3">
            <div className="flex items-center justify-center gap-3 text-lg font-light text-muted-foreground sm:text-2xl">
              <span>Today&apos;s</span>
              <div className="h-14 w-24 animate-pulse rounded-lg bg-muted sm:h-24 sm:w-36" />
              <span>view</span>
            </div>
            <div className="mx-auto h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-3 w-full max-w-xs animate-pulse rounded bg-muted/70" />
          </div>
        )}
      </div>

      <div className="max-w-md rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-[10px] uppercase tracking-widest text-primary/80">Did you know?</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{fact}</p>
      </div>
    </div>
  );
}
