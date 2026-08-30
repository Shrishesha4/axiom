"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import type { InvestigationSummary } from "@/lib/api";
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium tracking-wide">{summary.condition || query}</h2>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Active Trials", value: landscape.total_trials },
          { label: "Companies", value: landscape.total_companies },
          { label: "Phase III", value: landscape.phase_iii_count },
          { label: "Emerging", value: landscape.emerging_therapies },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <CardContent className="pt-4">
              <p className="text-2xl font-light text-primary">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
            Market signal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{summary.market_signal}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
            Competitive landscape
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompetitiveBubbleChart data={summary.matrix} highlightMechanism={highlightMechanism} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
              Trial phases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PhaseChart data={landscape.phase_distribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
              Mechanisms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MechanismChart data={landscape.mechanism_distribution} />
          </CardContent>
        </Card>
      </div>

      {summary.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
              White-space opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.opportunities.map((o) => (
              <button
                key={o.mechanism}
                type="button"
                onClick={() => onHighlight?.(highlightMechanism === o.mechanism ? null : o.mechanism)}
                className="w-full text-left rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: MECHANISM_COLORS[o.mechanism] || MECHANISM_COLORS.Other }}
                  />
                  <span className="text-sm flex-1">{o.mechanism}</span>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {o.opportunity_score}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-4">{o.rationale}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
            Clinical trials
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
                    <Badge variant="outline" className="text-primary border-primary/30">
                      {t.phase?.replace("PHASE", "Phase ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{t.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {summary.rankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal">
              Competitive momentum
            </CardTitle>
            <p className="text-[11px] text-muted-foreground/70">
              PoS and filing-year estimates are MVP heuristics, not validated forecasts.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.rankings.slice(0, 5).map((r, i) => (
              <div key={r.name} className="flex items-center gap-4 text-sm">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="flex-1">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.phase?.replace("PHASE", "Ph ")}
                </span>
                <span className="text-xs text-muted-foreground">{r.trial_count} trials</span>
                <span className="text-xs text-muted-foreground">PoS {r.pos_percent}%</span>
                <span className="text-xs text-muted-foreground">
                  Filing ~{r.estimated_filing_year}
                </span>
                <span className="text-xs text-primary font-mono w-12 text-right">
                  {r.momentum_score}
                </span>
                {onDraftMemo && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Draft BD memo"
                    onClick={() => onDraftMemo(r.name)}
                  >
                    <FileText className="w-3.5 h-3.5" />
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
