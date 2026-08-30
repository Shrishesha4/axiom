const CHART_TEAL = "#0891b2";
const CHART_SLATE = ["#475569", "#64748b", "#94a3b8", "#334155", "#1e293b", "#cbd5e1"];

export const MECHANISM_COLORS: Record<string, string> = {
  Amyloid: CHART_TEAL,
  Tau: CHART_SLATE[0],
  Neuroinflammation: CHART_SLATE[1],
  "GLP-1": CHART_SLATE[2],
  "NMDA antagonist": CHART_SLATE[3],
  "Cholinesterase inhibitor": CHART_SLATE[4],
  Other: CHART_SLATE[5],
};

export const PHASE_COLORS: Record<string, string> = {
  PHASE1: CHART_SLATE[4],
  PHASE2: CHART_SLATE[1],
  PHASE3: CHART_TEAL,
  PHASE4: CHART_SLATE[0],
  UNKNOWN: CHART_SLATE[5],
};

export const MECHANISM_CHART_COLORS = [
  CHART_TEAL,
  CHART_SLATE[0],
  CHART_SLATE[1],
  CHART_SLATE[2],
  CHART_SLATE[3],
  CHART_SLATE[4],
  CHART_SLATE[5],
];
