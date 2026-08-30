"use client";

import { ExternalLink } from "lucide-react";
import type { ExtractedLink } from "@/lib/extract-links";
import { cn } from "@/lib/utils";

export function SourcesList({
  links,
  className,
}: {
  links: ExtractedLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={cn("mt-3 border-t border-border/50 pt-3", className)}>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Sources</p>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{link.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
