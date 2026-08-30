"use client";

import { type ReactNode, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  DITHER_BASE_OPTIONS,
  DITHER_THEME_FALLBACK,
  readDitherThemeColors,
} from "./ditherTheme";
import { RetroDither, type RetroDitherOptions } from "./RetroDither";

export function RetroDitherLayout({
  children,
  className,
  backgroundClassName = "bg-muted",
}: {
  children: ReactNode;
  className?: string;
  backgroundClassName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ditherOptions = useMemo<RetroDitherOptions>(
    () => ({
      ...DITHER_BASE_OPTIONS,
      ...(typeof document !== "undefined"
        ? readDitherThemeColors()
        : {
            darkColor: DITHER_THEME_FALLBACK.darkColor,
            lightColor: DITHER_THEME_FALLBACK.lightColor,
          }),
      colorize: DITHER_THEME_FALLBACK.colorize,
    }),
    [],
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative h-full w-full min-h-0 overflow-hidden", className)}
    >
      <div
        aria-hidden
        className={cn("absolute inset-0 z-0", backgroundClassName)}
      />
      <div className="absolute inset-0 z-[1]">
        <RetroDither
          listenTargetRef={rootRef}
          className="h-full w-full"
          {...ditherOptions}
        >
          <div className={cn("h-full w-full", backgroundClassName)} />
        </RetroDither>
      </div>
      <div className="relative z-10 h-full min-h-0 w-full pointer-events-none">
        {children}
      </div>
    </div>
  );
}
