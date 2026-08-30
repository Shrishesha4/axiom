export const APP_TIPS = [
  "Drag panel edges to resize your workspace.",
  "Ask follow-up questions in the agent panel after results load.",
  "Click a source to browse live ClinicalTrials.gov, PubMed, and openFDA data.",
  "Open Briefing for an executive summary you can export.",
  "Try asking which mechanisms look underserved in your therapeutic area.",
  "Use debate mode to stress-test a therapy hypothesis.",
  "Draft a memo on any therapy directly from the dashboard.",
  "Press ⌘K on home to jump straight to search.",
] as const;

export const SCIENCE_FACTS = [
  "The human genome has about 20,000 protein-coding genes — fewer than an onion.",
  "ClinicalTrials.gov lists more than 500,000 studies worldwide.",
  "Phase III trials typically enroll hundreds to thousands of participants.",
  "PubMed indexes over 35 million biomedical citations.",
  "RNA therapeutics went from concept to widespread use in under a decade.",
  "OpenFDA adverse event reports help surface real-world safety signals.",
] as const;

const APOD_CACHE_KEY = "axiom-apod-cache";

export interface ApodCache {
  title: string;
  explanation: string;
  mediaUrl: string;
  copyright?: string;
  date: string;
}

export function pickTip(seed?: number) {
  const index =
    seed !== undefined ? seed % APP_TIPS.length : Math.floor(Math.random() * APP_TIPS.length);
  return APP_TIPS[index];
}

export function pickFact(seed?: number) {
  const index =
    seed !== undefined ? seed % SCIENCE_FACTS.length : Math.floor(Math.random() * SCIENCE_FACTS.length);
  return SCIENCE_FACTS[index];
}

export function readCachedApod(): ApodCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(APOD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApodCache;
    return parsed.date === new Date().toISOString().slice(0, 10) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedApod(apod: ApodCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(APOD_CACHE_KEY, JSON.stringify(apod));
  } catch {
    // ignore quota errors
  }
}

export async function fetchApod(): Promise<ApodCache> {
  const cached = readCachedApod();
  if (cached) return cached;

  const res = await fetch("/api/apod");
  if (!res.ok) throw new Error("APOD fetch failed");
  const data = (await res.json()) as ApodCache;
  writeCachedApod(data);
  return data;
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image preload failed"));
    img.src = url;
  });
}
