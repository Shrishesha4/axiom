"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

const MIN_STEP = 1;
const MAX_STEP = 14;

export function StreamingText({
  content,
  isStreaming = false,
  className,
}: StreamingTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState("");
  const displayedRef = useRef("");
  const targetRef = useRef(content);
  const streamingRef = useRef(isStreaming);
  const frameRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null || prefersReducedMotion) return;

    const tick = () => {
      const target = targetRef.current;
      const current = displayedRef.current;
      let nextFrame = streamingRef.current;

      if (current.length < target.length) {
        const backlog = target.length - current.length;
        const step = Math.min(
          MAX_STEP,
          Math.max(MIN_STEP, Math.ceil(backlog / 4)),
        );
        const next = target.slice(0, current.length + step);
        displayedRef.current = next;
        setDisplayed(next);
        nextFrame = true;
      }

      if (nextFrame) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [prefersReducedMotion]);

  useEffect(() => {
    targetRef.current = content;
    streamingRef.current = isStreaming;
  }, [content, isStreaming]);

  useEffect(() => {
    if (prefersReducedMotion) {
      stopLoop();
      return;
    }

    if (content.length < displayedRef.current.length) {
      displayedRef.current = "";
      setDisplayed("");
    }

    startLoop();
    return stopLoop;
  }, [content, isStreaming, prefersReducedMotion, startLoop, stopLoop]);

  if (prefersReducedMotion) {
    return (
      <p className={cn("whitespace-pre-wrap leading-relaxed", className)}>
        {content}
      </p>
    );
  }

  const showCursor = isStreaming || displayed.length < content.length;

  return (
    <p className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {displayed}
      {showCursor ? (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block w-[2px] bg-current opacity-70"
          style={{ height: "1.05em", verticalAlign: "text-bottom" }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </p>
  );
}
