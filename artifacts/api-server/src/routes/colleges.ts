import { Router, type IRouter } from "express";
import { sql, ilike, and, lte, gte, eq, desc, asc, or, not } from "drizzle-orm";
import { db, collegesTable, customCollegesTable } from "@workspace/db";
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
import { z } from "zod";

const router: IRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

type DbCollege = typeof collegesTable.$inferSelect;
type DbCustomCollege = typeof customCollegesTable.$inferSelect;

/** Prefix used to identify custom college IDs in the API layer */
const CUSTOM_PREFIX = "custom_";

function isCustomId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

function toCustomNumericId(id: string): number {
  return parseInt(id.slice(CUSTOM_PREFIX.length), 10);
}

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

function toAPICustomCollege(c: DbCustomCollege) {
  return {
    id: `${CUSTOM_PREFIX}${c.id}`,
    name: c.name,
    city: c.city,
    state: c.state,
    type: c.type,
    enrollmentSize: 0,
    dropoutRate: null as number | null,
    graduationRate: null as number | null,
    avgGraduationYears: c.type === "community_college" ? 3.2 : 4.4,
    debtPayoffYears: null as number | null,
    tuitionInState: null as number | null,
    tuitionOutOfState: null as number | null,
    accreditation: null as string | null,
    url: null as string | null,
    description: null as string | null,
    popularMajors: [] as string[],
    aiOpportunityScore: 60, // default score for custom colleges
    isCustom: true,
    sourceFile: c.sourceFile,
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

function toCustomCollegeInfo(c: DbCustomCollege): CollegeInfo {
  return {
    name: c.name,
    city: c.city,
    state: c.state,
    type: c.type,
    enrollmentSize: 0,
    dropoutRate: null,
    tuitionInState: null,
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

  if (params.maxDropoutRate !== undefined && params.maxDropoutRate < 100) {
    const minCompletion = 1 - params.maxDropoutRate / 100;
    conditions.push(gte(collegesTable.completionRate, minCompletion));
  }
  if (params.minDropoutRate !== undefined && params.minDropoutRate > 0) {
    const maxCompletion = 1 - params.minDropoutRate / 100;
    conditions.push(lte(collegesTable.completionRate, maxCompletion));
  }

  conditions.push(eq(collegesTable.isActive, true));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildCustomWhereClause(params: {
  query?: string;
  state?: string;
  type?: string;
}) {
  const conditions = [];

  if (params.query && params.query.trim()) {
    const words = params.query.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(ilike(customCollegesTable.name, `%${word}%`));
    }
  }

  if (params.state) {
    conditions.push(eq(customCollegesTable.state, params.state.toUpperCase()));
  }

  if (params.type) {
    conditions.push(eq(customCollegesTable.type, params.type));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Returns true when the caller wants to bypass the cache and regenerate fresh data. */
function wantsRefresh(req: { query: Record<string, unknown> }): boolean {
  return req.query.refresh === "true" || req.query.refresh === "1";
}

// ── POST /colleges/upload ────────────────────────────────────────────────────

const UploadCollegeListBody = z.object({
  csvContent: z.string(),
  filename: z.string().optional(),
});

router.post("/colleges/upload", async (req, res): Promise<void> => {
  const parsed = UploadCollegeListBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Expected { csvContent: string, filename?: string }" });
    return;
  }

  const { csvContent, filename = "upload.csv" } = parsed.data;
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    res.status(400).json({ error: "CSV file is empty" });
    return;
  }

  // Parse header row
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const nameIdx = headers.indexOf("name");
  const stateIdx = headers.indexOf("state");
  const typeIdx = headers.indexOf("type");
  const cityIdx = headers.indexOf("city");

  if (nameIdx === -1) {
    res.status(400).json({ error: "CSV must have a 'name' column" });
    return;
  }

  const dataLines = lines.slice(1);
  let inserted = 0;
  let skipped = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Simple CSV field split — handles quoted fields with commas
    const fields = parseCSVLine(line);
    const name = fields[nameIdx]?.trim().replace(/^"|"$/g, "");
    const state = stateIdx >= 0 ? (fields[stateIdx]?.trim().replace(/^"|"$/g, "") || "").toUpperCase() : "";
    const type = typeIdx >= 0 ? (fields[typeIdx]?.trim().replace(/^"|"$/g, "") || "lower_tier") : "lower_tier";
    const city = cityIdx >= 0 ? (fields[cityIdx]?.trim().replace(/^"|"$/g, "") || "") : "";

    if (!name) {
      skipped++;
      continue;
    }

    // Check for duplicate (same name + state)
    const existing = await db
      .select({ id: customCollegesTable.id })
      .from(customCollegesTable)
      .where(
        and(
          ilike(customCollegesTable.name, name),
          eq(customCollegesTable.state, state)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(customCollegesTable).values({
      name,
      state,
      type: normalizeType(type),
      city,
      sourceFile: filename,
    });
    inserted++;
  }

  res.json({
    inserted,
    skipped,
    total: dataLines.filter((l) => l.trim()).length,
    sourceFile: filename,
  });
});

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function normalizeType(type: string): string {
  const valid = [
    "community_college", "four_year", "university", "for_profit",
    "specialty", "technical", "lower_tier"
  ];
  const lower = type.toLowerCase().replace(/\s+/g, "_");
  return valid.includes(lower) ? lower : "lower_tier";
}

// ── GET /colleges/custom ─────────────────────────────────────────────────────

router.get("/colleges/custom", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(customCollegesTable)
      .orderBy(desc(customCollegesTable.createdAt));

    const colleges = rows.map(toAPICustomCollege);
    res.json({ colleges, total: colleges.length, page: 1, limit: colleges.length });
  } catch (err) {
    req.log.error({ err }, "List custom colleges failed");
    res.status(500).json({ error: "Failed to list custom colleges" });
  }
});

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

    // Don't apply dropout rate filter to custom colleges (they have no completion data)
    const hasDropoutFilter =
      (params.maxDropoutRate !== undefined && params.maxDropoutRate < 100) ||
      (params.minDropoutRate !== undefined && params.minDropoutRate > 0);

    // Fetch custom colleges first; we need them to build the dedup exclusion
    // before running the scorecard count + row queries.
    const allCustomResults = hasDropoutFilter
      ? []
      : await db
          .select()
          .from(customCollegesTable)
          .where(buildCustomWhereClause(params))
          .orderBy(desc(customCollegesTable.createdAt));

    const customCount = allCustomResults.length;

    // Build an exclusion condition for scorecard so rows overlapping custom
    // colleges (same name+state) are dropped at the DB level. This keeps the
    // COUNT accurate and avoids post-query filtering inconsistencies.
    const dedupeExclusion =
      allCustomResults.length > 0
        ? not(
            or(
              ...allCustomResults.map((c) =>
                and(eq(collegesTable.name, c.name), eq(collegesTable.state, c.state))
              )
            )!
          )
        : undefined;

    const scorecardWhere = dedupeExclusion ? and(where, dedupeExclusion) : where;

    // ── Unified stream model ───────────────────────────────────────────────
    // Positions 0..customCount-1        → custom colleges (full list, pre-fetched)
    // Positions customCount..total-1    → scorecard colleges (deduped, paginated)
    //
    // For any page P with limit L:
    //   globalStart = (P-1)*L
    //   Custom on page: allCustomResults[globalStart .. min(customCount, globalStart+L))
    //   Scorecard slot = L - customOnPage.length
    //   Scorecard offset = max(0, globalStart - customCount)
    //
    // This is correct for any customCount (< L, = L, or > L):
    //   - custom colleges never repeat across pages
    //   - scorecard offset advances monotonically
    //   - deduped total is stable

    const globalStart = (page - 1) * limit;
    const customEnd = Math.min(customCount, globalStart + limit);
    const customSlice = allCustomResults.slice(
      Math.min(customCount, globalStart),
      customEnd
    );
    const scorecardSlot = limit - customSlice.length;
    const scorecardOffset = Math.max(0, globalStart - customCount);

    const [scorecardRows, countResult] = await Promise.all([
      scorecardSlot > 0
        ? db
            .select()
            .from(collegesTable)
            .where(scorecardWhere)
            .orderBy(
              desc(collegesTable.aiOpportunityScore),
              desc(collegesTable.enrollmentSize),
              asc(collegesTable.id) // stable tiebreaker — prevents row repetition across pages
            )
            .limit(scorecardSlot)
            .offset(scorecardOffset)
        : Promise.resolve([]),
      db
        .select({ count: sql<number>`count(*)` })
        .from(collegesTable)
        .where(scorecardWhere),
    ]);

    const scorecardTotal = Number(countResult[0]?.count ?? 0);
    const total = customCount + scorecardTotal;

    const colleges = [
      ...customSlice.map(toAPICustomCollege),
      ...scorecardRows.map(toAPICollege),
    ];

    res.json({ colleges, total, page, limit });
  } catch (err) {
    req.log.error({ err }, "College search failed");
    res.status(500).json({ error: "Failed to search colleges" });
  }
});

// ── GET /colleges/:collegeId ─────────────────────────────────────────────────

router.get("/colleges/:collegeId", async (req, res): Promise<void> => {
  const params = GetCollegeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const collegeId = params.data.collegeId;
    const refresh = wantsRefresh(req);

    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      const [row] = await db
        .select()
        .from(customCollegesTable)
        .where(eq(customCollegesTable.id, numericId));

      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const college = toAPICustomCollege(row);
      const info = toCustomCollegeInfo(row);
      const cacheId = -numericId; // Use negative ID namespace for custom colleges in cache

      const MAJORS_KEY = "popular_majors";
      let popularMajors = refresh ? null : await getCached<string[]>(cacheId, MAJORS_KEY);
      if (!popularMajors) {
        popularMajors = await generatePopularMajors(info);
        await setCached(cacheId, MAJORS_KEY, popularMajors);
      }

      college.popularMajors = popularMajors;
      res.json(college);
      return;
    }

    const numericId = parseInt(collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, numericId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    const MAJORS_KEY = "popular_majors";
    let popularMajors = refresh ? null : await getCached<string[]>(numericId, MAJORS_KEY);
    if (!popularMajors) {
      popularMajors = await generatePopularMajors(info);
      await setCached(numericId, MAJORS_KEY, popularMajors);
    }

    college.popularMajors = popularMajors;
    res.json(college);
  } catch (err) {
    req.log.error({ err }, "Get college failed");
    res.status(500).json({ error: "Failed to get college" });
  }
});

// ── GET /colleges/:collegeId/courses ─────────────────────────────────────────

router.get("/colleges/:collegeId/courses", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCoursesParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCoursesQueryParams.safeParse(req.query);
  const subject = queryParsed.success ? queryParsed.data.subject : undefined;

  try {
    const collegeId = pathParsed.data.collegeId;
    const refresh = wantsRefresh(req);
    const COURSES_KEY = subject ? `courses:${subject.toLowerCase()}` : "courses";

    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      const [row] = await db
        .select()
        .from(customCollegesTable)
        .where(eq(customCollegesTable.id, numericId));

      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const info = toCustomCollegeInfo(row);
      const cacheId = -numericId;

      let courses = refresh ? null : await getCached<CourseData[]>(cacheId, COURSES_KEY);
      if (!courses) {
        courses = await generateCourses(info, subject);
        await setCached(cacheId, COURSES_KEY, courses);
      }

      res.json(courses);
      return;
    }

    const numericId = parseInt(collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, numericId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);

    let courses = refresh ? null : await getCached<CourseData[]>(numericId, COURSES_KEY);
    if (!courses) {
      courses = await generateCourses(toCollegeInfo(college, row), subject);
      await setCached(numericId, COURSES_KEY, courses);
    }

    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Get college courses failed");
    res.status(500).json({ error: "Failed to get courses" });
  }
});

// ── GET /colleges/:collegeId/contacts ────────────────────────────────────────

router.get("/colleges/:collegeId/contacts", async (req, res): Promise<void> => {
  const params = GetCollegeContactsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const collegeId = params.data.collegeId;
    const refresh = wantsRefresh(req);
    const CONTACTS_KEY = "contacts";

    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      const [row] = await db
        .select()
        .from(customCollegesTable)
        .where(eq(customCollegesTable.id, numericId));

      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const info = toCustomCollegeInfo(row);
      const cacheId = -numericId;

      let contacts = refresh ? null : await getCached<ContactData[]>(cacheId, CONTACTS_KEY);
      if (!contacts) {
        const { allSnippets, realEmails, realPhones, collegeDomain } =
          await findCollegeLeadership(row.name, null);

        const generated = await generateContacts(info, allSnippets, realEmails, realPhones, collegeDomain);

        let enriched = generated;
        if (collegeDomain) {
          const hunterEmails = await enrichContactEmails(generated, collegeDomain);
          enriched = generated.map((c, i) => ({
            ...c,
            email: hunterEmails[i] || c.email,
          }));
        }

        contacts = enriched;
        await setCached(cacheId, CONTACTS_KEY, contacts);
      }

      res.json(contacts.map((c) => ({ ...c, institution: row.name })));
      return;
    }

    const numericId = parseInt(collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, numericId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    let contacts = refresh ? null : await getCached<ContactData[]>(numericId, CONTACTS_KEY);
    if (!contacts) {
      const { allSnippets, realEmails, realPhones, collegeDomain } =
        await findCollegeLeadership(row.name, row.url);

      const generated = await generateContacts(info, allSnippets, realEmails, realPhones, collegeDomain);

      let enriched = generated;
      if (collegeDomain) {
        const hunterEmails = await enrichContactEmails(generated, collegeDomain);
        enriched = generated.map((c, i) => ({
          ...c,
          email: hunterEmails[i] || c.email,
        }));
      }

      contacts = enriched;
      await setCached(numericId, CONTACTS_KEY, contacts);
    }

    res.json(contacts.map((c) => ({ ...c, institution: row.name })));
  } catch (err) {
    req.log.error({ err }, "Get college contacts failed");
    res.status(500).json({ error: "Failed to get contacts" });
  }
});

// ── GET /colleges/:collegeId/cost-analysis ───────────────────────────────────

router.get("/colleges/:collegeId/cost-analysis", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCostAnalysisParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCostAnalysisQueryParams.safeParse(req.query);
  const courseCount = queryParsed.success ? (queryParsed.data.courseCount ?? 5) : 5;

  try {
    const collegeId = pathParsed.data.collegeId;
    const refresh = wantsRefresh(req);
    const COURSES_KEY = "courses";
    const COST_KEY = `cost_analysis:${courseCount}`;

    type CostAnalysisResponse = { collegeName: string; courses: CourseData[]; [k: string]: unknown };

    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      const [row] = await db
        .select()
        .from(customCollegesTable)
        .where(eq(customCollegesTable.id, numericId));

      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const info = toCustomCollegeInfo(row);
      const cacheId = -numericId;

      let cachedResult = refresh ? null : await getCached<CostAnalysisResponse>(cacheId, COST_KEY);
      if (cachedResult) {
        res.json(cachedResult);
        return;
      }

      let allCourses = refresh ? null : await getCached<CourseData[]>(cacheId, COURSES_KEY);
      if (!allCourses) {
        allCourses = await generateCourses(info);
        await setCached(cacheId, COURSES_KEY, allCourses);
      }

      const courses = [...allCourses]
        .sort((a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0))
        .slice(0, courseCount);

      const analysis = await generateCostAnalysis(info, courses);
      const result: CostAnalysisResponse = { collegeName: row.name, courses, ...analysis };

      await setCached(cacheId, COST_KEY, result);
      res.json(result);
      return;
    }

    const numericId = parseInt(collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, numericId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    let cachedResult = refresh ? null : await getCached<CostAnalysisResponse>(numericId, COST_KEY);
    if (cachedResult) {
      res.json(cachedResult);
      return;
    }

    let allCourses = refresh ? null : await getCached<CourseData[]>(numericId, COURSES_KEY);
    if (!allCourses) {
      allCourses = await generateCourses(info);
      await setCached(numericId, COURSES_KEY, allCourses);
    }

    const courses = [...allCourses]
      .sort((a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0))
      .slice(0, courseCount);

    const analysis = await generateCostAnalysis(info, courses);
    const result: CostAnalysisResponse = { collegeName: row.name, courses, ...analysis };

    await setCached(numericId, COST_KEY, result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Get college cost analysis failed");
    res.status(500).json({ error: "Failed to get cost analysis" });
  }
});

// ── GET /colleges/:collegeId/stats ───────────────────────────────────────────

router.get("/colleges/:collegeId/stats", async (req, res): Promise<void> => {
  const params = GetCollegeStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const collegeId = params.data.collegeId;
    const refresh = wantsRefresh(req);
    const MAJORS_KEY = "popular_majors";
    const COURSES_KEY = "courses";

    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      const [row] = await db
        .select()
        .from(customCollegesTable)
        .where(eq(customCollegesTable.id, numericId));

      if (!row) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const info = toCustomCollegeInfo(row);
      const cacheId = -numericId;

      const [cachedMajors, cachedCourses] = await Promise.all([
        refresh ? Promise.resolve(null) : getCached<string[]>(cacheId, MAJORS_KEY),
        refresh ? Promise.resolve(null) : getCached<CourseData[]>(cacheId, COURSES_KEY),
      ]);

      const [popularMajors, allCourses] = await Promise.all([
        cachedMajors
          ? Promise.resolve(cachedMajors)
          : generatePopularMajors(info).then(async (m) => {
              await setCached(cacheId, MAJORS_KEY, m);
              return m;
            }),
        cachedCourses
          ? Promise.resolve(cachedCourses)
          : generateCourses(info).then(async (c) => {
              await setCached(cacheId, COURSES_KEY, c);
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
        totalEnrollment: 0,
        dropoutRate: null,
        graduationRate: null,
        avgTimeToGraduate: row.type === "community_college" ? 3.2 : 4.4,
        popularMajors,
        highEnrollmentCourses,
        highFailRateCourses,
      });
      return;
    }

    const numericId = parseInt(collegeId, 10);
    const [row] = await db
      .select()
      .from(collegesTable)
      .where(eq(collegesTable.id, numericId));

    if (!row) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    const college = toAPICollege(row);
    const info = toCollegeInfo(college, row);

    const [cachedMajors, cachedCourses] = await Promise.all([
      refresh ? Promise.resolve(null) : getCached<string[]>(numericId, MAJORS_KEY),
      refresh ? Promise.resolve(null) : getCached<CourseData[]>(numericId, COURSES_KEY),
    ]);

    const [popularMajors, allCourses] = await Promise.all([
      cachedMajors
        ? Promise.resolve(cachedMajors)
        : generatePopularMajors(info).then(async (m) => {
            await setCached(numericId, MAJORS_KEY, m);
            return m;
          }),
      cachedCourses
        ? Promise.resolve(cachedCourses)
        : generateCourses(info).then(async (c) => {
            await setCached(numericId, COURSES_KEY, c);
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

// ── DELETE /colleges/:collegeId/cache ────────────────────────────────────────
// Force-invalidate all cached AI data for a college (admin / manual refresh).

router.delete("/colleges/:collegeId/cache", async (req, res): Promise<void> => {
  const params = GetCollegeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const collegeId = params.data.collegeId;
    if (isCustomId(collegeId)) {
      const numericId = toCustomNumericId(collegeId);
      await invalidateCollegeCache(-numericId);
    } else {
      const numericId = parseInt(collegeId, 10);
      await invalidateCollegeCache(numericId);
    }
    res.json({ success: true, message: "Cache cleared for college " + collegeId });
  } catch (err) {
    req.log.error({ err }, "Clear college cache failed");
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

export default router;
