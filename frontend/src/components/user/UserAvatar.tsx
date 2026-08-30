"use client";

import Image from "next/image";
import { userInitials } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";

interface UserAvatarProps {
  user: Pick<AuthUser, "name" | "avatar_url">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const initials = userInitials(user.name);

  if (user.avatar_url) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-full ring-2 ring-white shadow-sm",
          sizeClasses[size],
          className,
        )}
      >
        <Image
          src={user.avatar_url}
          alt={user.name}
          fill
          unoptimized
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary ring-2 ring-white",
        sizeClasses[size],
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}
