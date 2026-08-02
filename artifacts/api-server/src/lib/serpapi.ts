import { logger } from "./logger";

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export async function webSearch(
  query: string,
  num = 10
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    logger.warn("SERPAPI_KEY not set — returning empty search results");
    return [];
  }

  const qs = new URLSearchParams({
    q: query,
    api_key: apiKey,
    num: String(num),
    engine: "google",
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${qs.toString()}`);
    if (!res.ok) {
      logger.warn({ status: res.status }, "SerpAPI request failed");
      return [];
    }

    const json = (await res.json()) as {
      organic_results?: Array<{
        title?: string;
        snippet?: string;
        link?: string;
      }>;
    };

    return (json.organic_results ?? []).map((r) => ({
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      link: r.link ?? "",
    }));
  } catch (err) {
    logger.error({ err }, "SerpAPI request threw");
    return [];
  }
}

// ── Real email/phone extraction ────────────────────────────────────────────

export function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  // Filter out social/image placeholders
  return [...new Set(matches)].filter(
    (e) => !e.includes("example") && !e.includes("placeholder")
  );
}

export function extractPhones(text: string): string[] {
  // Match US phone patterns: (555) 123-4567, 555-123-4567, +1 555 123 4567, etc.
  const raw =
    text.match(
      /(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)(?:\d{3}[\s.\-]?\d{4})/g
    ) ?? [];
  return [...new Set(raw)]
    .map((p) => p.trim())
    .filter((p) => {
      // Exclude obvious fake 555-0xxx numbers (those are reserved fiction numbers)
      const digits = p.replace(/\D/g, "");
      return digits.length >= 10 && !digits.slice(3, 6).startsWith("5550");
    });
}

// ── Multi-search college leadership finder ─────────────────────────────────

export interface LeadershipSearchBundle {
  /** Raw text snippets from all searches combined */
  allSnippets: string[];
  /** Real email addresses extracted from snippets */
  realEmails: string[];
  /** Real phone numbers extracted from snippets */
  realPhones: string[];
  /** Likely domain for email construction */
  collegeDomain: string | null;
}

export async function findCollegeLeadership(
  collegeName: string,
  collegeUrl: string | null | undefined
): Promise<LeadershipSearchBundle> {
  // Derive domain from URL
  let collegeDomain: string | null = null;
  if (collegeUrl) {
    try {
      const u = new URL(
        collegeUrl.startsWith("http") ? collegeUrl : `https://${collegeUrl}`
      );
      collegeDomain = u.hostname.replace(/^www\./, "");
    } catch {}
  }

  // 4 parallel targeted searches
  const queries = [
    `"${collegeName}" provost OR president email`,
    `"${collegeName}" "vice president" "academic affairs" OR "dean of instruction" email`,
    `"${collegeName}" "chief information officer" OR "chief academic officer" contact`,
    collegeDomain
      ? `site:${collegeDomain} provost OR president OR "academic affairs"`
      : `"${collegeName}" leadership directory administration contacts`,
  ];

  const results = await Promise.all(queries.map((q) => webSearch(q, 8)));
  const allResults = results.flat();

  const allText = allResults
    .map((r) => `${r.title} ${r.snippet}`)
    .join("\n");

  const allSnippets = allResults
    .map((r) => `[${r.link}] ${r.title}: ${r.snippet}`)
    .filter(Boolean);

  const realEmails = extractEmails(allText).filter((e) =>
    collegeDomain ? e.endsWith(collegeDomain) : true
  );
  const realPhones = extractPhones(allText);

  return { allSnippets, realEmails, realPhones, collegeDomain };
}
