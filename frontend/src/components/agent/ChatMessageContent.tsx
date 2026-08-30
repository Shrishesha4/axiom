"use client";

import type { ReactNode } from "react";
import { extractLinks } from "@/lib/extract-links";
import { SourcesList } from "@/components/shared/SourcesList";

export function renderChatInline(text: string): ReactNode[] {
  const parts = text.split(
    /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g,
  );
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return (
        <em key={i} className="text-muted-foreground not-italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessageContent({ content }: { content: string }) {
  const parsed = extractLinks(content);
  const paragraphs = parsed.body.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, index) =>
        paragraph.trim() ? (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {renderChatInline(paragraph)}
          </p>
        ) : null,
      )}
      <SourcesList links={parsed.links} />
    </div>
  );
}
