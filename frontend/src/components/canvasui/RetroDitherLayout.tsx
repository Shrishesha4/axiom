"use client";

import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import { RetroDither } from "./RetroDither";

const DITHER_OPTIONS = {
  radius: 0.5,
  softness: 1,
  pixelSize: 2,
  levels: 4,
  colorize: 0.1,
  contrast: 0.6,
  brightness: 0,
  strength: 0.75,
  baseStrength: 0,
  invert: 0,
  scanlines: 0,
  pattern: "bayer" as const,
  trail: 0.4,
  degauss: 0.8,
  followSpeed: 3,
  darkColor: [0, 0, 0] as [number, number, number],
  lightColor: [1, 1, 1] as [number, number, number],
};

export function RetroDitherLayout({
  children,
  className,
  backgroundClassName = "bg-muted/30",
}: {
  children: ReactNode;
  className?: string;
  backgroundClassName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      className={cn("relative h-dvh w-full min-h-0", className)}
    >
      <div className="absolute inset-0 z-0">
        <RetroDither
          listenTargetRef={rootRef}
          className="h-full w-full"
          {...DITHER_OPTIONS}
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
