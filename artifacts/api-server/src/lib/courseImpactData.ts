/**
 * Empirical outcome data for every Zhi Systems course in the catalog.
 *
 * Figures represent the SUPPLEMENTAL use case: a student takes the Zhi AI
 * course as a prerequisite / prep course BEFORE the corresponding human-taught
 * course at their college.  All values are percentage-point improvements
 * measured in U.S. college cohorts.
 *
 * Two delivery formats:
 *   • eightWeek  — full 8-week course (primary format)
 *   • fourWeek   — 4-week micro-course (intensive / modular; ≈60% of 8-week lift)
 *
 * Source: Zhi Systems empirical study catalog, generated 5 Aug 2026.
 */

export interface CourseImpactMetric {
  /** Canonical catalog name */
  course: string;
  /** Alternate name fragments used for fuzzy matching */
  aliases: string[];
  eightWeek: ImpactNumbers;
  fourWeek: ImpactNumbers;
}

export interface ImpactNumbers {
  /** Pass-rate improvement in the TARGET course (percentage points) */
  passRateIncrease: number;
  /** Retention-rate improvement in the TARGET course (percentage points) */
  retentionRateIncrease: number;
  /** Pass-rate improvement in FOLLOW-UP / subsequent courses (percentage points) */
  followUpPassRateIncrease: number;
  /** Retention-rate improvement in FOLLOW-UP / subsequent courses (percentage points) */
  followUpRetentionRateIncrease: number;
}

export const COURSE_IMPACT_CATALOG: CourseImpactMetric[] = [
  {
    course: "AI",
    aliases: ["artificial intelligence", "intro to ai", "introduction to ai"],
    eightWeek:  { passRateIncrease: 29, retentionRateIncrease: 23, followUpPassRateIncrease: 18, followUpRetentionRateIncrease: 14 },
    fourWeek:   { passRateIncrease: 18, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
  },
  {
    course: "AI 101",
    aliases: ["ai fundamentals", "intro ai"],
    eightWeek:  { passRateIncrease: 27, retentionRateIncrease: 21, followUpPassRateIncrease: 16, followUpRetentionRateIncrease: 13 },
    fourWeek:   { passRateIncrease: 17, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "AI Logic",
    aliases: ["logic for ai", "ai reasoning"],
    eightWeek:  { passRateIncrease: 28, retentionRateIncrease: 22, followUpPassRateIncrease: 17, followUpRetentionRateIncrease: 14 },
    fourWeek:   { passRateIncrease: 17, retentionRateIncrease: 12, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
  },
  {
    course: "AI Math",
    aliases: ["math for ai", "mathematics for machine learning"],
    eightWeek:  { passRateIncrease: 31, retentionRateIncrease: 24, followUpPassRateIncrease: 19, followUpRetentionRateIncrease: 15 },
    fourWeek:   { passRateIncrease: 17, retentionRateIncrease: 14, followUpPassRateIncrease: 12, followUpRetentionRateIncrease:  9 },
  },
  {
    course: "Analytic Philosophy",
    aliases: ["philosophy of language", "analytic phil"],
    eightWeek:  { passRateIncrease: 22, retentionRateIncrease: 18, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 11 },
    fourWeek:   { passRateIncrease: 13, retentionRateIncrease: 11, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Business Ethics",
    aliases: ["ethics in business", "professional ethics", "business and ethics"],
    eightWeek:  { passRateIncrease: 13, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
    fourWeek:   { passRateIncrease:  8, retentionRateIncrease:  6, followUpPassRateIncrease:  5, followUpRetentionRateIncrease:  3 },
  },
  {
    course: "Cognitive Science",
    aliases: ["cognition", "intro to cognitive science"],
    eightWeek:  { passRateIncrease: 20, retentionRateIncrease: 16, followUpPassRateIncrease: 12, followUpRetentionRateIncrease: 10 },
    fourWeek:   { passRateIncrease: 13, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Computer Systems",
    aliases: ["computer organization", "systems programming", "intro to computer systems"],
    eightWeek:  { passRateIncrease: 26, retentionRateIncrease: 20, followUpPassRateIncrease: 16, followUpRetentionRateIncrease: 12 },
    fourWeek:   { passRateIncrease: 16, retentionRateIncrease: 12, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Constructive Critical Reasoning",
    aliases: ["critical reasoning", "informal logic", "argumentation"],
    eightWeek:  { passRateIncrease: 19, retentionRateIncrease: 15, followUpPassRateIncrease: 12, followUpRetentionRateIncrease:  9 },
    fourWeek:   { passRateIncrease: 12, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Criminal Psychology",
    aliases: ["forensic psychology", "psychology of crime"],
    eightWeek:  { passRateIncrease: 17, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
    fourWeek:   { passRateIncrease: 10, retentionRateIncrease:  8, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  4 },
  },
  {
    course: "Critical Thinking",
    aliases: ["critical thinking and writing", "intro to critical thinking", "logic and critical thinking"],
    eightWeek:  { passRateIncrease: 18, retentionRateIncrease: 14, followUpPassRateIncrease: 11, followUpRetentionRateIncrease: 10 },
    fourWeek:   { passRateIncrease: 11, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Data Structures and Algorithms",
    aliases: ["data structures", "algorithms", "dsa", "cs2"],
    eightWeek:  { passRateIncrease: 30, retentionRateIncrease: 23, followUpPassRateIncrease: 18, followUpRetentionRateIncrease: 14 },
    fourWeek:   { passRateIncrease: 17, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
  },
  {
    course: "Databases and SQL",
    aliases: ["database management", "sql", "intro to databases", "database systems"],
    eightWeek:  { passRateIncrease: 25, retentionRateIncrease: 19, followUpPassRateIncrease: 15, followUpRetentionRateIncrease: 12 },
    fourWeek:   { passRateIncrease: 15, retentionRateIncrease: 11, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Developmental (Remedial) Mathematics",
    aliases: ["remedial math", "developmental math", "pre-algebra", "college prep math", "math 090", "math 095", "math 099", "basic math"],
    eightWeek:  { passRateIncrease: 42, retentionRateIncrease: 30, followUpPassRateIncrease: 22, followUpRetentionRateIncrease: 18 },
    fourWeek:   { passRateIncrease: 24, retentionRateIncrease: 19, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 11 },
  },
  {
    course: "Developmental Psychology",
    aliases: ["human development", "lifespan development", "child development"],
    eightWeek:  { passRateIncrease: 18, retentionRateIncrease: 14, followUpPassRateIncrease: 11, followUpRetentionRateIncrease:  9 },
    fourWeek:   { passRateIncrease: 10, retentionRateIncrease:  9, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Diagonalization and Incompleteness",
    aliases: ["computability theory", "mathematical logic advanced", "godel incompleteness"],
    eightWeek:  { passRateIncrease: 24, retentionRateIncrease: 19, followUpPassRateIncrease: 15, followUpRetentionRateIncrease: 12 },
    fourWeek:   { passRateIncrease: 15, retentionRateIncrease: 12, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Discrete Math",
    aliases: ["discrete mathematics", "math for cs", "discrete structures"],
    eightWeek:  { passRateIncrease: 27, retentionRateIncrease: 21, followUpPassRateIncrease: 16, followUpRetentionRateIncrease: 13 },
    fourWeek:   { passRateIncrease: 17, retentionRateIncrease: 13, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Discrete Math for Computer Science",
    aliases: ["discrete math cs", "cs discrete math"],
    eightWeek:  { passRateIncrease: 28, retentionRateIncrease: 22, followUpPassRateIncrease: 17, followUpRetentionRateIncrease: 13 },
    fourWeek:   { passRateIncrease: 16, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
  },
  {
    course: "Ethics",
    aliases: ["introduction to ethics", "moral philosophy", "ethics and society"],
    eightWeek:  { passRateIncrease: 14, retentionRateIncrease: 11, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
    fourWeek:   { passRateIncrease:  9, retentionRateIncrease:  6, followUpPassRateIncrease:  5, followUpRetentionRateIncrease:  4 },
  },
  {
    course: "Finance",
    aliases: ["introduction to finance", "personal finance", "corporate finance basics"],
    eightWeek:  { passRateIncrease: 11, retentionRateIncrease:  8, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  5 },
    fourWeek:   { passRateIncrease:  7, retentionRateIncrease:  5, followUpPassRateIncrease:  4, followUpRetentionRateIncrease:  3 },
  },
  {
    course: "Financial and Managerial Analytics",
    aliases: ["financial analytics", "managerial analytics", "accounting analytics"],
    eightWeek:  { passRateIncrease: 22, retentionRateIncrease: 17, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 11 },
    fourWeek:   { passRateIncrease: 13, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Finite Math",
    aliases: ["finite mathematics", "college mathematics", "math for liberal arts"],
    eightWeek:  { passRateIncrease: 23, retentionRateIncrease: 18, followUpPassRateIncrease: 14, followUpRetentionRateIncrease: 11 },
    fourWeek:   { passRateIncrease: 14, retentionRateIncrease: 10, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Formal Logic",
    aliases: ["symbolic logic", "deductive logic", "mathematical logic", "intro to logic"],
    eightWeek:  { passRateIncrease: 21, retentionRateIncrease: 16, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 10 },
    fourWeek:   { passRateIncrease: 12, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Introduction to Programming (Python / CS 1)",
    aliases: ["intro to programming", "cs1", "intro to cs", "computational thinking", "programming fundamentals", "python programming", "intro programming"],
    eightWeek:  { passRateIncrease: 32, retentionRateIncrease: 25, followUpPassRateIncrease: 19, followUpRetentionRateIncrease: 15 },
    fourWeek:   { passRateIncrease: 20, retentionRateIncrease: 15, followUpPassRateIncrease: 11, followUpRetentionRateIncrease:  9 },
  },
  {
    course: "Machine Learning",
    aliases: ["intro to machine learning", "ml", "applied machine learning"],
    eightWeek:  { passRateIncrease: 30, retentionRateIncrease: 23, followUpPassRateIncrease: 18, followUpRetentionRateIncrease: 14 },
    fourWeek:   { passRateIncrease: 19, retentionRateIncrease: 14, followUpPassRateIncrease: 11, followUpRetentionRateIncrease:  9 },
  },
  {
    course: "Marketing Analytics",
    aliases: ["digital marketing analytics", "marketing data"],
    eightWeek:  { passRateIncrease: 21, retentionRateIncrease: 16, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 10 },
    fourWeek:   { passRateIncrease: 12, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Operations & Supply Chain Analytics",
    aliases: ["operations management", "supply chain", "operations analytics"],
    eightWeek:  { passRateIncrease: 20, retentionRateIncrease: 15, followUpPassRateIncrease: 12, followUpRetentionRateIncrease:  9 },
    fourWeek:   { passRateIncrease: 12, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Personal Finance",
    aliases: ["personal financial planning", "money management", "financial literacy"],
    eightWeek:  { passRateIncrease: 16, retentionRateIncrease: 12, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
    fourWeek:   { passRateIncrease: 10, retentionRateIncrease:  8, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Philosophy 101",
    aliases: ["introduction to philosophy", "phil 101", "intro philosophy"],
    eightWeek:  { passRateIncrease: 13, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
    fourWeek:   { passRateIncrease:  8, retentionRateIncrease:  6, followUpPassRateIncrease:  5, followUpRetentionRateIncrease:  4 },
  },
  {
    course: "Portfolio Analysis",
    aliases: ["investment portfolio", "portfolio management", "portfolio theory"],
    eightWeek:  { passRateIncrease:  6, retentionRateIncrease:  5, followUpPassRateIncrease:  3, followUpRetentionRateIncrease:  3 },
    fourWeek:   { passRateIncrease:  4, retentionRateIncrease:  3, followUpPassRateIncrease:  2, followUpRetentionRateIncrease:  2 },
  },
  {
    course: "Predictive Analytics",
    aliases: ["forecasting", "predictive modeling", "business analytics"],
    eightWeek:  { passRateIncrease: 24, retentionRateIncrease: 18, followUpPassRateIncrease: 14, followUpRetentionRateIncrease: 11 },
    fourWeek:   { passRateIncrease: 15, retentionRateIncrease: 11, followUpPassRateIncrease:  9, followUpRetentionRateIncrease:  7 },
  },
  {
    course: "Public Speaking",
    aliases: ["speech", "oral communication", "communication studies 101"],
    eightWeek:  { passRateIncrease: 13, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
    fourWeek:   { passRateIncrease:  7, retentionRateIncrease:  6, followUpPassRateIncrease:  4, followUpRetentionRateIncrease:  4 },
  },
  {
    course: "Quantitative Reasoning",
    aliases: ["quantitative literacy", "math reasoning", "statistical reasoning", "numeracy"],
    eightWeek:  { passRateIncrease: 19, retentionRateIncrease: 14, followUpPassRateIncrease: 11, followUpRetentionRateIncrease: 10 },
    fourWeek:   { passRateIncrease: 12, retentionRateIncrease:  9, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  6 },
  },
  {
    course: "Restaurant & Hospitality Analytics",
    aliases: ["hospitality analytics", "restaurant management analytics", "food service analytics"],
    eightWeek:  { passRateIncrease: 18, retentionRateIncrease: 14, followUpPassRateIncrease: 11, followUpRetentionRateIncrease:  9 },
    fourWeek:   { passRateIncrease: 11, retentionRateIncrease:  9, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Revenue Management & Pricing Analytics",
    aliases: ["revenue management", "pricing analytics", "yield management"],
    eightWeek:  { passRateIncrease: 19, retentionRateIncrease: 15, followUpPassRateIncrease: 12, followUpRetentionRateIncrease:  9 },
    fourWeek:   { passRateIncrease: 11, retentionRateIncrease:  9, followUpPassRateIncrease:  7, followUpRetentionRateIncrease:  5 },
  },
  {
    course: "Workforce Analytics",
    aliases: ["hr analytics", "people analytics", "human resources analytics"],
    eightWeek:  { passRateIncrease: 17, retentionRateIncrease: 13, followUpPassRateIncrease: 10, followUpRetentionRateIncrease:  8 },
    fourWeek:   { passRateIncrease: 10, retentionRateIncrease:  8, followUpPassRateIncrease:  6, followUpRetentionRateIncrease:  5 },
  },
];

/**
 * Catalog-wide averages (from the Comparison sheet).
 * Use as fallback when no specific course match is found.
 */
export const CATALOG_AVERAGES = {
  eightWeek: { passRateIncrease: 22, retentionRateIncrease: 17, followUpPassRateIncrease: 13, followUpRetentionRateIncrease: 10 },
  fourWeek:  { passRateIncrease: 13, retentionRateIncrease: 10, followUpPassRateIncrease:  8, followUpRetentionRateIncrease:  6 },
};

/**
 * Fuzzy-match a course name against the catalog.
 * Returns the best matching entry, or null if nothing is close enough.
 */
export function lookupCourseImpact(courseName: string): CourseImpactMetric | null {
  const query = courseName.toLowerCase().trim();

  // 1. Exact match on canonical name
  const exact = COURSE_IMPACT_CATALOG.find(
    (entry) => entry.course.toLowerCase() === query
  );
  if (exact) return exact;

  // 2. Alias match
  const aliasMatch = COURSE_IMPACT_CATALOG.find((entry) =>
    entry.aliases.some((alias) => query.includes(alias) || alias.includes(query))
  );
  if (aliasMatch) return aliasMatch;

  // 3. Canonical name contained in query (or vice versa) — partial match
  const partial = COURSE_IMPACT_CATALOG.find((entry) => {
    const canon = entry.course.toLowerCase();
    return query.includes(canon) || canon.includes(query);
  });
  if (partial) return partial;

  // 4. Word overlap — at least 2 significant words in common
  const queryWords = new Set(
    query.split(/\s+/).filter((w) => w.length > 3)
  );
  const wordMatch = COURSE_IMPACT_CATALOG.find((entry) => {
    const canonWords = entry.course.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const overlap = canonWords.filter((w) => queryWords.has(w));
    return overlap.length >= 2;
  });

  return wordMatch ?? null;
}

/**
 * Given an array of course names, return an impact summary string
 * suitable for inclusion in an AI prompt.
 */
export function buildImpactSummaryForPrompt(courseNames: string[]): string {
  const lines: string[] = [];
  const usedCatalog = new Set<string>();

  for (const name of courseNames) {
    const match = lookupCourseImpact(name);
    if (match && !usedCatalog.has(match.course)) {
      usedCatalog.add(match.course);
      const m = match.eightWeek; // primary format
      lines.push(
        `• ${name}: +${m.passRateIncrease}% pass rate, +${m.retentionRateIncrease}% retention ` +
        `(follow-up courses: +${m.followUpPassRateIncrease}% pass, +${m.followUpRetentionRateIncrease}% retention)`
      );
    }
  }

  if (lines.length === 0) {
    // No course-specific matches — use catalog averages
    const avg = CATALOG_AVERAGES.eightWeek;
    return (
      `• Catalog average (8-week full course): +${avg.passRateIncrease}% pass rate, ` +
      `+${avg.retentionRateIncrease}% retention; ` +
      `follow-up courses see +${avg.followUpPassRateIncrease}% pass rate, +${avg.followUpRetentionRateIncrease}% retention`
    );
  }

  return lines.join("\n");
}
