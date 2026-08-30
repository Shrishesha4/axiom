"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AppHeader({
  subtitle,
  className,
  leading,
}: {
  subtitle?: string;
  className?: string;
  leading?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const usagePct = Math.min(100, Math.round((user.tokens_used / user.token_limit) * 100));

  return (
    <header className={cn("flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <Link href="/" className="text-sm font-semibold tracking-[0.15em] text-primary shrink-0">
          axiom.
        </Link>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {user.role !== "admin" && (
          <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground">
            <span>{user.tokens_remaining.toLocaleString()} tokens left</span>
            <div className="w-28 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          {user.role === "admin" && (
            <Badge variant="outline" className="text-primary border-primary/30">
              Admin
            </Badge>
          )}
        </div>

        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/portfolio")} title="Portfolio">
          <LayoutGrid className="w-4 h-4" />
        </Button>

        {user.role === "admin" && (
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/admin")} title="Admin">
            <Settings className="w-4 h-4" />
          </Button>
        )}

        <Button variant="ghost" size="icon-sm" onClick={logout} title="Sign out">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
