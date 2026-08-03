import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, proposalsTable } from "@workspace/db";
import {
  GetProposalParams,
  DeleteProposalParams,
  CreateProposalBody,
  GenerateProposalBody,
} from "@workspace/api-zod";
import {
  generateOutreachLetter,
  generateCostAnalysis,
  generateCourses,
  generateContacts,
  generateSingleCoursePitch,
  computeSingleCoursePitchNumbers,
  type CollegeInfo,
  type CourseData,
} from "../lib/aiClient";
import { webSearch } from "../lib/serpapi";

const router: IRouter = Router();

// GET /proposals
router.get("/proposals", async (_req, res): Promise<void> => {
  try {
    const proposals = await db
      .select({
        id: proposalsTable.id,
        collegeName: proposalsTable.collegeName,
        collegeState: proposalsTable.collegeState,
        courses: proposalsTable.courses,
        createdAt: proposalsTable.createdAt,
        updatedAt: proposalsTable.updatedAt,
      })
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.createdAt));

    const summaries = proposals.map((p) => ({
      id: p.id,
      collegeName: p.collegeName,
      collegeState: p.collegeState,
      courseCount: Array.isArray(p.courses) ? p.courses.length : 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json(summaries);
  } catch (err) {
    _req.log.error({ err }, "List proposals failed");
    res.status(500).json({ error: "Failed to list proposals" });
  }
});

// POST /proposals/generate — must be BEFORE /:id to avoid param capture
router.post("/proposals/generate", async (req, res): Promise<void> => {
  const parsed = GenerateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  // Read fields that aren't in the Zod schema before parse strips them
  const rawBody = req.body as Record<string, unknown>;
  const pitchMode = rawBody.pitchMode === true;
  const collegeCity = typeof rawBody.collegeCity === "string" ? rawBody.collegeCity : "";

  try {
    const collegeInfo: CollegeInfo = {
      name: input.collegeName,
      city: collegeCity,
      state: input.collegeState,
      type: input.collegeType ?? "four_year",
      enrollmentSize: input.enrollmentSize ?? 5000,
      dropoutRate: input.dropoutRate ?? null,
      tuitionInState: null,
    };

    // Use provided courses or generate them
    let courses = (input.courses ?? []) as CourseData[];
    if (courses.length === 0) {
      courses = await generateCourses(collegeInfo);
    }

    // ── Single-course pitch path ─────────────────────────────────────────────
    if (pitchMode && courses.length === 1) {
      const course = courses[0];
      const outreachLetter = await generateSingleCoursePitch(collegeInfo, course);

      // Build a CostAnalysisData-shaped object from the pitch formula numbers
      const nums = computeSingleCoursePitchNumbers(course, collegeInfo.type);
      const pitchCostAnalysis = {
        collegeName: input.collegeName,
        courses,
        totalCurrentAnnualCost: nums.directCost,
        totalAiInstallCost: nums.zhiSetup,
        totalAiAnnualCost: nums.zhiAnnual,
        attritionCost: nums.dropoutLoss,
        benchmarkingCost: 0,
        totalCostWithoutAI: nums.totalCost,
        totalCostWithAI: nums.zhiAnnual + nums.zhiSetup,
        savingsYear1: nums.savingsYear1,
        savingsAnnual: nums.savingsVsTrue,
      };

      res.json({
        outreachLetter,
        costAnalysis: pitchCostAnalysis,
        prioritizedCourses: courses,
        executiveSummary: `Single-course pitch: ${course.name} at ${input.collegeName}. Saves ≈$${nums.savingsVsTrue.toLocaleString()} per year vs true cost. Zhi price: $${nums.zhiAnnual.toLocaleString()}/yr + $${nums.zhiSetup.toLocaleString()} one-time.`,
      });
      return;
    }

    // ── Full multi-course proposal path ──────────────────────────────────────

    // Use provided contacts or generate them
    let contacts = (input.contacts ?? []) as Awaited<ReturnType<typeof generateContacts>>;
    if (contacts.length === 0) {
      const snippets = await webSearch(
        `"${input.collegeName}" provost OR "chief academic officer" OR "vice president academic"`
      );
      contacts = await generateContacts(
        collegeInfo,
        snippets.map((r) => `${r.title}: ${r.snippet}`)
      );
    }

    // Use provided or generate cost analysis
    let costAnalysis = input.costAnalysis as
      | Awaited<ReturnType<typeof generateCostAnalysis>>
      | undefined;
    if (!costAnalysis) {
      costAnalysis = await generateCostAnalysis(collegeInfo, courses);
    }

    // Generate outreach letter
    const outreachLetter = await generateOutreachLetter({
      college: collegeInfo,
      courses,
      contacts: contacts.map((c) => ({
        ...c,
        institution: input.collegeName,
      })),
      aiVirtues: input.aiVirtues ?? [],
      costAnalysis,
    });

    const prioritizedCourses = [...courses].sort(
      (a, b) =>
        (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0)
    );

    const executiveSummary = `${input.collegeName} currently spends an estimated $${costAnalysis.totalCurrentAnnualCost.toLocaleString()} annually delivering ${courses.length} courses that are prime AI replacement candidates. With Zhi Systems, the institution would save $${costAnalysis.savingsYear1.toLocaleString()} in the first year and $${costAnalysis.savingsAnnual.toLocaleString()} every year thereafter.`;

    res.json({
      outreachLetter,
      costAnalysis: { collegeName: input.collegeName, courses, ...costAnalysis },
      prioritizedCourses,
      executiveSummary,
    });
  } catch (err) {
    req.log.error({ err }, "Generate proposal failed");
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});

// POST /proposals
router.post("/proposals", async (req, res): Promise<void> => {
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  try {
    const [proposal] = await db
      .insert(proposalsTable)
      .values({
        collegeId: input.collegeId ?? null,
        collegeName: input.collegeName,
        collegeState: input.collegeState,
        courses: input.courses ?? [],
        contacts: input.contacts ?? [],
        aiVirtues: input.aiVirtues ?? [],
        outreachLetter: input.outreachLetter,
        costAnalysis: input.costAnalysis ?? {},
      })
      .returning();

    res.status(201).json({
      id: proposal.id,
      collegeId: proposal.collegeId,
      collegeName: proposal.collegeName,
      collegeState: proposal.collegeState,
      courses: proposal.courses ?? [],
      contacts: proposal.contacts ?? [],
      aiVirtues: proposal.aiVirtues ?? [],
      outreachLetter: proposal.outreachLetter,
      costAnalysis: proposal.costAnalysis,
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create proposal failed");
    res.status(500).json({ error: "Failed to create proposal" });
  }
});

// GET /proposals/:id
router.get("/proposals/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProposalParams.safeParse({ proposalId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, params.data.proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json({
      id: proposal.id,
      collegeId: proposal.collegeId,
      collegeName: proposal.collegeName,
      collegeState: proposal.collegeState,
      courses: proposal.courses ?? [],
      contacts: proposal.contacts ?? [],
      aiVirtues: proposal.aiVirtues ?? [],
      outreachLetter: proposal.outreachLetter,
      costAnalysis: proposal.costAnalysis,
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get proposal failed");
    res.status(500).json({ error: "Failed to get proposal" });
  }
});

// DELETE /proposals/:id
router.delete("/proposals/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProposalParams.safeParse({ proposalId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [deleted] = await db
      .delete(proposalsTable)
      .where(eq(proposalsTable.id, params.data.proposalId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Delete proposal failed");
    res.status(500).json({ error: "Failed to delete proposal" });
  }
});

export default router;
