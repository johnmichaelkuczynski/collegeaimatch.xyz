import { Router, type IRouter } from "express";
import { and, eq, ilike, desc } from "drizzle-orm";
import { db, collegesTable } from "@workspace/db";
import { SearchBySubjectQueryParams } from "@workspace/api-zod";
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
    const conditions = [eq(collegesTable.isActive, true)];
    if (institutionType) conditions.push(eq(collegesTable.type, institutionType));
    if (state) conditions.push(eq(collegesTable.state, state.toUpperCase()));

    // Fetch a wider pool ranked by opportunity score, then let AI rank for subject fit
    const raw = await db
      .select()
      .from(collegesTable)
      .where(and(...conditions))
      .orderBy(desc(collegesTable.aiOpportunityScore), desc(collegesTable.enrollmentSize))
      .limit(Math.min((limit ?? 10) * 5, 100));

    if (raw.length === 0) {
      res.json([]);
      return;
    }

    // Build CollegeInfo list for the AI ranker
    const infos: (CollegeInfo & { dbId: number })[] = raw.map((c) => {
      const completionRate = c.completionRate ?? 0.6;
      return {
        dbId: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        type: c.type,
        enrollmentSize: c.enrollmentSize,
        dropoutRate: Math.round((1 - completionRate) * 100 * 10) / 10,
        tuitionInState: c.tuitionInState,
      };
    });

    // AI ranking
    const rankings = await rankCollegesForSubject(subject, infos);

    // Merge results — AI returns numeric index as collegeId
    const results = rankings.slice(0, limit ?? 10).map((rank, rankIdx) => {
      const idx = typeof rank.collegeId === "number"
        ? rank.collegeId
        : parseInt(String(rank.collegeId), 10);
      const college = infos[isNaN(idx) ? rankIdx : idx] ?? infos[rankIdx] ?? infos[0];
      const dbRow = raw.find((r) => r.id === college.dbId) ?? raw[rankIdx] ?? raw[0];
      const dropoutRate =
        dbRow.completionRate != null
          ? Math.round((1 - dbRow.completionRate) * 100 * 10) / 10
          : null;

      return {
        college: {
          id: String(dbRow.id),
          name: dbRow.name,
          city: dbRow.city,
          state: dbRow.state,
          type: dbRow.type,
          enrollmentSize: dbRow.enrollmentSize,
          dropoutRate,
          graduationRate:
            dbRow.completionRate != null
              ? Math.round(dbRow.completionRate * 100 * 10) / 10
              : null,
          avgGraduationYears: dbRow.type === "community_college" ? 3.2 : 4.4,
          debtPayoffYears: null,
          tuitionInState: dbRow.tuitionInState,
          tuitionOutOfState: dbRow.tuitionOutOfState,
          accreditation: null,
          url: dbRow.url,
          description: null,
          popularMajors: [],
          aiOpportunityScore: dbRow.aiOpportunityScore,
        },
        subject,
        opportunityScore: rank.opportunityScore ?? dbRow.aiOpportunityScore,
        reason:
          rank.reason ??
          `High-enrollment ${subject} course with strong AI replacement potential.`,
        estimatedEnrollment:
          rank.estimatedEnrollment ??
          Math.round(dbRow.enrollmentSize * 0.08),
        estimatedAnnualCost:
          rank.estimatedAnnualCost ??
          Math.round(dbRow.enrollmentSize * 0.08 * 180),
      };
    });

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Subject search failed");
    res.status(500).json({ error: "Failed to search by subject" });
  }
});

export default router;
