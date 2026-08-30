"use client";

import type { Investigation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SessionLibraryDialogs({
  renameTarget,
  renameValue,
  deleteTarget,
  busy,
  error,
  onRenameValueChange,
  onRenameClose,
  onRename,
  onDeleteClose,
  onDelete,
}: {
  renameTarget: Investigation | null;
  renameValue: string;
  deleteTarget: Investigation | null;
  busy: boolean;
  error: string;
  onRenameValueChange: (value: string) => void;
  onRenameClose: () => void;
  onRename: () => void;
  onDeleteClose: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) onRenameClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
            <DialogDescription>Give this investigation a shorter title.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRename();
              }
            }}
            autoFocus
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onRenameClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onRename} disabled={busy || !renameValue.trim()}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) onDeleteClose();
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
            <Button type="button" variant="outline" onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
