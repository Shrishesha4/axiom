"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { SessionLibraryDialogs } from "@/components/home/SessionLibraryDialogs";
import { useSessionLibraryActions } from "@/components/home/useSessionLibraryActions";
import { type Investigation } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const HOME_LIBRARY_LIMIT = 6;

type ContextMenuState = {
  x: number;
  y: number;
  session: Investigation;
} | null;

function SessionCardMenu({
  session,
  menuOpenId,
  setMenuOpenId,
  setContextMenu,
  openRename,
  openDelete,
}: {
  session: Investigation;
  menuOpenId: number | null;
  setMenuOpenId: (id: number | null) => void;
  setContextMenu: (value: ContextMenuState) => void;
  openRename: (session: Investigation) => void;
  openDelete: (session: Investigation) => void;
}) {
  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[open=true]:opacity-100"
        data-open={menuOpenId === session.id}
        onClick={(e) => {
          e.stopPropagation();
          setContextMenu(null);
          setMenuOpenId(menuOpenId === session.id ? null : session.id);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {menuOpenId === session.id ? (
        <div
          data-session-menu
          className="absolute right-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border/50 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#f5f6f6]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openRename(session);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openDelete(session);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SessionLibrary({ limit }: { limit?: number }) {
  const router = useRouter();
  const { recent, recentLoaded } = useChromeRecent();
  const gridRef = useRef<HTMLDivElement>(null);
  const sessions = limit ? recent.slice(0, limit) : recent;

  const {
    setMenuOpenId,
    setContextMenu,
    openRename,
    openDelete,
    menuOpenId,
    contextMenu,
    renameTarget,
    renameValue,
    deleteTarget,
    busy,
    error,
    setRenameTarget,
    setRenameValue,
    setDeleteTarget,
    handleRename,
    handleDelete,
  } = useSessionLibraryActions();

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleContextMenu = (event: MouseEvent) => {
      const card = (event.target as HTMLElement).closest("[data-session-card]");
      if (!card) return;

      event.preventDefault();
      event.stopPropagation();

      const sessionId = Number(card.getAttribute("data-session-id"));
      const session = recent.find((item) => item.id === sessionId);
      if (!session) return;

      setMenuOpenId(null);
      setContextMenu({ x: event.clientX, y: event.clientY, session });
    };

    grid.addEventListener("contextmenu", handleContextMenu);
    return () => grid.removeEventListener("contextmenu", handleContextMenu);
  }, [recent, setMenuOpenId, setContextMenu]);

  if (!recentLoaded) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sessions yet. Start an investigation above.
      </p>
    );
  }

  return (
    <>
      <div className={limit ? undefined : "max-h-[520px] overflow-y-auto pr-1"}>
        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              data-session-card
              data-session-id={session.id}
              className="group relative flex h-full cursor-pointer flex-col rounded-2xl border-border/50 bg-[#f5f6f6] shadow-none transition-all hover:border-primary/40 hover:bg-[#eef0f0] hover:shadow-sm"
              onClick={() => router.push(`/workspace/${session.id}`)}
            >
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2 py-0 text-[10px] capitalize",
                      session.status === "complete"
                        ? "border-primary/30 text-primary"
                        : "border-border/60",
                    )}
                  >
                    {session.status}
                  </Badge>
                  <div
                    data-session-card-actions
                    className="relative z-10"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <SessionCardMenu
                      session={session}
                      menuOpenId={menuOpenId}
                      setMenuOpenId={setMenuOpenId}
                      setContextMenu={setContextMenu}
                      openRename={openRename}
                      openDelete={openDelete}
                    />
                  </div>
                </div>

                <p className="line-clamp-3 flex-1 text-sm font-medium leading-snug">
                  {session.query}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatRelativeTime(session.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {contextMenu ? (
          <div
            data-session-context-menu
            className="fixed z-50 min-w-[140px] overflow-hidden rounded-xl border border-border/50 bg-white py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#f5f6f6]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openRename(contextMenu.session);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDelete(contextMenu.session);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        ) : null}
      </div>

      <SessionLibraryDialogs
        renameTarget={renameTarget}
        renameValue={renameValue}
        deleteTarget={deleteTarget}
        busy={busy}
        error={error}
        onRenameValueChange={setRenameValue}
        onRenameClose={() => setRenameTarget(null)}
        onRename={() => void handleRename()}
        onDeleteClose={() => setDeleteTarget(null)}
        onDelete={() => void handleDelete()}
      />
    </>
  );
}

export function SessionLibrarySection() {
  const { recent } = useChromeRecent();
  const showAll = recent.length > HOME_LIBRARY_LIMIT;

  return (
    <section className="mt-4">
      <Separator className="mb-8 bg-border/50" />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your library</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Previous sessions</h2>
        </div>
        {showAll ? (
          <Link
            href="/library"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Show all
          </Link>
        ) : null}
      </div>
      <SessionLibrary limit={HOME_LIBRARY_LIMIT} />
    </section>
  );
}
