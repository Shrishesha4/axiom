"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, RotateCcw, Save, Search, ShieldCheck } from "lucide-react";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import { authHeaders, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminUser = AuthUser;

function usagePercent(user: AdminUser) {
  if (user.token_limit <= 0) return 0;
  return Math.min(100, (user.tokens_used / user.token_limit) * 100);
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [limits, setLimits] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [blockingId, setBlockingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`${API_URL}/api/admin/users`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: AdminUser[]) => {
        setUsers(data);
        const initial: Record<number, string> = {};
        data.forEach((u) => {
          initial[u.id] = String(u.token_limit);
        });
        setLimits(initial);
      })
      .finally(() => setFetching(false));
  }, [user]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query),
    );
  }, [search, users]);

  const patchUser = async (userId: number, body: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const updated = (await res.json()) as AdminUser;
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    return updated;
  };

  const updateLimit = async (userId: number) => {
    const token_limit = parseInt(limits[userId], 10);
    if (Number.isNaN(token_limit)) return;
    setSavingId(userId);
    try {
      await patchUser(userId, { token_limit });
    } finally {
      setSavingId(null);
    }
  };

  const resetUsage = async (userId: number) => {
    setSavingId(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/reset-usage`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        const updated = (await res.json()) as AdminUser;
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      }
    } finally {
      setSavingId(null);
    }
  };

  const toggleBlock = async (target: AdminUser) => {
    setBlockingId(target.id);
    try {
      await patchUser(target.id, { is_active: !target.is_active });
    } finally {
      setBlockingId(null);
    }
  };

  if (loading || !user) return null;

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage users, token limits, and account access.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="rounded-xl bg-[#f5f6f6] pl-9"
              aria-label="Search users"
            />
          </div>
        </div>

        {user.role !== "admin" ? (
          <p className="mt-10 text-sm text-muted-foreground">Admin access required.</p>
        ) : fetching ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3 md:hidden">
              {filteredUsers.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No users match your search.
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === user.id;
                  const isAdmin = u.role === "admin";
                  const busy = savingId === u.id || blockingId === u.id;

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "rounded-2xl border border-border/50 bg-white p-4",
                        !u.is_active && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar user={u} size="sm" className="ring-1 ring-border/40" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={isAdmin ? "default" : "outline"} className="capitalize">
                              {u.role}
                            </Badge>
                            <Badge
                              variant={u.is_active ? "outline" : "destructive"}
                              className={
                                u.is_active
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : undefined
                              }
                            >
                              {u.is_active ? "Active" : "Blocked"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="font-mono text-xs">
                          {u.tokens_used.toLocaleString()} / {u.token_limit.toLocaleString()} tokens
                        </p>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${usagePercent(u)}%` }}
                          />
                        </div>
                      </div>

                      {!isAdmin ? (
                        <div className="mt-4">
                          <Input
                            type="number"
                            className="h-9 w-full rounded-lg bg-[#f5f6f6] px-2"
                            value={limits[u.id] ?? u.token_limit}
                            onChange={(e) =>
                              setLimits((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            min={1000}
                            disabled={busy}
                            aria-label={`Token limit for ${u.name}`}
                          />
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {!isAdmin && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              className="rounded-lg"
                              disabled={busy}
                              onClick={() => updateLimit(u.id)}
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              className="rounded-lg"
                              disabled={busy}
                              onClick={() => resetUsage(u.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset
                            </Button>
                          </>
                        )}
                        {!isSelf && (
                          <Button
                            size="xs"
                            variant={u.is_active ? "destructive" : "outline"}
                            className="rounded-lg"
                            disabled={busy}
                            onClick={() => toggleBlock(u)}
                          >
                            {u.is_active ? (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                Block
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Unblock
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8 hidden overflow-hidden rounded-2xl border border-border/50 bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="min-w-[140px]">Token limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === user.id;
                    const isAdmin = u.role === "admin";
                    const busy = savingId === u.id || blockingId === u.id;

                    return (
                      <TableRow key={u.id} className={!u.is_active ? "opacity-60" : undefined}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={u} size="sm" className="ring-1 ring-border/40" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{u.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isAdmin ? "default" : "outline"} className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.is_active ? "outline" : "destructive"}
                            className={
                              u.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : undefined
                            }
                          >
                            {u.is_active ? "Active" : "Blocked"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[120px] space-y-1.5">
                            <p className="font-mono text-xs">
                              {u.tokens_used.toLocaleString()} / {u.token_limit.toLocaleString()}
                            </p>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${usagePercent(u)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <span className="text-xs text-muted-foreground">Unlimited</span>
                          ) : (
                            <Input
                              type="number"
                              className="h-8 w-32 rounded-lg bg-[#f5f6f6] px-2"
                              value={limits[u.id] ?? u.token_limit}
                              onChange={(e) =>
                                setLimits((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              min={1000}
                              disabled={busy}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {!isAdmin && (
                              <>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={busy}
                                  onClick={() => updateLimit(u.id)}
                                  title="Save token limit"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  Save
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={busy}
                                  onClick={() => resetUsage(u.id)}
                                  title="Reset token usage"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Reset
                                </Button>
                              </>
                            )}
                            {!isSelf && (
                              <Button
                                size="xs"
                                variant={u.is_active ? "destructive" : "outline"}
                                className="rounded-lg"
                                disabled={busy}
                                onClick={() => toggleBlock(u)}
                                title={u.is_active ? "Block user" : "Unblock user"}
                              >
                                {u.is_active ? (
                                  <>
                                    <Ban className="h-3.5 w-3.5" />
                                    Block
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Unblock
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </div>
    </ScrollContainer>
  );
}
