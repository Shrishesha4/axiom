"use client";

import type { ReactNode } from "react";
import { ScrollContainer } from "@/components/ScrollContainer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface WorkspaceResizableLayoutProps {
  sources: ReactNode;
  main: ReactNode;
  agent: ReactNode;
  className?: string;
}

const panelShell =
  "h-full min-h-0 overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm";

export function WorkspaceResizableLayout({
  sources,
  main,
  agent,
  className,
}: WorkspaceResizableLayoutProps) {
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
