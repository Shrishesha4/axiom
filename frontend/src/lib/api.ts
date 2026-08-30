import { authHeaders, handleSessionExpired } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      handleSessionExpired();
    }
    throw new Error("Session expired");
  }
  return res;
}

export interface Investigation {
  id: number;
  query: string;
  status: string;
  created_at: string;
}

export interface AgentTraceStep {
  id?: number;
  step: string;
  status: string;
  message: string;
  timestamp?: string;
}

export interface InvestigationDetail extends Investigation {
  summary?: InvestigationSummary;
  followups?: FollowUp[];
  debate?: DebateResult;
  memos?: Record<string, MemoEntry>;
  traces?: AgentTraceStep[];
}

export interface DebateResult {
  bull: string;
  bear: string;
  synthesis: string;
  created_at: string;
}

export interface MemoEntry {
  therapy_name: string;
  content: string;
  created_at: string;
}

export interface FollowUp {
  id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface InvestigationSummary {
  condition?: string;
  query?: string;
  intent?: string;
  dashboard?: {
    intent: string;
    title: string;
    subtitle: string;
    kpis: { label: string; value: string | number }[];
    sections: {
      market_signal: boolean;
      competitive_matrix: boolean;
      phase_chart: boolean;
      mechanism_chart: boolean;
      whitespace: boolean;
      trials_table: boolean;
      momentum_rankings: boolean;
    };
    section_titles: Record<string, string>;
  };
  landscape: {
    total_trials: number;
    total_companies: number;
    total_therapies: number;
    phase_iii_count: number;
    emerging_therapies: number;
    phase_distribution: Record<string, number>;
    mechanism_distribution: Record<string, number>;
  };
  rankings: TherapyRanking[];
  matrix: MatrixPoint[];
  signals: Signal[];
  opportunities: WhitespaceOpportunity[];
  trials: Trial[];
  market_signal: string;
}

export interface WhitespaceOpportunity {
  mechanism: string;
  trial_count: number;
  density_pct: number;
  differentiation_score: number;
  is_emerging: boolean;
  opportunity_score: number;
  rationale: string;
}

export interface TherapyRanking {
  name: string;
  mechanism: string;
  momentum_score: number;
  trial_count: number;
  publication_count: number;
  active_trials: number;
  phase: string;
  fda_approved: boolean;
  company: string | null;
  pos_percent: number;
  estimated_years_to_filing: number;
  estimated_filing_year: number;
  forecast_basis: string;
}

export interface MatrixPoint {
  name: string;
  mechanism: string;
  maturity: number;
  differentiation: number;
  momentum_score: number;
  trial_count: number;
}

export interface Signal {
  id: number;
  title: string;
  description: string;
}

export interface Trial {
  nct_id: string;
  title: string;
  phase: string;
  status: string;
  enrollment: number | null;
  therapy: string | null;
  sponsor: string | null;
}

export type SourceKey = "clinical-trials" | "pubmed" | "openfda";

export interface Publication {
  pmid: string;
  title: string;
  abstract: string;
  pub_date: string;
  therapy?: string;
}

export interface SafetyEvent {
  reaction: string;
  count: number;
}

export interface SafetyProfile {
  therapy: string;
  events: SafetyEvent[];
  total_reports: number;
}

export type SourceData =
  | { key: "clinical-trials"; source: string; count: number; trials: Trial[] }
  | { key: "pubmed"; source: string; count: number; publications: Publication[] }
  | { key: "openfda"; source: string; count: number; profiles: SafetyProfile[] };

export interface TraceEvent {
  type: "trace" | "complete";
  step?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  data?: InvestigationSummary;
}

export async function listInvestigations(): Promise<Investigation[]> {
  const res = await apiFetch("/api/investigations");
  if (!res.ok) throw new Error("Failed to fetch investigations");
  return res.json();
}

function parseApiErrorDetail(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : ""))
      .filter(Boolean)
      .join(", ") || fallback;
  }
  return fallback;
}

export async function updateInvestigation(
  id: number,
  query: string
): Promise<Investigation> {
  const res = await apiFetch(`/api/investigations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiErrorDetail(err, "Failed to rename session"));
  }
  return res.json();
}

export async function deleteInvestigation(id: number): Promise<void> {
  const res = await apiFetch(`/api/investigations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiErrorDetail(err, "Failed to delete session"));
  }
}

export async function createInvestigation(query: string): Promise<Investigation> {
  const res = await apiFetch("/api/investigations", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create investigation");
  }
  return res.json();
}

export async function getInvestigation(id: number): Promise<InvestigationDetail> {
  const res = await apiFetch(`/api/investigations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch investigation");
  return res.json();
}

export function streamInvestigation(
  id: number,
  onEvent: (event: TraceEvent) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("axiom_token") : null;
  const url = new URL(`${API_URL}/api/investigations/${id}/stream`);
  if (token) url.searchParams.set("token", token);

  const eventSource = new EventSource(url.toString(), { withCredentials: false });

  const dispatch = (event: TraceEvent) => {
    if (event.type === "complete") {
      // Defer heavy summary parsing/rendering so the UI stays responsive.
      window.setTimeout(() => onEvent(event), 0);
      eventSource.close();
      onComplete();
      return;
    }
    onEvent(event);
  };

  eventSource.onmessage = (e) => {
    try {
      const event: TraceEvent = JSON.parse(e.data);
      dispatch(event);
    } catch (err) {
      onError(err as Error);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError(new Error("Stream connection failed"));
  };

  return () => eventSource.close();
}

export async function explainSignals(id: number): Promise<ReadableStream<Uint8Array> | null> {
  const res = await apiFetch(`/api/investigations/${id}/explain-signals`, {
    method: "POST",
  });
  if (!res.ok || !res.body) return null;
  return res.body;
}

export type FollowUpStreamEvent =
  | { type: "delta"; content: string }
  | { type: "tool"; step: string; message: string; status?: "running" | "complete" }
  | { type: "done" }
  | { type: "error"; message: string };

export async function streamAskFollowup(
  id: number,
  question: string,
  onEvent: (event: FollowUpStreamEvent) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): Promise<void> {
  const res = await apiFetch(`/api/investigations/${id}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onError(new Error(err.detail || "Failed to send follow-up"));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as FollowUpStreamEvent;
          onEvent(event);
          if (event.type === "delta") {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 0);
            });
          }
          if (event.type === "done") {
            onComplete();
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream failed"));
  }
}

export type DebateStreamEvent =
  | { type: "delta"; side: "bull" | "bear" | "synthesis"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function streamDebate(
  id: number,
  onEvent: (event: DebateStreamEvent) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): Promise<void> {
  const res = await apiFetch(`/api/investigations/${id}/debate`, { method: "POST" });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onError(new Error(err.detail || "Failed to start debate"));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as DebateStreamEvent;
          onEvent(event);
          if (event.type === "done") {
            onComplete();
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream failed"));
  }
}

export type MemoStreamEvent =
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function streamDraftMemo(
  investigationId: number,
  therapyName: string,
  onEvent: (event: MemoStreamEvent) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): Promise<void> {
  const res = await apiFetch(`/api/investigations/${investigationId}/memo`, {
    method: "POST",
    body: JSON.stringify({ therapy_name: therapyName }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onError(new Error(err.detail || "Failed to draft memo"));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as MemoStreamEvent;
          onEvent(event);
          if (event.type === "done") {
            onComplete();
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream failed"));
  }
}

export async function getBriefing(id: number): Promise<string> {
  const res = await apiFetch(`/api/investigations/${id}/briefing`);
  if (!res.ok) throw new Error("Failed to fetch briefing");
  const data = await res.json();
  return data.briefing;
}

export interface PortfolioItem {
  id: number;
  query: string;
  condition: string | null;
  created_at: string;
  total_trials: number;
  total_companies: number;
  phase_iii_count: number;
  emerging_therapies: number;
  top_therapy: string | null;
  top_mechanism: string | null;
  top_momentum_score: number | null;
  signal_count: number;
}

export interface PortfolioRollup {
  investigation_count: number;
  distinct_conditions: number;
  total_trials_tracked: number;
  total_phase_iii: number;
  avg_top_momentum_score: number | null;
}

export async function getPortfolio(): Promise<{
  investigations: PortfolioItem[];
  rollup: PortfolioRollup;
}> {
  const res = await apiFetch("/api/investigations/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export async function getSourceData(
  investigationId: number,
  sourceKey: SourceKey
): Promise<SourceData> {
  const res = await apiFetch(`/api/investigations/${investigationId}/sources/${sourceKey}`);
  if (!res.ok) throw new Error("Failed to fetch source data");
  const data = await res.json();
  return { key: sourceKey, ...data };
}

export async function updateProfile(name: string): Promise<import("@/lib/auth").AuthUser> {
  const res = await apiFetch("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await apiFetch("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to change password");
  }
}

export async function uploadAvatar(file: File): Promise<import("@/lib/auth").AuthUser> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/auth/avatar`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      handleSessionExpired();
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload avatar");
  }
  return res.json();
}

export async function removeAvatar(): Promise<import("@/lib/auth").AuthUser> {
  const res = await apiFetch("/api/auth/avatar", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to remove avatar");
  }
  return res.json();
}

export async function deleteAccount(password: string): Promise<void> {
  const res = await apiFetch("/api/auth/me", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete account");
  }
}
