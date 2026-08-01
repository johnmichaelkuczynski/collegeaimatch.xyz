import { Router, type IRouter } from "express";
import { SearchBySubjectQueryParams } from "@workspace/api-zod";
import {
  searchScorecardColleges,
  carnegieToType,
} from "../lib/collegeScorecard";
import { rankCollegesForSubject, type CollegeInfo } from "../lib/aiClient";

const router: IRouter = Router();

// GET /subjects/search
router.get("/subjects/search", async (req, res): Promise<void> => {
  const parsed = SearchBySubjectQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { subject, institutionType, state, limit } = parsed.data;

  if (!subject) {
    res.status(400).json({ error: "subject is required" });
    return;
  }

  try {
    // Fetch colleges matching optional filters — cast wider net than requested limit
    const fetchLimit = Math.min((limit ?? 10) * 4, 100);
    const { colleges: raw } = await searchScorecardColleges({
      type: institutionType,
      state,
      limit: fetchLimit,
      page: 1,
    });

    if (raw.length === 0) {
      res.json([]);
      return;
    }

    // Build CollegeInfo list for the AI ranker
    const infos: (CollegeInfo & { id: string })[] = raw.map((sc) => {
      const type = carnegieToType(sc.ownership, sc.carnegieBasic, sc.enrollmentSize);
      const dropoutRate =
        sc.completionRate != null
          ? Math.round((1 - sc.completionRate) * 100 * 10) / 10
          : null;
      return {
        id: String(sc.id),
        name: sc.name,
        city: sc.city,
        state: sc.state,
        type,
        enrollmentSize: sc.enrollmentSize,
        dropoutRate,
        tuitionInState: sc.tuitionInState,
      };
    });

    // Rank them with AI
    const rankings = await rankCollegesForSubject(subject, infos);

    // Merge ranked results with full college data
    const resultsMap = new Map<string, (typeof infos)[0]>();
    infos.forEach((c) => resultsMap.set(c.id, c));

    const results = rankings
      .slice(0, limit ?? 10)
      .map((rank) => {
        // Find the matching college by matching name-based id pattern
        const college = infos.find((c, i) => {
          const genId = `${c.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${i}`;
          return rank.collegeId === genId || rank.collegeId.includes(c.name.replace(/[^a-z0-9]/gi, "_").toLowerCase());
        }) ?? infos[rankings.indexOf(rank)] ?? infos[0];

        const sc = raw.find((r) => String(r.id) === college?.id);
        const type = college
          ? carnegieToType(
              sc?.ownership ?? 1,
              sc?.carnegieBasic ?? 0,
              sc?.enrollmentSize ?? 0
            )
          : "four_year";

        const dropoutRate =
          sc?.completionRate != null
            ? Math.round((1 - sc.completionRate) * 100 * 10) / 10
            : null;

        let oppScore = 50;
        if (type === "community_college") oppScore += 20;
        if (type === "for_profit") oppScore += 15;
        if (dropoutRate && dropoutRate > 40) oppScore += 15;
        if ((sc?.enrollmentSize ?? 0) > 5000) oppScore += 10;

        return {
          college: {
            id: college?.id ?? String(sc?.id ?? ""),
            name: college?.name ?? "",
            city: college?.city ?? "",
            state: college?.state ?? "",
            type,
            enrollmentSize: sc?.enrollmentSize ?? 0,
            dropoutRate,
            graduationRate:
              sc?.completionRate != null
                ? Math.round(sc.completionRate * 100 * 10) / 10
                : null,
            avgGraduationYears: type === "community_college" ? 3.2 : 4.4,
            debtPayoffYears: null,
            tuitionInState: sc?.tuitionInState ?? null,
            tuitionOutOfState: sc?.tuitionOutOfState ?? null,
            accreditation: null,
            url: sc?.url ?? null,
            description: null,
            popularMajors: [],
            aiOpportunityScore: Math.min(rank.opportunityScore ?? oppScore, 98),
          },
          subject,
          opportunityScore: rank.opportunityScore ?? oppScore,
          reason: rank.reason ?? `High-enrollment ${subject} course with strong AI replacement potential.`,
          estimatedEnrollment: rank.estimatedEnrollment ?? Math.round((sc?.enrollmentSize ?? 500) * 0.08),
          estimatedAnnualCost:
            rank.estimatedAnnualCost ??
            Math.round((sc?.enrollmentSize ?? 500) * 0.08 * 180),
        };
      });

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Subject search failed");
    res.status(500).json({ error: "Failed to search by subject" });
  }
});

export default router;
