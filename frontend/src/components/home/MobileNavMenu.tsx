"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, PanelLeft, type LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverPortal,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { type Investigation } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

function MenuLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/5 font-medium text-primary"
          : "text-foreground hover:bg-[#f5f6f6]",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
      {label}
    </Link>
  );
}

interface MobileNavMenuProps {
  navItems: MobileNavItem[];
  pathname: string;
  recent: Investigation[];
  activeInvestigationId?: number;
}

export function MobileNavMenu({
  navItems,
  pathname,
  recent,
  activeInvestigationId,
}: MobileNavMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg p-0 opacity-70 transition-all hover:bg-black/[0.05] hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          open && "bg-black/[0.05] opacity-100",
        )}
        aria-label="Open navigation menu"
      >
        <PanelLeft className="h-4 w-4" />
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverPositioner side="bottom" align="start" sideOffset={8}>
          <PopoverPopup className="w-72 overflow-hidden p-0">
            <div className="p-1.5">
              {navItems.map((item) => (
                <MenuLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={item.isActive(pathname)}
                  onClick={close}
                />
              ))}
            </div>

            {recent.length > 0 ? (
              <>
                <Separator />
                <div className="max-h-52 overflow-y-auto p-1.5">
                  <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    Recent sessions
                  </p>
                  {recent.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => {
                        close();
                        router.push(`/workspace/${inv.id}`);
                      }}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f5f6f6]",
                        inv.id === activeInvestigationId && "bg-primary/5 ring-1 ring-primary/15",
                      )}
                    >
                      <p className="line-clamp-2 text-xs font-medium leading-snug">{inv.query}</p>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        {formatRelativeTime(inv.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
