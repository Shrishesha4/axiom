"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import GooeySvgFilter from "@/components/fancy/filter/gooey-svg-filter";
import { useChromeRecent } from "@/components/home/ChromeRecentProvider";
import { SessionLibraryDialogs } from "@/components/home/SessionLibraryDialogs";
import { useSessionLibraryActions } from "@/components/home/useSessionLibraryActions";
import useDetectBrowser from "@/hooks/use-detect-browser";
import useScreenSize from "@/hooks/use-screen-size";
import { type Investigation } from "@/lib/api";
import { formatRelativeTime, formatDayLabel, getSessionDayKey, parseApiDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const GOOEY_FILTER_ID = "library-gooey-filter";

type DayGroup = {
  key: string;
  title: string;
  sessions: Investigation[];
};

function groupSessionsByDay(sessions: Investigation[]): DayGroup[] {
  const groups = new Map<string, Investigation[]>();

  for (const session of sessions) {
    const key = getSessionDayKey(session.created_at);
    const bucket = groups.get(key);
    if (bucket) bucket.push(session);
    else groups.set(key, [session]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, daySessions]) => {
      const sorted = daySessions.sort(
        (a, b) => parseApiDate(b.created_at).getTime() - parseApiDate(a.created_at).getTime(),
      );
      return {
        key,
        title: formatDayLabel(sorted[0].created_at),
        sessions: sorted,
      };
    });
}

function SessionRowMenu({
  session,
  menuOpenId,
  setMenuOpenId,
  openRename,
  openDelete,
}: {
  session: Investigation;
  menuOpenId: number | null;
  setMenuOpenId: (id: number | null) => void;
  openRename: (session: Investigation) => void;
  openDelete: (session: Investigation) => void;
}) {
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[open=true]:opacity-100"
        data-open={menuOpenId === session.id}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpenId(menuOpenId === session.id ? null : session.id);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {menuOpenId === session.id ? (
        <div
          data-session-menu
          className="absolute right-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border/50 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#f5f6f6]"
            onClick={() => openRename(session)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
            onClick={() => openDelete(session)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function LibraryGooeyBrowser() {
  const router = useRouter();
  const { recent, recentLoaded } = useChromeRecent();
  const screenSize = useScreenSize();
  const browser = useDetectBrowser();
  const isSafari = browser === "Safari";
  const groups = useMemo(() => groupSessionsByDay(recent), [recent]);
  const [activeTab, setActiveTab] = useState(0);
  const currentTab =
    groups.length === 0 ? 0 : Math.min(activeTab, groups.length - 1);

  const actions = useSessionLibraryActions();

  if (!recentLoaded) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No sessions yet. Start an investigation from home.
      </p>
    );
  }

  const activeGroup = groups[currentTab] ?? groups[0];
  const gooeyStrength = screenSize.lessThan("md") ? 8 : 12;
  const springDuration = isSafari ? 0 : 0.4;

  return (
    <>
      <GooeySvgFilter id={GOOEY_FILTER_ID} strength={gooeyStrength} />

      <div className="relative min-h-[360px] w-full md:min-h-[420px]">
        <div
          className="absolute inset-0"
          style={{
            filter: isSafari ? "none" : `url(#${GOOEY_FILTER_ID})`,
          }}
        >
          <div className="flex w-full overflow-hidden">
            {groups.map((group, index) => (
              <div
                key={group.key}
                className="relative h-10 min-w-[5.5rem] flex-1 md:h-12 md:min-w-[7rem]"
              >
                {currentTab === index ? (
                  <motion.div
                    layoutId="library-active-tab"
                    className="absolute inset-0 rounded-t-2xl bg-[#eef0f0]"
                    transition={{
                      type: "spring",
                      bounce: 0,
                      duration: springDuration,
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="min-h-[320px] overflow-hidden rounded-b-2xl rounded-tr-2xl bg-[#eef0f0] text-foreground md:min-h-[380px]">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeGroup.key}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{ duration: isSafari ? 0 : 0.2, ease: "easeOut" }}
                className="px-4 py-5 md:px-8 md:py-8"
              >
                <ul className="space-y-0">
                  {activeGroup.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="group flex cursor-pointer items-center justify-between gap-3 border-b border-border/40 py-3 first:pt-0 last:border-b-0"
                      onClick={() => router.push(`/workspace/${session.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.query}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatRelativeTime(session.created_at)}
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-1.5 py-0 text-[10px] capitalize",
                              session.status === "complete"
                                ? "border-primary/30 text-primary"
                                : "border-border/60",
                            )}
                          >
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                      <SessionRowMenu
                        session={session}
                        menuOpenId={actions.menuOpenId}
                        setMenuOpenId={actions.setMenuOpenId}
                        openRename={actions.openRename}
                        openDelete={actions.openDelete}
                      />
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute inset-x-0 top-0 z-10 overflow-x-auto">
          <div className="flex w-max min-w-full">
            {groups.map((group, index) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveTab(index)}
                className="h-10 min-w-[5.5rem] flex-1 px-2 md:h-12 md:min-w-[7rem]"
              >
                <span
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center text-xs font-medium transition-colors md:text-sm",
                    currentTab === index ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{group.title}</span>
                  <span className="text-[10px] text-muted-foreground md:text-xs">
                    {group.sessions.length}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <SessionLibraryDialogs
        renameTarget={actions.renameTarget}
        renameValue={actions.renameValue}
        deleteTarget={actions.deleteTarget}
        busy={actions.busy}
        error={actions.error}
        onRenameValueChange={actions.setRenameValue}
        onRenameClose={() => actions.setRenameTarget(null)}
        onRename={() => void actions.handleRename()}
        onDeleteClose={() => actions.setDeleteTarget(null)}
        onDelete={() => void actions.handleDelete()}
      />
    </>
  );
}
