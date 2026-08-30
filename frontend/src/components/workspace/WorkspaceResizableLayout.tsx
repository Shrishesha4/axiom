"use client";

import type { ReactNode } from "react";
import { ScrollContainer } from "@/components/ScrollContainer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface WorkspaceResizableLayoutProps {
  sources: ReactNode;
  main: ReactNode;
  agent: ReactNode;
}

export function WorkspaceResizableLayout({
  sources,
  main,
  agent,
}: WorkspaceResizableLayoutProps) {
  return (
    <ResizablePanelGroup
      persistId="axiom-workspace-h"
      panelIds={["sources", "main", "agent"]}
      orientation="horizontal"
      className="min-h-0 flex-1"
    >
      <ResizablePanel
        id="sources"
        defaultSize="14"
        minSize="10"
        maxSize="24"
        collapsible
        collapsedSize="0"
        className="no-print"
      >
        <ScrollContainer className="h-full border-r border-border bg-card/30 p-4">
          {sources}
        </ScrollContainer>
      </ResizablePanel>

      <ResizableHandle withHandle className="no-print" />

      <ResizablePanel id="main" defaultSize="56" minSize="32">
        <ScrollContainer className="h-full border-r border-border">{main}</ScrollContainer>
      </ResizablePanel>

      <ResizableHandle withHandle className="no-print" />

      <ResizablePanel
        id="agent"
        defaultSize="30"
        minSize="20"
        maxSize="48"
        collapsible
        collapsedSize="0"
        className="no-print"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card/50">
          {agent}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
