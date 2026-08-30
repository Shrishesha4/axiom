"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { deleteInvestigation, updateInvestigation, type Investigation } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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
  const menuRef = useRef<HTMLDivElement>(null);

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
          ref={menuRef}
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

export function SessionLibrary() {
  const router = useRouter();
  const { recent, recentLoaded, refreshRecent, setRecent } = useChromeRecent();
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [renameTarget, setRenameTarget] = useState<Investigation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

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
  }, [recent]);

  useEffect(() => {
    const closeMenus = () => {
      setMenuOpenId(null);
      setContextMenu(null);
    };
    const closeOnClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-session-menu]") ||
        target.closest("[data-session-context-menu]") ||
        target.closest("[data-session-card-actions]") ||
        target.closest("[data-slot=dialog-content]") ||
        target.closest("[data-slot=dialog-overlay]")
      ) {
        return;
      }
      closeMenus();
    };
    window.addEventListener("click", closeOnClick);
    window.addEventListener("scroll", closeMenus, true);
    return () => {
      window.removeEventListener("click", closeOnClick);
      window.removeEventListener("scroll", closeMenus, true);
    };
  }, []);

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const nextTitle = renameValue.trim();
    setBusy(true);
    setError("");
    try {
      const updated = await updateInvestigation(renameTarget.id, nextTitle);
      setRecent(
        recent.map((session) =>
          session.id === updated.id ? { ...session, query: updated.query } : session,
        ),
      );
      setRenameTarget(null);
      await refreshRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError("");
    try {
      await deleteInvestigation(deleteTarget.id);
      setDeleteTarget(null);
      await refreshRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  const openRename = (session: Investigation) => {
    setMenuOpenId(null);
    setContextMenu(null);
    setRenameTarget(session);
    setRenameValue(session.query);
    setError("");
  };

  const openDelete = (session: Investigation) => {
    setMenuOpenId(null);
    setContextMenu(null);
    setDeleteTarget(session);
    setError("");
  };

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

  const renameDialog = (
    <Dialog
      open={!!renameTarget}
      onOpenChange={(open) => {
        if (!open) setRenameTarget(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename session</DialogTitle>
          <DialogDescription>Give this investigation a shorter title.</DialogDescription>
        </DialogHeader>
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleRename();
            }
          }}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleRename()}
            disabled={busy || !renameValue.trim()}
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteDialog = (
    <Dialog
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete session?</DialogTitle>
          <DialogDescription>
            This permanently removes &ldquo;{deleteTarget?.query}&rdquo; and all associated data.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
            {busy ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <div className="max-h-[520px] overflow-y-auto pr-1">
        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((session) => (
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

      {renameDialog}
      {deleteDialog}
    </>
  );
}

export function SessionLibrarySection() {
  return (
    <section className="mt-4">
      <Separator className="mb-8 bg-border/50" />
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Your library</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Previous sessions</h2>
      </div>
      <SessionLibrary />
    </section>
  );
}
