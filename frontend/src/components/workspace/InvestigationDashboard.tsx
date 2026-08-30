"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import type { InvestigationSummary } from "@/lib/api";
import { INTENT_LABELS, resolveDashboardConfig } from "@/lib/dashboard-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface InvestigationDashboardProps {
  summary: InvestigationSummary;
  query: string;
  highlightMechanism: string | null;
  onHighlight?: (mechanism: string | null) => void;
  onDraftMemo?: (therapyName: string) => void;
}

export const InvestigationDashboard = memo(function InvestigationDashboard({
  summary,
  query,
  highlightMechanism,
  onHighlight,
  onDraftMemo,
}: InvestigationDashboardProps) {
  const landscape = summary.landscape;
  const dashboard = resolveDashboardConfig(summary, query);
  const titles = dashboard.section_titles;
  const sections = dashboard.sections;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-primary/30 text-primary capitalize">
            {INTENT_LABELS[dashboard.intent] || dashboard.intent}
          </Badge>
        </div>
        <h2 className="text-lg font-medium tracking-wide">{dashboard.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
              {titles.market_signal || "Market signal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{summary.market_signal}</p>
          </CardContent>
        </Card>
      )}

      {sections.competitive_matrix && summary.matrix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
              {titles.competitive_matrix || "Competitive landscape"}
            </CardTitle>
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
                <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
                  {titles.phase_chart || "Trial phases"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseChart data={landscape.phase_distribution} />
              </CardContent>
            </Card>
          )}
          {sections.mechanism_chart && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
                  {titles.mechanism_chart || "Mechanisms"}
                </CardTitle>
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
            <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
              {titles.whitespace || "White-space opportunities"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.opportunities.map((o) => (
              <button
                key={o.mechanism}
                type="button"
                onClick={() => onHighlight?.(highlightMechanism === o.mechanism ? null : o.mechanism)}
                className="-mx-2 w-full rounded-md p-2 text-left transition-colors hover:bg-muted/50"
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
                <p className="mt-1 pl-4 text-xs text-muted-foreground">{o.rationale}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {sections.trials_table && summary.trials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
              {titles.trials_table || "Clinical trials"}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            <CardTitle className="text-xs font-normal uppercase tracking-widest text-muted-foreground">
              {titles.momentum_rankings || "Competitive momentum"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground/70">
              PoS and filing-year estimates are MVP heuristics, not validated forecasts.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.rankings.slice(0, 5).map((r, i) => (
              <div key={r.name} className="flex items-center gap-4 text-sm">
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.phase?.replace("PHASE", "Ph ")}
                </span>
                <span className="text-xs text-muted-foreground">{r.trial_count} trials</span>
                <span className="text-xs text-muted-foreground">PoS {r.pos_percent}%</span>
                <span className="text-xs text-muted-foreground">
                  Filing ~{r.estimated_filing_year}
                </span>
                <span className="w-12 text-right font-mono text-xs text-primary">
                  {r.momentum_score}
                </span>
                {onDraftMemo && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Draft BD memo"
                    onClick={() => onDraftMemo(r.name)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
});
