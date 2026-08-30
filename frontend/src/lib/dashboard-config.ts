import type { InvestigationSummary } from "@/lib/api";

export type DashboardKpi = { label: string; value: string | number };
export type DashboardSections = {
  market_signal: boolean;
  competitive_matrix: boolean;
  phase_chart: boolean;
  mechanism_chart: boolean;
  whitespace: boolean;
  trials_table: boolean;
  momentum_rankings: boolean;
};

export type DashboardConfig = {
  intent: string;
  title: string;
  subtitle: string;
  kpis: DashboardKpi[];
  sections: DashboardSections;
  section_titles: Record<string, string>;
};

function topMechanism(mechanismDist: Record<string, number>): [string, number] {
  const entries = Object.entries(mechanismDist);
  if (!entries.length) return ["Other", 0];
  return entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
}

function meaningfulMechanisms(mechanismDist: Record<string, number>): number {
  return Object.entries(mechanismDist).filter(
    ([name, count]) => name !== "Other" && count > 0,
  ).length;
}

export function classifyIntent(query: string): string {
  const q = query.toLowerCase();
  if (/white.?space|underserved|underexploited|under-served|unmet need|\bgap\b/.test(q)) {
    return "whitespace";
  }
  if (/adverse event|safety|openfda|faers|side effect|tolerability/.test(q)) {
    return "safety";
  }
  if (/momentum|rank|leading|top therap|fastest/.test(q)) return "momentum";
  if (/timeline|filing|probability of success|pos |approval|launch|regulatory/.test(q)) {
    return "timeline";
  }
  if (/compare|versus| vs |crowded|emerging mechanism/.test(q)) return "mechanism_compare";
  if (/publication|pubmed|literature|evidence/.test(q)) return "publications";
  if (/debate|investment|portfolio|prioritize/.test(q)) return "investment";
  return "landscape";
}

function buildFallbackDashboard(
  summary: InvestigationSummary,
  query: string,
  intent: string,
): DashboardConfig {
  const landscape = summary.landscape;
  const condition = summary.condition || query;
  const rankings = summary.rankings;
  const opportunities = summary.opportunities;
  const matrix = summary.matrix;
  const mechanismDist = landscape.mechanism_distribution || {};
  const total = landscape.total_trials || 0;
  const companies = landscape.total_companies || 0;
  const phaseIii = landscape.phase_iii_count || 0;
  const emerging = landscape.emerging_therapies || 0;
  const [topMech] = topMechanism(mechanismDist);
  const lead = rankings[0];
  const topOpp = opportunities[0];

  const intentTitles: Record<string, string> = {
    whitespace: `White-space scan · ${condition}`,
    safety: `Safety lens · ${condition}`,
    momentum: `Momentum ranking · ${condition}`,
    timeline: `Filing timeline view · ${condition}`,
    mechanism_compare: `Mechanism comparison · ${condition}`,
    publications: `Evidence map · ${condition}`,
    investment: `Investment view · ${condition}`,
    landscape: `Competitive landscape · ${condition}`,
  };

  let subtitle = query.trim().replace(/\s+/g, " ");
  if (subtitle.length > 140) subtitle = `${subtitle.slice(0, 137)}…`;

  let kpis: DashboardKpi[];
  if (intent === "whitespace") {
    kpis = [
      { label: "Trials scanned", value: total },
      { label: "Mechanisms", value: Object.keys(mechanismDist).length },
      { label: "Top opportunity", value: topOpp?.opportunity_score ?? "—" },
      { label: "Underserved lead", value: topOpp?.mechanism ?? "—" },
    ];
  } else if (intent === "momentum") {
    kpis = [
      { label: "Active trials", value: total },
      { label: "Therapies ranked", value: rankings.length },
      { label: "Lead momentum", value: lead?.momentum_score ?? "—" },
      { label: "Lead therapy", value: lead?.name ?? "—" },
    ];
  } else if (intent === "timeline") {
    kpis = [
      { label: "Trials tracked", value: total },
      { label: "Phase III", value: phaseIii },
      { label: "Nearest filing", value: lead?.estimated_filing_year ?? "—" },
      { label: "Lead PoS", value: lead ? `${lead.pos_percent}%` : "—" },
    ];
  } else if (intent === "safety") {
    kpis = [
      { label: "Trials in scope", value: total },
      { label: "Therapies", value: landscape.total_therapies ?? 0 },
      { label: "Companies", value: companies },
      { label: "Dominant class", value: topMech },
    ];
  } else {
    kpis = [
      { label: "Active trials", value: total },
      { label: "Companies", value: companies },
      { label: "Phase III", value: phaseIii },
      { label: "Emerging assets", value: emerging },
    ];
  }

  const showMatrix = matrix.length > 0 && intent !== "publications";
  const showPhases =
    Object.keys(landscape.phase_distribution || {}).length > 0 &&
    intent !== "safety" &&
    intent !== "publications";
  const showMechanisms = meaningfulMechanisms(mechanismDist) > 0 || Object.keys(mechanismDist).length > 0;
  const showWhitespace =
    opportunities.length > 0 &&
    ["whitespace", "landscape", "mechanism_compare", "investment"].includes(intent);
  const showMomentum =
    rankings.length > 0 &&
    ["momentum", "timeline", "landscape", "investment", "mechanism_compare"].includes(intent);
  const showTrials = total > 0;

  const marketSignalTitles: Record<string, string> = {
    whitespace: "White-space insight",
    momentum: "Momentum takeaway",
    timeline: "Timeline takeaway",
    safety: "Safety framing",
    mechanism_compare: "Comparison insight",
  };
  const matrixTitles: Record<string, string> = {
    whitespace: "Density vs. differentiation",
    mechanism_compare: "Mechanism positioning map",
    momentum: "Competitive positioning",
  };
  const momentumTitles: Record<string, string> = {
    timeline: "Filing & momentum leaders",
    momentum: "Top therapies by momentum",
  };

  return {
    intent,
    title: intentTitles[intent] || intentTitles.landscape,
    subtitle,
    kpis,
    sections: {
      market_signal: true,
      competitive_matrix: showMatrix,
      phase_chart: showPhases,
      mechanism_chart: showMechanisms,
      whitespace: showWhitespace,
      trials_table: showTrials,
      momentum_rankings: showMomentum,
    },
    section_titles: {
      market_signal: marketSignalTitles[intent] || "Market signal",
      competitive_matrix: matrixTitles[intent] || "Competitive landscape",
      phase_chart: "Trial phases in scope",
      mechanism_chart: `Mechanisms in ${condition}`,
      whitespace: `Underserved mechanisms · ${condition}`,
      trials_table: `Trials driving this view · ${condition}`,
      momentum_rankings: momentumTitles[intent] || "Competitive momentum",
    },
  };
}

export function resolveDashboardConfig(
  summary: InvestigationSummary,
  query: string,
): DashboardConfig {
  if (summary.dashboard) {
    return summary.dashboard;
  }

  const intent = summary.intent || classifyIntent(query);
  return buildFallbackDashboard(summary, query, intent);
}

export const INTENT_LABELS: Record<string, string> = {
  landscape: "Landscape",
  whitespace: "White-space",
  safety: "Safety",
  momentum: "Momentum",
  timeline: "Timelines",
  mechanism_compare: "Mechanism compare",
  publications: "Publications",
  investment: "Investment",
};
