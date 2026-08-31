"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { ApodCache } from "@/lib/loading-content";
import { cn } from "@/lib/utils";

interface ApodSpotlightCardProps {
  apod: ApodCache;
  mediaWidth: string;
  revealed?: boolean;
  className?: string;
}

function subscribe() {
  return () => {};
}

function ApodThumbnail({ apod, className }: { apod: ApodCache; className?: string }) {
  if (apod.mediaType === "video" && apod.videoUrl) {
    if (apod.mediaUrl) {
      return (
        <Image
          src={apod.mediaUrl}
          alt={apod.title}
          fill
          sizes="(max-width: 640px) 72px, 140px"
          className={cn("object-cover", className)}
          draggable={false}
        />
      );
    }

    return (
      <video
        src={apod.videoUrl}
        muted
        playsInline
        preload="metadata"
        aria-label={apod.title}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={apod.mediaUrl}
      alt={apod.title}
      fill
      sizes="(max-width: 640px) 72px, 140px"
      className={cn("object-cover", className)}
      draggable={false}
    />
  );
}

function ApodExpandedMedia({ apod }: { apod: ApodCache }) {
  if (apod.mediaType === "video" && apod.videoUrl) {
    return (
      <video
        src={apod.videoUrl}
        poster={apod.mediaUrl || undefined}
        controls
        autoPlay
        playsInline
        className="h-auto max-h-[min(68vh,720px)] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
      />
    );
  }

  return (
    <Image
      src={apod.mediaUrl}
      alt={apod.title}
      width={1600}
      height={900}
      sizes="(max-width: 768px) 100vw, 80vw"
      className="h-auto max-h-[min(68vh,720px)] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
      priority
    />
  );
}

export function ApodSpotlightCard({
  apod,
  mediaWidth,
  revealed = true,
  className,
}: ApodSpotlightCardProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const mediaLabel = apod.mediaType === "video" ? "video" : "image";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto flex flex-row items-center justify-center text-2xl font-light text-foreground sm:text-4xl",
          className
        )}
      >
        <span className="pointer-events-none text-right">Today&apos;s</span>

        <motion.div
          className="mx-2 mt-1 h-14 shrink-0 overflow-hidden rounded-lg border border-border/60 shadow-sm sm:mx-3 sm:mt-2 sm:h-24"
          initial={{ width: 0, opacity: 0 }}
          animate={
            revealed ? { width: mediaWidth, opacity: 1 } : { width: 0, opacity: 0 }
          }
          transition={{ duration: 0.5, type: "spring", bounce: 0.1 }}
        >
          <button
            type="button"
            aria-label={`View NASA ${mediaLabel}: ${apod.title}`}
            aria-expanded={open}
            className="relative h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => setOpen(true)}
          >
            <ApodThumbnail apod={apod} />
          </button>
        </motion.div>

        <span className="pointer-events-none text-left">view</span>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="apod-spotlight"
                className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                role="dialog"
                aria-modal
                aria-label={apod.title}
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
                  aria-label={`Close ${mediaLabel} preview`}
                  onClick={() => setOpen(false)}
                />

                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, transparent 0%, transparent 38%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.95) 100%)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                <motion.div
                  className="pointer-events-none relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col items-center gap-5 text-center"
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 10 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ApodExpandedMedia apod={apod} />

                  <div className="max-w-2xl space-y-2 px-2 text-white">
                    <p className="text-lg font-medium sm:text-xl">{apod.title}</p>
                    <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                      {apod.explanation}
                    </p>
                    {apod.copyright && (
                      <p className="text-xs text-white/50">© {apod.copyright}</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
