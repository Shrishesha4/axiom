"use client";

import { type ReactNode, useCallback, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Library,
  PanelLeft,
  Search,
  Settings,
  Shield,
  User,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { SidebarHistoryFlyout } from "@/components/home/SidebarHistoryFlyout";
import { ShellMainHeaderProvider } from "@/components/home/ShellMainHeader";
import { useAuth } from "@/components/providers/AuthProvider";
import { UserMenu } from "@/components/user/UserMenu";
import { Button } from "@/components/ui/button";
import { RetroDitherLayout } from "@/components/canvasui/RetroDitherLayout";
import { type Investigation } from "@/lib/api";
import { cn } from "@/lib/utils";

const SIDEBAR_RAIL = 56;
const SIDEBAR_OPEN = 260;
const SIDEBAR_EXPANDED_KEY = "axiom-home-sidebar-expanded";

const slideTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

/** Flat chrome — only the main sheet is a rounded card */
const chromeShell =
  "flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f6f6]";

const chromeBar = "bg-[#f5f6f6]";

const mainSheet =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 shadow-sm";

interface HomeAppChromeProps {
  recent: Investigation[];
  children: ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Search,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: LayoutGrid,
    isActive: (pathname) => pathname.startsWith("/portfolio"),
  },
  {
    href: "/library",
    label: "Library",
    icon: Library,
    isActive: (pathname) => pathname.startsWith("/library"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    isActive: (pathname) => pathname.startsWith("/profile"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    isActive: (pathname) => pathname.startsWith("/settings"),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    adminOnly: true,
    isActive: (pathname) => pathname.startsWith("/admin"),
  },
];

function SidebarNavLink({
  item,
  expanded,
  active,
}: {
  item: NavItem;
  expanded: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  if (expanded) {
    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-white text-primary shadow-sm ring-1 ring-primary/15"
            : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
        active
          ? "bg-white text-primary shadow-sm ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
      )}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

function readSidebarExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function HomeAppChrome({ recent, children }: HomeAppChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [animateLayout, setAnimateLayout] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  const activeInvestigationId = useMemo(() => {
    const match = pathname.match(/^\/workspace\/(\d+)/);
    return match ? Number(match[1]) : undefined;
  }, [pathname]);

  useLayoutEffect(() => {
    setTimeout(() => {
      setExpanded(readSidebarExpanded());
      setAnimateLayout(true);
    }, 100);
  }, []);

  const toggleSidebar = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const sidebarWidth = expanded ? SIDEBAR_OPEN : SIDEBAR_RAIL;
  const layoutTransition = animateLayout ? slideTransition : { duration: 0 };
  const showBack = pathname !== "/";

  if (!user) return null;

  return (
    <div className="pointer-events-auto flex h-full min-h-0">
      <div className={chromeShell}>
        <header
          className={cn(
            "flex shrink-0 items-center justify-between px-4 pb-2 pt-3 sm:px-6 sm:pt-3.5",
            chromeBar,
          )}
        >
          <Link
            href="/"
            className="shrink-0 text-base font-semibold tracking-[0.15em] text-primary sm:text-lg"
          >
            axiom.
          </Link>
          <UserMenu />
        </header>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <motion.aside
            initial={false}
            animate={{ width: sidebarWidth }}
            transition={layoutTransition}
            className={cn("shrink-0 overflow-hidden", chromeBar)}
          >
            {expanded ? (
              <div className="flex h-full min-h-0 w-[260px] flex-col">
                <nav className="shrink-0 space-y-1 px-3 pb-3 pt-3">
                  <p className="mb-2 px-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Navigate
                  </p>
                  {navItems.map((item) => (
                    <SidebarNavLink
                      key={item.href}
                      item={item}
                      expanded
                      active={item.isActive(pathname)}
                    />
                  ))}
                  <SidebarHistoryFlyout
                    recent={recent}
                    expanded
                    activeInvestigationId={activeInvestigationId}
                  />
                </nav>
                <div className="min-h-0 flex-1" />
              </div>
            ) : (
              <div className="flex w-[56px] flex-col items-center gap-1.5 py-3">
                {navItems.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    expanded={false}
                    active={item.isActive(pathname)}
                  />
                ))}
                <SidebarHistoryFlyout
                  recent={recent}
                  expanded={false}
                  activeInvestigationId={activeInvestigationId}
                />
              </div>
            )}
          </motion.aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2">
            <ShellMainHeaderProvider>
              {(header) => (
                <div className={mainSheet}>
                  <RetroDitherLayout
                    className="min-h-0 flex-1 rounded-[inherit]"
                    backgroundClassName="bg-white"
                  >
                    <div className="pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden">
                      <div className="flex shrink-0 items-center gap-1 px-2 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={toggleSidebar}
                          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                          className="h-7 w-7 shrink-0 rounded-lg p-0 opacity-70 transition-all hover:bg-black/[0.05] hover:opacity-100"
                        >
                          <PanelLeft className="h-4 w-4" />
                        </Button>
                        {showBack && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push("/")}
                            title="Back to home"
                            className="h-7 w-7 shrink-0 rounded-lg p-0 opacity-70 transition-all hover:bg-black/[0.05] hover:opacity-100"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="min-w-0 flex-1">{header}</div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
                    </div>
                  </RetroDitherLayout>
                </div>
              )}
            </ShellMainHeaderProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
