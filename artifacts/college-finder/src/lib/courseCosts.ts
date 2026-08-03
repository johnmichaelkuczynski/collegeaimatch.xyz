/**
 * Deterministic course cost model — Zhi Systems rate card.
 * Source: empirically verified Fresno State Developmental Math benchmark.
 *
 * Every constant is set to the LOW end of a defensible range.
 * Always round DOWN to the nearest $5,000 — never overstate the college's spend.
 */

// ── Tunable constants ────────────────────────────────────────────────────────

export const COST_PER_STUDENT_COMMUNITY = 150;   // $/student, community-college adjunct (~$4,500/section ÷ 30)
export const COST_PER_STUDENT_UNIVERSITY = 300;  // $/student, 4-year (FT faculty + benefits)
export const DROPOUT_SHARE              = 0.25;  // share of failers who leave entirely (conservative)
export const LOST_REVENUE_PER_DROPOUT   = 3_000; // $ per dropout (~1 yr in-district tuition; deliberately low)
export const ZHI_ANNUAL_LICENSE         = 18_000;// $/yr flat — no per-seat metering
export const ZHI_ONE_TIME_SETUP         = 85_000;// $ one-time Canvas integration + courseware build

// ── Helper ───────────────────────────────────────────────────────────────────

/** Round DOWN to the nearest $5,000 — per spec, always err low. */
const roundDown5k = (n: number): number => Math.floor(n / 5_000) * 5_000;

// ── Main export ──────────────────────────────────────────────────────────────

export interface CourseCostEstimate {
  /** (1) What the college pays to deliver the course — instructor pay only. */
  directCost: number;
  /** (2) Ballpark full burden: direct + one retake cycle + dropout revenue loss. */
  totalCost: number;
  /** (3) Zhi annual license — flat, no per-seat. */
  zhiAnnual: number;
  /** One-time setup fee — shown separately, not in the annual comparison. */
  zhiSetup: number;
}

/**
 * @param enrollment   Total headcount in the course (e.g. 750)
 * @param failRate     Decimal 0–1 (e.g. 0.40 for 40 %)
 * @param isCommunity  true → community-college rates; false → 4-year university rates
 */
export function estimateCourseCosts(
  enrollment: number,
  failRate: number,
  isCommunity: boolean
): CourseCostEstimate {
  const costPerStudent = isCommunity
    ? COST_PER_STUDENT_COMMUNITY
    : COST_PER_STUDENT_UNIVERSITY;

  const directCost  = enrollment * costPerStudent;
  const retakeCost  = directCost * (1 + failRate);          // one retake cycle
  const dropouts    = enrollment * failRate * DROPOUT_SHARE;
  const lostRevenue = dropouts * LOST_REVENUE_PER_DROPOUT;
  const totalCost   = retakeCost + lostRevenue;

  return {
    directCost: roundDown5k(directCost),
    totalCost:  roundDown5k(totalCost),
    zhiAnnual:  ZHI_ANNUAL_LICENSE,
    zhiSetup:   ZHI_ONE_TIME_SETUP,
  };
}

/** Map a raw college `type` string to community-college boolean. */
export function isCommunityCollege(collegeType: string): boolean {
  const t = collegeType.toLowerCase();
  return t.includes("community") || t.includes("junior") || t.includes("technical");
}
