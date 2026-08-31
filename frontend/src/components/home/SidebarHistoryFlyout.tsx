"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { ScrollContainer } from "@/components/ScrollContainer";
import {
  Popover,
  PopoverPortal,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type Investigation } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";

interface SidebarHistoryFlyoutProps {
  recent: Investigation[];
  expanded: boolean;
  activeInvestigationId?: number;
  hoverEnabled?: boolean;
}

export function SidebarHistoryFlyout({
  recent,
  expanded,
  activeInvestigationId,
  hoverEnabled = true,
}: SidebarHistoryFlyoutProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  if (recent.length === 0) return null;

  const hasActiveSession = recent.some((inv) => inv.id === activeInvestigationId);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  const handleOpen = () => {
    cancelClose();
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onMouseEnter={hoverEnabled ? handleOpen : undefined}
        onMouseLeave={hoverEnabled ? scheduleClose : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "group flex w-full transition-all duration-200 outline-none",
          expanded
            ? cn(
                "items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                open || hasActiveSession
                  ? "bg-white text-primary shadow-sm ring-1 ring-primary/15"
                  : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
              )
            : cn(
                "h-9 w-9 items-center justify-center rounded-lg",
                open || hasActiveSession
                  ? "bg-white text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
              ),
        )}
      >
        <Clock
          className={cn(
            "h-4 w-4 shrink-0",
            open || hasActiveSession ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        {expanded ? (
          <>
            <span className="flex-1 text-left">History</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{recent.length}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </>
        ) : null}
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverPositioner side="right" align="start" sideOffset={10}>
          <PopoverPopup
            className="w-72 overflow-hidden p-0"
            onMouseEnter={hoverEnabled ? cancelClose : undefined}
            onMouseLeave={hoverEnabled ? scheduleClose : undefined}
          >
            <div className="border-b border-border/40 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Recent sessions
              </p>
            </div>
            <ScrollContainer className="max-h-72">
              <div className="space-y-0.5 p-1.5">
                {recent.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/workspace/${inv.id}`);
                    }}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#f5f6f6]",
                      inv.id === activeInvestigationId && "bg-primary/5 ring-1 ring-primary/15",
                    )}
                  >
                    <p className="line-clamp-2 text-xs font-medium leading-snug">{inv.query}</p>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      {formatRelativeTime(inv.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollContainer>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
