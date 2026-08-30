"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
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

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <AppHeader subtitle="Admin — user token limits" />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">User management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set token usage limits for each user. Limits apply to AI agent calls.
          </p>
        </div>

        {users.map((u) => (
          <Card key={u.id}>
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
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(100, (u.tokens_used / u.token_limit) * 100)}%`,
                  }}
                />
              </div>
              {u.role !== "admin" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Input
                    type="number"
                    className="w-40"
                    value={limits[u.id] ?? u.token_limit}
                    onChange={(e) =>
                      setLimits((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    min={1000}
                  />
                  <Button size="sm" onClick={() => updateLimit(u.id)}>
                    Save limit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resetUsage(u.id)}>
                    Reset usage
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      </main>
    </div>
  );
}
