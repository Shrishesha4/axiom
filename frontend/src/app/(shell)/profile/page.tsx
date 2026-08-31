"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { ScrollContainer } from "@/components/ScrollContainer";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { removeAvatar, updateProfile, uploadAvatar } from "@/lib/api";
import { formatDateOnly } from "@/lib/utils";
import { setAuth, getToken } from "@/lib/auth";

async function resizeImage(file: File, maxSize = 256): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("Unable to process image");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const name = nameDraft ?? user.name;

  const usagePct =
    user.role === "admin"
      ? 0
      : Math.min(100, Math.round((user.tokens_used / user.token_limit) * 100));

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateProfile(name.trim());
      const token = getToken();
      if (token) setAuth(token, updated);
      await refreshUser();
      setNameDraft(null);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const resized = await resizeImage(file);
      const updated = await uploadAvatar(resized);
      const token = getToken();
      if (token) setAuth(token, updated);
      await refreshUser();
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload picture");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const updated = await removeAvatar();
      const token = getToken();
      if (token) setAuth(token, updated);
      await refreshUser();
      setMessage("Profile picture removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove picture");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollContainer className="h-full">
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your identity and view account usage.
            </p>

            <Card className="mt-8 rounded-2xl border-border/50 shadow-none">
              <CardHeader>
                <CardTitle>Profile picture</CardTitle>
                <CardDescription>Upload a photo for your account.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4">
                <UserAvatar user={user} size="lg" />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => void handleAvatarChange(e.target.files?.[0])}
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload photo"}
                  </Button>
                  {user.avatar_url ? (
                    <Button
                      variant="ghost"
                      className="rounded-xl"
                      disabled={uploading}
                      onClick={() => void handleRemoveAvatar()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 rounded-2xl border-border/50 shadow-none">
              <CardHeader>
                <CardTitle>Display name</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={name}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="rounded-xl bg-[#f5f6f6]"
                />
                <Button
                  onClick={() => void handleSaveName()}
                  disabled={saving || !name.trim() || name.trim() === user.name}
                  className="rounded-xl"
                >
                  {saving ? "Saving..." : "Save name"}
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-4 rounded-2xl border-border/50 shadow-none">
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>
                  Member since {formatDateOnly(user.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.role === "admin" ? (
                  <p className="text-sm text-muted-foreground">Admin accounts have unlimited usage.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-[#f5f6f6] px-3 py-4">
                        <p className="text-xl font-light text-primary">
                          {user.tokens_remaining.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Remaining</p>
                      </div>
                      <div className="rounded-xl bg-[#f5f6f6] px-3 py-4">
                        <p className="text-xl font-light text-primary">
                          {user.tokens_used.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Used</p>
                      </div>
                      <div className="rounded-xl bg-[#f5f6f6] px-3 py-4">
                        <p className="text-xl font-light text-primary">
                          {user.token_limit.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Limit</p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>
    </ScrollContainer>
  );
}
