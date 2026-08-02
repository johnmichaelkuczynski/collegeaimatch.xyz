import { Router, type IRouter } from "express";
import { sql, ilike, and, lte, gte, eq, desc, asc } from "drizzle-orm";
import { db, collegesTable } from "@workspace/db";
import {
  SearchCollegesQueryParams,
  GetCollegeParams,
  GetCollegeCoursesParams,
  GetCollegeCoursesQueryParams,
  GetCollegeContactsParams,
  GetCollegeCostAnalysisParams,
  GetCollegeCostAnalysisQueryParams,
  GetCollegeStatsParams,
} from "@workspace/api-zod";
import {
  generateCourses,
  generateContacts,
  generateCostAnalysis,
  generatePopularMajors,
  type CollegeInfo,
} from "../lib/aiClient";
import { webSearch } from "../lib/serpapi";

const router: IRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

type DbCollege = typeof collegesTable.$inferSelect;

function toAPICollege(c: DbCollege) {
  const dropoutRate =
    c.completionRate != null
      ? Math.round((1 - c.completionRate) * 100 * 10) / 10
      : null;
  return {
    id: String(c.id),
    name: c.name,
    city: c.city,
    state: c.state,
    type: c.type,
    enrollmentSize: c.enrollmentSize,
    dropoutRate,
    graduationRate:
      c.completionRate != null
        ? Math.round(c.completionRate * 100 * 10) / 10
        : null,
    avgGraduationYears: c.type === "community_college" ? 3.2 : 4.4,
    debtPayoffYears: c.medianDebt
      ? c.medianDebt > 25000
        ? 12
        : c.medianDebt > 15000
        ? 7
        : 4
      : null,
    tuitionInState: c.tuitionInState,
    tuitionOutOfState: c.tuitionOutOfState,
    accreditation: null as string | null,
    url: c.url,
    description: null as string | null,
    popularMajors: [] as string[],
    aiOpportunityScore: c.aiOpportunityScore,
  };
}

function toCollegeInfo(c: ReturnType<typeof toAPICollege>, raw: DbCollege): CollegeInfo {
  return {
    name: c.name,
    city: c.city,
    state: c.state,
    type: c.type,
    enrollmentSize: c.enrollmentSize,
    dropoutRate: c.dropoutRate,
    tuitionInState: raw.tuitionInState,
  };
}

function buildWhereClause(params: {
  query?: string;
  state?: string;
  type?: string;
  maxDropoutRate?: number;
  minDropoutRate?: number;
}) {
  const conditions = [];

  if (params.query && params.query.trim()) {
    // Search across name — use ILIKE with each word for flexible matching
    const words = params.query.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(ilike(collegesTable.name, `%${word}%`));
    }
  }

  if (params.state) {
    conditions.push(eq(collegesTable.state, params.state.toUpperCase()));
  }

  if (params.type) {
    conditions.push(eq(collegesTable.type, params.type));
  }

  // Dropout = 1 - completionRate. maxDropoutRate → minCompletion
  if (params.maxDropoutRate !== undefined && params.maxDropoutRate < 100) {
    const minCompletion = 1 - params.maxDropoutRate / 100;
    conditions.push(gte(collegesTable.completionRate, minCompletion));
  }
  if (params.minDropoutRate !== undefined && params.minDropoutRate > 0) {
    const maxCompletion = 1 - params.minDropoutRate / 100;
    conditions.push(lte(collegesTable.completionRate, maxCompletion));
  }

  // Only active institutions
  conditions.push(eq(collegesTable.isActive, true));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ── GET /colleges/search ────────────────────────────────────────────────────

router.get("/colleges/search", async (req, res): Promise<void> => {
  const parsed = SearchCollegesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const params = parsed.data;
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(params.limit ?? 20, 100);

  try {
    const where = buildWhereClause(params);

    const [results, countResult] = await Promise.all([
      db
        .select()
        .from(collegesTable)
        .where(where)
        .orderBy(
          // Prioritize higher opportunity scores and larger enrollments
          desc(collegesTable.aiOpportunityScore),
          desc(collegesTable.enrollmentSize)
        )
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`count(*)` })
        .from(collegesTable)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const colleges = results.map(toAPICollege);

    res.json({ colleges, total, page, limit });
  } catch (err) {
    req.log.error({ err }, "College search failed");
    res.status(500).json({ error: "Failed to search colleges" });
  }
});

// ── GET /colleges/:id ───────────────────────────────────────────────────────

router.get("/colleges/:id", async (req, res): Promise<void> => {
  const params = GetCollegeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, parseInt(params.data.collegeId, 10)));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    college.popularMajors = await generatePopularMajors(info);

    res.json(college);
  } catch (err) {
    req.log.error({ err }, "Get college failed");
    res.status(500).json({ error: "Failed to get college" });
  }
});

// ── GET /colleges/:id/courses ───────────────────────────────────────────────

router.get("/colleges/:id/courses", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCoursesParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCoursesQueryParams.safeParse(req.query);
  const subject = queryParsed.success ? queryParsed.data.subject : undefined;

  try {
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, parseInt(pathParsed.data.collegeId, 10)));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const courses = await generateCourses(toCollegeInfo(college, row), subject);
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Get college courses failed");
    res.status(500).json({ error: "Failed to get courses" });
  }
});

// ── GET /colleges/:id/contacts ──────────────────────────────────────────────

router.get("/colleges/:id/contacts", async (req, res): Promise<void> => {
  const params = GetCollegeContactsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, parseInt(params.data.collegeId, 10)));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    const results = await webSearch(
      `"${row.name}" provost OR "vice president academic affairs" OR "chief academic officer" OR "dean of instruction"`
    );
    const snippets = results.map((r) => `${r.title}: ${r.snippet}`).slice(0, 5);
    const contacts = await generateContacts(info, snippets);

    res.json(contacts.map((c) => ({ ...c, institution: row.name })));
  } catch (err) {
    req.log.error({ err }, "Get college contacts failed");
    res.status(500).json({ error: "Failed to get contacts" });
  }
});

// ── GET /colleges/:id/cost-analysis ────────────────────────────────────────

router.get("/colleges/:id/cost-analysis", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCostAnalysisParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCostAnalysisQueryParams.safeParse(req.query);
  const courseCount = queryParsed.success ? (queryParsed.data.courseCount ?? 5) : 5;

  try {
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, parseInt(pathParsed.data.collegeId, 10)));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    const allCourses = await generateCourses(info);
    const courses = allCourses
      .sort((a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0))
      .slice(0, courseCount);

    const analysis = await generateCostAnalysis(info, courses);
    res.json({ collegeName: row.name, courses, ...analysis });
  } catch (err) {
    req.log.error({ err }, "Get college cost analysis failed");
    res.status(500).json({ error: "Failed to get cost analysis" });
  }
});

// ── GET /colleges/:id/stats ─────────────────────────────────────────────────

router.get("/colleges/:id/stats", async (req, res): Promise<void> => {
  const params = GetCollegeStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, parseInt(params.data.collegeId, 10)));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    const [popularMajors, allCourses] = await Promise.all([
      generatePopularMajors(info),
      generateCourses(info),
    ]);

    const highEnrollmentCourses = [...allCourses]
      .sort((a, b) => (b.estimatedEnrollment ?? 0) - (a.estimatedEnrollment ?? 0))
      .slice(0, 5);
    const highFailRateCourses = [...allCourses]
      .sort((a, b) => (b.failRate ?? 0) - (a.failRate ?? 0))
      .slice(0, 5);

    res.json({
      collegeName: row.name,
      totalEnrollment: row.enrollmentSize,
      dropoutRate: college.dropoutRate,
      graduationRate: college.graduationRate,
      avgTimeToGraduate: college.avgGraduationYears,
      popularMajors,
      highEnrollmentCourses,
      highFailRateCourses,
    });
  } catch (err) {
    req.log.error({ err }, "Get college stats failed");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
