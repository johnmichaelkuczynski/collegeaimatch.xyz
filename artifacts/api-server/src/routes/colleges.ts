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
  type CourseData,
  type ContactData,
} from "../lib/aiClient";
import { findCollegeLeadership } from "../lib/serpapi";
import { enrichContactEmails } from "../lib/hunter";
import { getCached, setCached, invalidateCollegeCache } from "../lib/collegeCache";

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

/** Returns true when the caller wants to bypass the cache and regenerate fresh data. */
function wantsRefresh(req: { query: Record<string, unknown> }): boolean {
  return req.query.refresh === "true" || req.query.refresh === "1";
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
    const collegeId = parseInt(params.data.collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, collegeId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    const refresh = wantsRefresh(req);

    // Cache popular_majors for this college
    const MAJORS_KEY = "popular_majors";
    let popularMajors = refresh ? null : await getCached<string[]>(collegeId, MAJORS_KEY);
    if (!popularMajors) {
      popularMajors = await generatePopularMajors(info);
      await setCached(collegeId, MAJORS_KEY, popularMajors);
    }

    college.popularMajors = popularMajors;
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
    const collegeId = parseInt(pathParsed.data.collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, collegeId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const refresh = wantsRefresh(req);
    const COURSES_KEY = subject ? `courses:${subject.toLowerCase()}` : "courses";

    let courses = refresh ? null : await getCached<CourseData[]>(collegeId, COURSES_KEY);
    if (!courses) {
      courses = await generateCourses(toCollegeInfo(college, row), subject);
      await setCached(collegeId, COURSES_KEY, courses);
    }

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
    const collegeId = parseInt(params.data.collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, collegeId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    const refresh = wantsRefresh(req);
    const CONTACTS_KEY = "contacts";

    let contacts = refresh ? null : await getCached<ContactData[]>(collegeId, CONTACTS_KEY);
    if (!contacts) {
      // Use the real leadership search pipeline: 4 parallel SerpAPI queries → AI extraction
      const { allSnippets, realEmails, realPhones, collegeDomain } =
        await findCollegeLeadership(row.name, row.url);

      const generated = await generateContacts(
        info,
        allSnippets,
        realEmails,
        realPhones,
        collegeDomain
      );

      // Enrich emails via Hunter.io if we have a domain
      let enriched = generated;
      if (collegeDomain) {
        const hunterEmails = await enrichContactEmails(generated, collegeDomain);
        enriched = generated.map((c, i) => ({
          ...c,
          email: hunterEmails[i] || c.email,
        }));
      }

      contacts = enriched;
      await setCached(collegeId, CONTACTS_KEY, contacts);
    }

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
    const collegeId = parseInt(pathParsed.data.collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, collegeId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    const refresh = wantsRefresh(req);

    // Reuse the base courses cache; cost-analysis key includes courseCount
    const COURSES_KEY = "courses";
    const COST_KEY = `cost_analysis:${courseCount}`;

    // Try cost-analysis cache first
    type CostAnalysisResponse = { collegeName: string; courses: CourseData[]; [k: string]: unknown };
    let cachedResult = refresh ? null : await getCached<CostAnalysisResponse>(collegeId, COST_KEY);
    if (cachedResult) {
      res.json(cachedResult);
      return;
    }

    // Generate (or fetch cached) courses, then compute cost analysis
    let allCourses = refresh ? null : await getCached<CourseData[]>(collegeId, COURSES_KEY);
    if (!allCourses) {
      allCourses = await generateCourses(info);
      await setCached(collegeId, COURSES_KEY, allCourses);
    }

    const courses = [...allCourses]
      .sort((a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0))
      .slice(0, courseCount);

    const analysis = await generateCostAnalysis(info, courses);
    const result: CostAnalysisResponse = { collegeName: row.name, courses, ...analysis };

    await setCached(collegeId, COST_KEY, result);
    res.json(result);
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
    const collegeId = parseInt(params.data.collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, collegeId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);
    const refresh = wantsRefresh(req);

    const MAJORS_KEY = "popular_majors";
    const COURSES_KEY = "courses";

    // Fetch both from cache (or generate) in parallel
    const [cachedMajors, cachedCourses] = await Promise.all([
      refresh ? Promise.resolve(null) : getCached<string[]>(collegeId, MAJORS_KEY),
      refresh ? Promise.resolve(null) : getCached<CourseData[]>(collegeId, COURSES_KEY),
    ]);

    const [popularMajors, allCourses] = await Promise.all([
      cachedMajors
        ? Promise.resolve(cachedMajors)
        : generatePopularMajors(info).then(async (m) => {
            await setCached(collegeId, MAJORS_KEY, m);
            return m;
          }),
      cachedCourses
        ? Promise.resolve(cachedCourses)
        : generateCourses(info).then(async (c) => {
            await setCached(collegeId, COURSES_KEY, c);
            return c;
          }),
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

// ── DELETE /colleges/:id/cache ──────────────────────────────────────────────
// Force-invalidate all cached AI data for a college (admin / manual refresh).

router.delete("/colleges/:id/cache", async (req, res): Promise<void> => {
  const params = GetCollegeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const collegeId = parseInt(params.data.collegeId, 10);
    await invalidateCollegeCache(collegeId);
    res.json({ success: true, message: "Cache cleared for college " + collegeId });
  } catch (err) {
    req.log.error({ err }, "Clear college cache failed");
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

export default router;
