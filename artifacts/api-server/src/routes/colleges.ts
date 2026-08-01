import { Router, type IRouter } from "express";
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
  searchScorecardColleges,
  getScorecardCollege,
  carnegieToType,
} from "../lib/collegeScorecard";
import {
  generateCourses,
  generateContacts,
  generateCostAnalysis,
  generatePopularMajors,
  type CollegeInfo,
} from "../lib/aiClient";
import { webSearch } from "../lib/serpapi";

const router: IRouter = Router();

// Convert scorecard record → our College shape
function toCollege(sc: Awaited<ReturnType<typeof getScorecardCollege>>) {
  if (!sc) return null;
  const type = carnegieToType(
    sc.ownership,
    sc.carnegieBasic,
    sc.enrollmentSize
  );
  const dropoutRate = sc.completionRate != null ? Math.round((1 - sc.completionRate) * 100 * 10) / 10 : null;
  // Debt payoff years: rough estimate from median debt / annual earnings proxy
  let debtPayoffYears: number | null = null;
  if (sc.medianDebt && sc.repayment3yr) {
    // If 3yr repayment rate > 70%, likely < 5 years; otherwise estimate
    debtPayoffYears = sc.repayment3yr > 0.7 ? 4 : sc.repayment3yr > 0.5 ? 7 : 12;
  }
  // Opportunity score: higher for community colleges, for-profit, high dropout
  let score = 50;
  if (type === "community_college") score += 20;
  if (type === "for_profit") score += 15;
  if (dropoutRate && dropoutRate > 40) score += 15;
  if (sc.enrollmentSize > 5000) score += 10;
  if (sc.completionRate && sc.completionRate < 0.5) score += 10;
  score = Math.min(score, 98);

  return {
    id: String(sc.id),
    name: sc.name,
    city: sc.city,
    state: sc.state,
    type,
    enrollmentSize: sc.enrollmentSize,
    dropoutRate,
    graduationRate: sc.completionRate != null ? Math.round(sc.completionRate * 100 * 10) / 10 : null,
    avgGraduationYears: type === "community_college" ? 3.2 : 4.4,
    debtPayoffYears,
    tuitionInState: sc.tuitionInState,
    tuitionOutOfState: sc.tuitionOutOfState,
    accreditation: null as string | null,
    url: sc.url,
    description: null as string | null,
    popularMajors: [] as string[],
    aiOpportunityScore: score,
  };
}

function toCollegeInfo(college: NonNullable<ReturnType<typeof toCollege>>): CollegeInfo {
  return {
    name: college.name,
    city: college.city,
    state: college.state,
    type: college.type,
    enrollmentSize: college.enrollmentSize,
    dropoutRate: college.dropoutRate,
    tuitionInState: college.tuitionInState,
  };
}

// GET /colleges/search
router.get("/colleges/search", async (req, res): Promise<void> => {
  const parsed = SearchCollegesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const params = parsed.data;

  try {
    const { colleges: raw, total } = await searchScorecardColleges({
      query: params.query,
      state: params.state,
      type: params.type,
      maxDropoutRate: params.maxDropoutRate,
      minDropoutRate: params.minDropoutRate,
      maxGraduationYears: params.maxGraduationYears,
      maxDebtPayoffYears: params.maxDebtPayoffYears,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });

    const colleges = raw.map((sc) => toCollege(sc)).filter(Boolean);

    res.json({
      colleges,
      total,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });
  } catch (err) {
    req.log.error({ err }, "College search failed");
    res.status(500).json({ error: "Failed to search colleges" });
  }
});

// GET /colleges/:id
router.get("/colleges/:id", async (req, res): Promise<void> => {
  const params = GetCollegeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const sc = await getScorecardCollege(params.data.collegeId);
    if (!sc) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    const college = toCollege(sc)!;
    // Enrich with popular majors
    college.popularMajors = await generatePopularMajors(toCollegeInfo(college));
    res.json(college);
  } catch (err) {
    req.log.error({ err }, "Get college failed");
    res.status(500).json({ error: "Failed to get college" });
  }
});

// GET /colleges/:id/courses
router.get("/colleges/:id/courses", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCoursesParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCoursesQueryParams.safeParse(req.query);
  const subject = queryParsed.success ? queryParsed.data.subject : undefined;

  try {
    const sc = await getScorecardCollege(pathParsed.data.collegeId);
    if (!sc) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    const college = toCollege(sc)!;
    const courses = await generateCourses(toCollegeInfo(college), subject);
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Get college courses failed");
    res.status(500).json({ error: "Failed to get courses" });
  }
});

// GET /colleges/:id/contacts
router.get("/colleges/:id/contacts", async (req, res): Promise<void> => {
  const params = GetCollegeContactsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const sc = await getScorecardCollege(params.data.collegeId);
    if (!sc) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    const college = toCollege(sc)!;
    const info = toCollegeInfo(college);

    // Search web for real leadership data
    const results = await webSearch(
      `"${college.name}" provost OR "vice president academic affairs" OR "chief academic officer" OR "dean of instruction" site:${college.url ?? college.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu`
    );
    const snippets = results.map((r) => `${r.title}: ${r.snippet}`).slice(0, 5);

    const contacts = await generateContacts(info, snippets);
    res.json(contacts.map((c) => ({ ...c, institution: college.name })));
  } catch (err) {
    req.log.error({ err }, "Get college contacts failed");
    res.status(500).json({ error: "Failed to get contacts" });
  }
});

// GET /colleges/:id/cost-analysis
router.get("/colleges/:id/cost-analysis", async (req, res): Promise<void> => {
  const pathParsed = GetCollegeCostAnalysisParams.safeParse(req.params);
  if (!pathParsed.success) {
    res.status(400).json({ error: pathParsed.error.message });
    return;
  }
  const queryParsed = GetCollegeCostAnalysisQueryParams.safeParse(req.query);
  const courseCount = queryParsed.success
    ? (queryParsed.data.courseCount ?? 5)
    : 5;

  try {
    const sc = await getScorecardCollege(pathParsed.data.collegeId);
    if (!sc) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    const college = toCollege(sc)!;
    const info = toCollegeInfo(college);

    const allCourses = await generateCourses(info);
    const courses = allCourses
      .sort((a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0))
      .slice(0, courseCount);

    const analysis = await generateCostAnalysis(info, courses);

    res.json({
      collegeName: college.name,
      courses,
      ...analysis,
    });
  } catch (err) {
    req.log.error({ err }, "Get college cost analysis failed");
    res.status(500).json({ error: "Failed to get cost analysis" });
  }
});

// GET /colleges/:id/stats
router.get("/colleges/:id/stats", async (req, res): Promise<void> => {
  const params = GetCollegeStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const sc = await getScorecardCollege(params.data.collegeId);
    if (!sc) {
      res.status(404).json({ error: "College not found" });
      return;
    }
    const college = toCollege(sc)!;
    const info = toCollegeInfo(college);

    const [popularMajors, allCourses] = await Promise.all([
      generatePopularMajors(info),
      generateCourses(info),
    ]);

    const highEnrollmentCourses = allCourses
      .sort((a, b) => (b.estimatedEnrollment ?? 0) - (a.estimatedEnrollment ?? 0))
      .slice(0, 5);

    const highFailRateCourses = allCourses
      .sort((a, b) => (b.failRate ?? 0) - (a.failRate ?? 0))
      .slice(0, 5);

    res.json({
      collegeName: college.name,
      totalEnrollment: college.enrollmentSize,
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
