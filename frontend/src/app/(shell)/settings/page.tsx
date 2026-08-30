"use client";

import { useState } from "react";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { changePassword, deleteAccount } from "@/lib/api";
import { clearAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteAccount(deletePassword);
      clearAuth();
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setBusy(false);
    }
  };

  return (
    <>
      <ScrollContainer className="h-full">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Security and account preferences.
          </p>

          <Card className="mt-8 rounded-2xl border-border/50 shadow-none">
            <CardHeader>
              <CardTitle>Reset password</CardTitle>
              <CardDescription>Choose a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl bg-[#f5f6f6]"
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl bg-[#f5f6f6]"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl bg-[#f5f6f6]"
              />
              <Button
                onClick={() => void handleChangePassword()}
                disabled={busy || !currentPassword || !newPassword || !confirmPassword}
                className="rounded-xl"
              >
                {busy ? "Updating..." : "Update password"}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 rounded-2xl border-destructive/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-destructive">Delete account</CardTitle>
              <CardDescription>
                Permanently delete your account, all investigations, and usage data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => {
                  setDeletePassword("");
                  setError("");
                  setShowDeleteDialog(true);
                }}
              >
                Delete my account
              </Button>
            </CardContent>
          </Card>

          {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}
          {error && !showDeleteDialog ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </ScrollContainer>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Your password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="rounded-xl bg-[#f5f6f6]"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !deletePassword}
              onClick={() => void handleDeleteAccount()}
            >
              {busy ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
