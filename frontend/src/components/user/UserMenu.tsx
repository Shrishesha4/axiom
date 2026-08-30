"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Search, Settings, Shield, User, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverPortal,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-[#f5f6f6]"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const usagePct =
    user.role === "admin"
      ? 0
      : Math.min(100, Math.round((user.tokens_used / user.token_limit) * 100));

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-black/[0.04]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      >
        <UserAvatar user={user} size="sm" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="bottom" align="end" sideOffset={8}>
          <PopoverPopup className="w-72 overflow-hidden p-0">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {user.role !== "admin" ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="rounded-full border-border/60 bg-[#f5f6f6]">
                    {user.tokens_remaining.toLocaleString()} tokens left
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {user.tokens_used.toLocaleString()} used
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="mt-3 rounded-full border-primary/30 text-primary">
                  Admin
                </Badge>
              )}

              {user.role !== "admin" ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-0.5 p-2">
              <MenuLink href="/" icon={Search} label="Home" />
              <MenuLink href="/profile" icon={User} label="Profile" />
              <MenuLink href="/settings" icon={Settings} label="Settings" />
              {user.role === "admin" ? (
                <MenuLink href="/admin" icon={Shield} label="Admin" />
              ) : null}
            </div>

            <Separator />

            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-lg px-3 text-sm font-normal"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Log out
              </Button>
            </div>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
