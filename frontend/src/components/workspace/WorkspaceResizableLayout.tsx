"use client";

import { type ReactNode, useState } from "react";
import { Bot, LayoutDashboard, Layers } from "lucide-react";
import { ScrollContainer } from "@/components/ScrollContainer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useScreenSize from "@/hooks/use-screen-size";
import { cn } from "@/lib/utils";

interface WorkspaceResizableLayoutProps {
  sources: ReactNode;
  main: ReactNode;
  agent: ReactNode;
  className?: string;
}

type MobilePane = "main" | "sources" | "agent";

const panelShell =
  "h-full min-h-0 overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm";

const MOBILE_TABS: { id: MobilePane; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "main", label: "Dashboard", icon: LayoutDashboard },
  { id: "sources", label: "Sources", icon: Layers },
  { id: "agent", label: "Agent", icon: Bot },
];

function MobileWorkspaceLayout({
  sources,
  main,
  agent,
  className,
}: WorkspaceResizableLayoutProps) {
  const [pane, setPane] = useState<MobilePane>("main");

  const content =
    pane === "sources" ? sources : pane === "agent" ? agent : main;

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1">
        {pane === "agent" ? (
          <div className={cn(panelShell, "flex flex-col bg-[#f5f6f6]/90")}>{content}</div>
        ) : pane === "sources" ? (
          <div className={cn(panelShell, "bg-[#f5f6f6]/90")}>
            <ScrollContainer className="h-full p-4">{content}</ScrollContainer>
          </div>
        ) : (
          <div className={panelShell}>
            <ScrollContainer className="h-full">{content}</ScrollContainer>
          </div>
        )}
      </div>

      <nav
        className="flex shrink-0 gap-1 border-t border-border/40 bg-[#f5f6f6]/95 px-2 py-1.5"
        aria-label="Workspace panels"
      >
        {MOBILE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors",
              pane === id
                ? "bg-white text-primary shadow-sm ring-1 ring-primary/15"
                : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function WorkspaceResizableLayout({
  sources,
  main,
  agent,
  className,
}: WorkspaceResizableLayoutProps) {
  const { lessThan } = useScreenSize();
  const isCompact = lessThan("lg");

  if (isCompact) {
    return (
      <MobileWorkspaceLayout
        sources={sources}
        main={main}
        agent={agent}
        className={className}
      />
    );
  }

  return (
    <ResizablePanelGroup
      persistId="axiom-workspace-h"
      panelIds={["sources", "main", "agent"]}
      orientation="horizontal"
      className={cn("h-full min-h-0 flex-1 gap-2 px-2 pb-2", className)}
    >
      <ResizablePanel
        id="sources"
        defaultSize="14"
        minSize="10"
        maxSize="24"
        collapsible
        collapsedSize="0"
        className="no-print min-w-0"
      >
        <div className={cn(panelShell, "bg-[#f5f6f6]/90")}>
          <ScrollContainer className="h-full p-4">{sources}</ScrollContainer>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="no-print w-1 bg-transparent" />

      <ResizablePanel id="main" defaultSize="56" minSize="32" className="min-w-0">
        <div className={panelShell}>
          <ScrollContainer className="h-full">{main}</ScrollContainer>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="no-print w-1 bg-transparent" />

      <ResizablePanel
        id="agent"
        defaultSize="30"
        minSize="20"
        maxSize="48"
        collapsible
        collapsedSize="0"
        className="no-print min-w-0"
      >
        <div className={cn(panelShell, "flex flex-col bg-[#f5f6f6]/90")}>{agent}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
