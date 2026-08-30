export type ExtractedLink = {
  label: string;
  url: string;
};

function linkLabel(label: string, url: string): string {
  const trimmed = label.trim();
  if (trimmed) return trimmed;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function addLink(links: ExtractedLink[], seen: Set<string>, label: string, url: string) {
  const normalized = url.trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  links.push({ label: linkLabel(label, normalized), url: normalized });
}

export function extractLinks(text: string): { body: string; links: ExtractedLink[] } {
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  let body = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
    addLink(links, seen, label, url);
    return label;
  });

  body = body.replace(/(?<![(\[])(https?:\/\/[^\s)]+)/g, (url) => {
    addLink(links, seen, url, url);
    return url;
  });

  return { body: body.trim(), links };
}
