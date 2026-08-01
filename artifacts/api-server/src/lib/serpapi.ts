import { logger } from "./logger";

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    logger.warn("SERPAPI_KEY not set — returning empty search results");
    return [];
  }

  const qs = new URLSearchParams({
    q: query,
    api_key: apiKey,
    num: "10",
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
