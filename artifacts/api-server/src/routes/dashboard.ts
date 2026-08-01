import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, proposalsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  try {
    const proposals = await db
      .select()
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.createdAt));

    const totalProposals = proposals.length;

    // Count unique colleges researched (tracked by collegeName)
    const uniqueColleges = new Set(proposals.map((p) => p.collegeName));
    const totalCollegesResearched = uniqueColleges.size;

    // Compute savings stats
    let totalPotentialSavings: number | null = null;
    let avgSavingsPerCollege: number | null = null;
    const stateCount: Record<string, number> = {};

    if (proposals.length > 0) {
      let savingsSum = 0;
      let savingsCount = 0;

      for (const p of proposals) {
        const ca = p.costAnalysis as Record<string, unknown> | null;
        if (ca && typeof ca.savingsYear1 === "number") {
          savingsSum += ca.savingsYear1;
          savingsCount++;
        }
        if (p.collegeState) {
          stateCount[p.collegeState] = (stateCount[p.collegeState] ?? 0) + 1;
        }
      }

      if (savingsCount > 0) {
        totalPotentialSavings = savingsSum;
        avgSavingsPerCollege = Math.round(savingsSum / savingsCount);
      }
    }

    const topOpportunityStates = Object.entries(stateCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([state, count]) => ({ state, count }));

    const recentProposals = proposals.slice(0, 5).map((p) => ({
      id: p.id,
      collegeName: p.collegeName,
      collegeState: p.collegeState,
      courseCount: Array.isArray(p.courses) ? p.courses.length : 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json({
      totalProposals,
      totalCollegesResearched,
      avgSavingsPerCollege,
      topOpportunityStates,
      recentProposals,
      totalPotentialSavings,
    });
  } catch (err) {
    _req.log.error({ err }, "Dashboard summary failed");
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

export default router;
