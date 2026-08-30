"use client";

import { cn } from "@/lib/utils";

/** Reliable scroll region for flex/grid layouts. Prefer this over ScrollArea in constrained panels. */
export function ScrollContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-0 overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
}
