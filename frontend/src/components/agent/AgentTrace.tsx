"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { memo } from "react";

interface TraceStep {
  step: string;
  status: string;
  message: string;
  timestamp?: string;
}

interface AgentTraceProps {
  steps: TraceStep[];
  isRunning: boolean;
}

export const AgentTrace = memo(function AgentTrace({ steps, isRunning }: AgentTraceProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Agent</p>
      {steps.map((step) => (
        <div key={step.step} className="flex items-start gap-3 py-1.5">
          <div className="mt-0.5">
            {step.status === "complete" ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Spinner className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm",
                step.status === "complete" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step.message}
            </p>
            {step.timestamp && (
              <p className="text-xs text-muted-foreground/60 font-mono">{step.timestamp}</p>
            )}
          </div>
        </div>
      ))}
      {isRunning && steps.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="w-4 h-4 text-primary" />
          Running
        </div>
      )}
    </div>
  );
});
