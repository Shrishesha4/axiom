"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { FileText, Swords } from "lucide-react";
import type { InvestigationSummary } from "@/lib/api";
import { INTENT_LABELS, resolveDashboardConfig } from "@/lib/dashboard-config";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MECHANISM_COLORS } from "@/lib/chart-colors";
import {
  GeneratedSectionCard,
  GeneratedTextBlock,
  SectionHeaderRow,
} from "@/components/workspace/GeneratedSectionCard";
import { Spinner } from "@/components/ui/spinner";

const CompetitiveBubbleChart = dynamic(
  () =>
    import("@/components/charts/CompetitiveBubbleChart").then((m) => m.CompetitiveBubbleChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);

const PhaseChart = dynamic(
  () => import("@/components/charts/PhaseChart").then((m) => m.PhaseChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);

const MechanismChart = dynamic(
  () => import("@/components/charts/MechanismChart").then((m) => m.MechanismChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);

function ChartPlaceholder() {
  return <div className="h-52 w-full animate-pulse rounded-md bg-muted/60" />;
}

export type InlineDebate = {
  bull: string;
  bear: string;
  synthesis: string;
};

interface InvestigationDashboardProps {
  summary: InvestigationSummary;
  query: string;
  highlightMechanism: string | null;
  debate?: InlineDebate | null;
  debateLoading?: boolean;
  leadMemo?: { therapyName: string; content: string } | null;
  leadMemoLoading?: boolean;
  onHighlight?: (mechanism: string | null) => void;
  onDraftMemo?: (therapyName: string) => void;
  onOpenDebate?: () => void;
}

export const InvestigationDashboard = memo(function InvestigationDashboard({
  summary,
  query,
  highlightMechanism,
  debate,
  debateLoading = false,
  leadMemo,
  leadMemoLoading = false,
  onHighlight,
  onDraftMemo,
  onOpenDebate,
}: InvestigationDashboardProps) {
  const landscape = summary.landscape;
  const dashboard = resolveDashboardConfig(summary, query);
  const titles = dashboard.section_titles;
  const sections = dashboard.sections;
  const topRanking = summary.rankings[0];
  const showDebate = debateLoading || Boolean(debate?.bull || debate?.bear || debate?.synthesis);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-primary/30 text-primary capitalize">
            {INTENT_LABELS[dashboard.intent] || dashboard.intent}
          </Badge>
          <h2 className="text-lg font-medium tracking-wide">{dashboard.title}</h2>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {dashboard.kpis.map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <CardContent className="pt-4">
              <p className="truncate text-2xl font-light text-primary">{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {sections.market_signal && (
        <GeneratedSectionCard
          title={titles.market_signal || "Market signal"}
          text={summary.market_signal}
        />
      )}

      {showDebate && (
        <Card>
          <CardHeader>
            <SectionHeaderRow
              title="Investment debate"
              action={
                onOpenDebate ? (
                  <Button variant="outline" size="xs" onClick={onOpenDebate}>
                    <Swords className="h-3.5 w-3.5" />
                    Open
                  </Button>
                ) : null
              }
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {debateLoading && !debate?.bull && !debate?.bear ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4 text-primary" />
                Generating bull / bear cases…
              </div>
            ) : null}
            {debate?.bull ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-primary">Bull</p>
                <GeneratedTextBlock text={debate.bull} />
              </div>
            ) : null}
            {debate?.bear ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-destructive">Bear</p>
                <GeneratedTextBlock text={debate.bear} />
              </div>
            ) : null}
            {debate?.synthesis ? (
              <div className="border-t border-border/50 pt-4">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Synthesis
                </p>
                <GeneratedTextBlock text={debate.synthesis} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {sections.competitive_matrix && summary.matrix.length > 0 && (
        <Card>
          <CardHeader>
            <SectionHeaderRow title={titles.competitive_matrix || "Competitive landscape"} />
          </CardHeader>
          <CardContent>
            <CompetitiveBubbleChart data={summary.matrix} highlightMechanism={highlightMechanism} />
          </CardContent>
        </Card>
      )}

      {(sections.phase_chart || sections.mechanism_chart) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.phase_chart && (
            <Card>
              <CardHeader>
                <SectionHeaderRow title={titles.phase_chart || "Trial phases"} />
              </CardHeader>
              <CardContent>
                <PhaseChart data={landscape.phase_distribution} />
              </CardContent>
            </Card>
          )}
          {sections.mechanism_chart && (
            <Card>
              <CardHeader>
                <SectionHeaderRow title={titles.mechanism_chart || "Mechanisms"} />
              </CardHeader>
              <CardContent>
                <MechanismChart data={landscape.mechanism_distribution} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {sections.whitespace && summary.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <SectionHeaderRow title={titles.whitespace || "White-space opportunities"} />
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.opportunities.map((o) => (
              <div
                key={o.mechanism}
                role="button"
                tabIndex={0}
                onClick={() => onHighlight?.(highlightMechanism === o.mechanism ? null : o.mechanism)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onHighlight?.(highlightMechanism === o.mechanism ? null : o.mechanism);
                  }
                }}
                className="-mx-2 w-full cursor-pointer rounded-md p-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: MECHANISM_COLORS[o.mechanism] || MECHANISM_COLORS.Other }}
                  />
                  <span className="flex-1 text-sm">{o.mechanism}</span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {o.opportunity_score}
                  </Badge>
                </div>
                <div className="mt-1 pl-4">
                  <GeneratedTextBlock text={o.rationale} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sections.trials_table && summary.trials.length > 0 && (
        <Card>
          <CardHeader>
            <SectionHeaderRow title={titles.trials_table || "Clinical trials"} />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.trials.slice(0, 12).map((t) => (
                  <TableRow key={t.nct_id}>
                    <TableCell>{t.therapy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.sponsor || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {t.phase?.replace("PHASE", "Phase ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {sections.momentum_rankings && summary.rankings.length > 0 && (
        <Card>
          <CardHeader>
            <SectionHeaderRow
              title={titles.momentum_rankings || "Competitive momentum"}
              subtitle="PoS and filing-year estimates are MVP heuristics, not validated forecasts."
              action={
                topRanking && onDraftMemo ? (
                  <Button variant="outline" size="xs" onClick={() => onDraftMemo(topRanking.name)}>
                    <FileText className="h-3.5 w-3.5" />
                    BD memo
                  </Button>
                ) : null
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.rankings.slice(0, 5).map((r, i) => (
              <div
                key={r.name}
                className="flex flex-col gap-2 rounded-lg border border-border/40 p-3 text-sm sm:flex-row sm:items-center sm:gap-4 sm:border-0 sm:p-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 font-medium sm:font-normal">{r.name}</span>
                  <span className="shrink-0 font-mono text-xs text-primary sm:w-12 sm:text-right">
                    {r.momentum_score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pl-7 text-xs text-muted-foreground sm:pl-0">
                  <span>{r.phase?.replace("PHASE", "Ph ")}</span>
                  <span>{r.trial_count} trials</span>
                  <span>PoS {r.pos_percent}%</span>
                  <span>Filing ~{r.estimated_filing_year}</span>
                </div>
              </div>
            ))}

            {topRanking && (leadMemoLoading || leadMemo?.content) ? (
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  BD memo · {topRanking.name}
                </p>
                {leadMemoLoading && !leadMemo?.content ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4 text-primary" />
                    Drafting BD memo…
                  </div>
                ) : leadMemo?.content ? (
                  <GeneratedTextBlock text={leadMemo.content} />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
});
