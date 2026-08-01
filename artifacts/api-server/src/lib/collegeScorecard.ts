import { logger } from "./logger";

const API_BASE = "https://api.data.ed.gov/student/v1/schools";

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.ownership",
  "school.carnegie_basic",
  "school.locale",
  "latest.student.size",
  "latest.completion.rate_suppressed.overall",
  "latest.student.retention_rate.overall.full_time",
  "latest.repayment.1_yr_repayment.completers.rate",
  "latest.repayment.3_yr_repayment.completers.rate",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.aid.median_debt.completers.overall",
].join(",");

export interface ScorecardCollege {
  id: number;
  name: string;
  city: string;
  state: string;
  url: string | null;
  ownership: number; // 1=public, 2=private nonprofit, 3=for-profit
  carnegieBasic: number;
  enrollmentSize: number;
  completionRate: number | null;
  retentionRate: number | null;
  repayment1yr: number | null;
  repayment3yr: number | null;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  medianDebt: number | null;
}

// Map Carnegie Basic + ownership to institution type
export function carnegieToType(
  ownership: number,
  carnegieBasic: number,
  size: number
): string {
  if (ownership === 3) return "for_profit";
  if ([1, 2, 16, 31, 32, 33, 34].includes(carnegieBasic))
    return "community_college";
  if ([23].includes(carnegieBasic)) return "specialty"; // Health professions
  if ([24].includes(carnegieBasic)) return "technical"; // Engineering/Technology
  if ([25, 26, 27, 28, 29].includes(carnegieBasic)) return "specialty";
  if ([14, 15, 18].includes(carnegieBasic)) return "university"; // Grad-focused
  if (carnegieBasic >= 3 && carnegieBasic <= 12) {
    // Small (3-5), Medium (6-8), Large (9-12)
    if (carnegieBasic <= 5) return size < 3000 ? "lower_tier" : "four_year";
    if (carnegieBasic <= 8) return "four_year";
    return "university";
  }
  return "four_year";
}

function parseCollege(raw: Record<string, unknown>): ScorecardCollege {
  return {
    id: raw["id"] as number,
    name: (raw["school.name"] as string) ?? "Unknown",
    city: (raw["school.city"] as string) ?? "",
    state: (raw["school.state"] as string) ?? "",
    url: (raw["school.school_url"] as string | null) ?? null,
    ownership: (raw["school.ownership"] as number) ?? 1,
    carnegieBasic: (raw["school.carnegie_basic"] as number) ?? 0,
    enrollmentSize: (raw["latest.student.size"] as number) ?? 0,
    completionRate:
      (raw["latest.completion.rate_suppressed.overall"] as number | null) ??
      null,
    retentionRate:
      (raw[
        "latest.student.retention_rate.overall.full_time"
      ] as number | null) ?? null,
    repayment1yr:
      (raw[
        "latest.repayment.1_yr_repayment.completers.rate"
      ] as number | null) ?? null,
    repayment3yr:
      (raw[
        "latest.repayment.3_yr_repayment.completers.rate"
      ] as number | null) ?? null,
    tuitionInState:
      (raw["latest.cost.tuition.in_state"] as number | null) ?? null,
    tuitionOutOfState:
      (raw["latest.cost.tuition.out_of_state"] as number | null) ?? null,
    medianDebt:
      (raw["latest.aid.median_debt.completers.overall"] as number | null) ??
      null,
  };
}

export interface ScorecardSearchParams {
  query?: string;
  state?: string;
  type?: string;
  maxDropoutRate?: number;
  minDropoutRate?: number;
  maxGraduationYears?: number;
  maxDebtPayoffYears?: number;
  page?: number;
  limit?: number;
}

export async function searchScorecardColleges(
  params: ScorecardSearchParams
): Promise<{ colleges: ScorecardCollege[]; total: number }> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!apiKey) throw new Error("COLLEGE_SCORECARD_API_KEY not set");

  const qs = new URLSearchParams();
  qs.set("api_key", apiKey);
  qs.set("fields", FIELDS);
  qs.set("per_page", String(Math.min(params.limit ?? 20, 100)));
  qs.set("page", String(Math.max((params.page ?? 1) - 1, 0)));

  if (params.query) qs.set("school.name", params.query);
  if (params.state) qs.set("school.state", params.state.toUpperCase());

  // Type filters
  if (params.type) {
    switch (params.type) {
      case "community_college":
        qs.set("school.carnegie_basic__range", "1..2");
        break;
      case "for_profit":
        qs.set("school.ownership", "3");
        break;
      case "technical":
        qs.set("school.carnegie_basic", "24");
        break;
      case "specialty":
        qs.set("school.carnegie_basic__range", "23..29");
        break;
      case "university":
        qs.set("school.carnegie_basic__range", "9..18");
        break;
      case "four_year":
        qs.set("school.carnegie_basic__range", "3..12");
        break;
      case "lower_tier":
        qs.set("school.carnegie_basic__range", "3..5");
        break;
    }
  }

  // Dropout rate filter: dropout = 1 - completion_rate
  if (params.maxDropoutRate !== undefined) {
    const minCompletion = 1 - params.maxDropoutRate / 100;
    qs.set(
      "latest.completion.rate_suppressed.overall__range",
      `${minCompletion.toFixed(3)}..1`
    );
  }
  if (params.minDropoutRate !== undefined) {
    const maxCompletion = 1 - params.minDropoutRate / 100;
    qs.set(
      "latest.completion.rate_suppressed.overall__range",
      `0..${maxCompletion.toFixed(3)}`
    );
  }

  const url = `${API_BASE}?${qs.toString()}`;
  logger.debug({ url: url.replace(apiKey, "***") }, "Scorecard API request");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scorecard API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    metadata: { total: number };
    results: Record<string, unknown>[];
  };

  return {
    colleges: (json.results ?? []).map(parseCollege),
    total: json.metadata?.total ?? 0,
  };
}

export async function getScorecardCollege(
  id: string
): Promise<ScorecardCollege | null> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!apiKey) throw new Error("COLLEGE_SCORECARD_API_KEY not set");

  const qs = new URLSearchParams();
  qs.set("api_key", apiKey);
  qs.set("fields", FIELDS);
  qs.set("id", id);

  const url = `${API_BASE}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = (await res.json()) as {
    results: Record<string, unknown>[];
  };
  if (!json.results?.length) return null;
  return parseCollege(json.results[0]);
}
