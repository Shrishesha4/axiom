"use client";

import type { ReactNode } from "react";
import { BriefingMarkdown } from "@/components/BriefingMarkdown";
import { SourcesList } from "@/components/shared/SourcesList";
import { extractLinks } from "@/lib/extract-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

interface GeneratedSectionCardProps {
  title: string;
  text?: string;
  loading?: boolean;
  loadingLabel?: string;
  action?: ReactNode;
  subtitle?: string;
}

export function SectionHeaderRow({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {subtitle ? <p className="text-[11px] text-muted-foreground/70">{subtitle}</p> : null}
    </div>
  );
}

export function GeneratedSectionCard({
  title,
  text,
  loading = false,
  loadingLabel = "Generating…",
  action,
  subtitle,
}: GeneratedSectionCardProps) {
  const parsed = text ? extractLinks(text) : { body: "", links: [] };

  return (
    <Card>
      <CardHeader>
        <SectionHeaderRow title={title} action={action} subtitle={subtitle} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4 text-primary" />
            {loadingLabel}
          </div>
        ) : parsed.body ? (
          <BriefingMarkdown content={parsed.body} compact />
        ) : (
          <p className="text-sm text-muted-foreground">No content yet.</p>
        )}

        {!loading ? <SourcesList links={parsed.links} /> : null}
      </CardContent>
    </Card>
  );
}

export function GeneratedTextBlock({ text }: { text: string }) {
  const parsed = extractLinks(text);

  return (
    <div>
      <BriefingMarkdown content={parsed.body} compact />
      <SourcesList links={parsed.links} />
    </div>
  );
}
