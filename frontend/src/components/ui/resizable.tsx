"use client";

import * as React from "react";
import { GripHorizontal, GripVertical } from "lucide-react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type Layout,
  type LayoutChangedMeta,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

type PanelGroupProps = React.ComponentProps<typeof Group> & {
  persistId?: string;
  panelIds?: string[];
};

// Only rendered post-mount (see ResizablePanelGroup below), so `localStorage`
// is guaranteed to exist — this hook is never invoked during SSR/hydration.
function PersistedPanelGroup({
  persistId,
  panelIds,
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: PanelGroupProps & { persistId: string }) {
  const { defaultLayout: savedLayout, onLayoutChanged: saveLayout } = useDefaultLayout({
    id: persistId,
    panelIds,
    storage: window.localStorage,
  });

  return (
    <Group
      id={persistId}
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full min-h-0 min-w-0", className)}
      defaultLayout={savedLayout ?? defaultLayout}
      onLayoutChanged={(layout: Layout, meta: LayoutChangedMeta) => {
        saveLayout(layout, meta);
        onLayoutChanged?.(layout, meta);
      }}
      {...props}
    />
  );
}

function ResizablePanelGroup({
  persistId,
  panelIds,
  className,
  ...props
}: PanelGroupProps) {
  // Persisted layout must only be applied after hydration: reading localStorage
  // during the initial client render (to match SSR, which has no localStorage)
  // would otherwise make that first render diverge from the server-rendered
  // HTML and trigger a hydration mismatch (React error #418).
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (persistId && mounted) {
    return (
      <PersistedPanelGroup
        persistId={persistId}
        panelIds={panelIds}
        className={className}
        {...props}
      />
    );
  }

  return (
    <Group
      id={persistId}
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full min-h-0 min-w-0", className)}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return (
    <Panel
      data-slot="resizable-panel"
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      {...props}
    />
  );
}

function ResizableHandle({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "group relative z-10 flex w-2 shrink-0 items-center justify-center bg-transparent",
        "[&[aria-orientation=horizontal]]:h-2 [&[aria-orientation=horizontal]]:w-full",
        "[&[aria-orientation=vertical]]:h-full [&[aria-orientation=vertical]]:w-2",
        "[&[data-separator=hover]]:bg-primary/10",
        "[&[data-separator=active]]:bg-primary/20",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "absolute bg-border transition-colors",
          "inset-y-0 left-1/2 w-px -translate-x-1/2",
          "[.group[aria-orientation=horizontal]_&]:inset-x-0 [.group[aria-orientation=horizontal]_&]:top-1/2 [.group[aria-orientation=horizontal]_&]:h-px [.group[aria-orientation=horizontal]_&]:w-full [.group[aria-orientation=horizontal]_&]:-translate-y-1/2 [.group[aria-orientation=horizontal]_&]:translate-x-0",
          "group-data-[separator=hover]:bg-primary/50 group-data-[separator=active]:bg-primary"
        )}
      />
      {withHandle && (
        <div className="z-10 flex items-center justify-center rounded-md border border-border bg-background p-0.5 shadow-sm opacity-70 transition-opacity group-hover:opacity-100 group-data-[separator=active]:opacity-100">
          <GripVertical className="h-3 w-3 text-muted-foreground [.group[aria-orientation=horizontal]_&]:hidden" />
          <GripHorizontal className="hidden h-3 w-3 text-muted-foreground [.group[aria-orientation=horizontal]_&]:block" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
