"use client";

import { useEffect, useState } from "react";
import { ScrollContainer } from "@/components/ScrollContainer";
import { useAuth } from "@/components/providers/AuthProvider";
import { authHeaders, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [limits, setLimits] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`${API_URL}/api/admin/users`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        const initial: Record<number, string> = {};
        data.forEach((u: AuthUser) => {
          initial[u.id] = String(u.token_limit);
        });
        setLimits(initial);
      })
      .finally(() => setFetching(false));
  }, [user]);

  const updateLimit = async (userId: number) => {
    const token_limit = parseInt(limits[userId], 10);
    if (Number.isNaN(token_limit)) return;
    const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ token_limit }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    }
  };

  const resetUsage = async (userId: number) => {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/reset-usage`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    }
  };

  if (loading || !user) return null;

  return (
    <ScrollContainer className="h-full">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage user token limits and usage.
        </p>

        {user.role !== "admin" ? (
          <p className="mt-10 text-sm text-muted-foreground">Admin access required.</p>
        ) : fetching ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {users.map((u) => (
              <Card key={u.id} className="rounded-2xl border-border/50 shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{u.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tokens used</span>
                    <span className="font-mono">
                      {u.tokens_used.toLocaleString()} / {u.token_limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (u.tokens_used / u.token_limit) * 100)}%`,
                      }}
                    />
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Input
                        type="number"
                        className="w-40 rounded-xl bg-[#f5f6f6]"
                        value={limits[u.id] ?? u.token_limit}
                        onChange={(e) =>
                          setLimits((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        min={1000}
                      />
                      <Button size="sm" className="rounded-xl" onClick={() => updateLimit(u.id)}>
                        Save limit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => resetUsage(u.id)}
                      >
                        Reset usage
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollContainer>
  );
}
