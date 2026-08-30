"use client";

import { useEffect, useState } from "react";
import { useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { deleteInvestigation, updateInvestigation, type Investigation } from "@/lib/api";

export type SessionContextMenuState = {
  x: number;
  y: number;
  session: Investigation;
} | null;

export function useSessionLibraryActions() {
  const { recent, setRecent, refreshRecent } = useChromeRecent();
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<SessionContextMenuState>(null);
  const [renameTarget, setRenameTarget] = useState<Investigation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  return {
    menuOpenId,
    setMenuOpenId,
    contextMenu,
    setContextMenu,
    renameTarget,
    setRenameTarget,
    renameValue,
    setRenameValue,
    deleteTarget,
    setDeleteTarget,
    busy,
    error,
    handleRename,
    handleDelete,
    openRename,
    openDelete,
  };
}
