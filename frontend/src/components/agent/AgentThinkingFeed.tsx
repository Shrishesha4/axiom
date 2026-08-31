"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  step: string;
  status: string;
  message: string;
  timestamp?: string;
}

interface AgentThinkingFeedProps {
  steps: ThinkingStep[];
  isRunning: boolean;
  className?: string;
  compact?: boolean;
}

export function AgentThinkingFeed({
  steps,
  isRunning,
  className,
  compact = false,
}: AgentThinkingFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const runningSteps = steps.filter((step) => step.status !== "complete");
  const headline =
    runningSteps.length > 1
      ? `Running ${runningSteps.length} tasks in parallel…`
      : runningSteps[0]?.message ??
        (isRunning ? "Starting investigation…" : "Investigation complete");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [steps, headline]);

  return (
    <div className={cn("w-full max-w-lg", className)}>
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
        <div className="flex items-start gap-2.5">
          {isRunning ? (
            <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-primary">Agent</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={headline}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-1 text-sm font-medium leading-snug text-foreground"
              >
                {headline}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {steps.length > 0 ? (
          <div
            ref={scrollRef}
            className={cn(
              "mt-3 space-y-1 overflow-y-auto border-t border-primary/10 pt-3",
              compact ? "max-h-28" : "max-h-40",
            )}
          >
            <AnimatePresence initial={false}>
              {steps.map((step, index) => (
                <motion.div
                  key={`${step.step}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-start gap-2 text-xs"
                >
                  {step.status === "complete" ? (
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary/80" />
                  ) : (
                    <Spinner className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  )}
                  <span
                    className={cn(
                      "leading-snug",
                      step.status === "complete"
                        ? "text-muted-foreground"
                        : "text-foreground",
                    )}
                  >
                    {step.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : isRunning ? (
          <p className="mt-3 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
            Preparing tools and data sources…
          </p>
        ) : null}
      </div>
    </div>
  );
}
