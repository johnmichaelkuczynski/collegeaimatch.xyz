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
import { sendProposalEmail } from "../lib/sendgrid";

const router: IRouter = Router();

// ── Email-log helpers ─────────────────────────────────────────────────────────

interface EmailLogEntry {
  sentAt: string;
  to: string;
  recipientName?: string;
}
    const proposals = await db
      .select({
        id: proposalsTable.id,
        collegeName: proposalsTable.collegeName,
        collegeState: proposalsTable.collegeState,
        courses: proposalsTable.courses,
        emailLog: proposalsTable.emailLog,
        createdAt: proposalsTable.createdAt,
        updatedAt: proposalsTable.updatedAt,
      })
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.createdAt));

    const summaries = proposals.map((p) => {
      const log = parseEmailLog(p.emailLog);
      const lastEntry = log.length > 0 ? log[log.length - 1] : null;
      return {
        id: p.id,
        collegeName: p.collegeName,
        collegeState: p.collegeState,
        courseCount: Array.isArray(p.courses) ? p.courses.length : 0,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        lastEmailedAt: lastEntry ? lastEntry.sentAt : null,
        lastEmailedTo: lastEntry ? lastEntry.to : null,
      };
    });

    res.json(summaries);
  } catch (err) {
    _req.log.error({ err }, "List proposals failed");
    res.status(500).json({ error: "Failed to list proposals" });
  }
});

// POST /proposals/generate — must be BEFORE /:id to avoid param capture
router.post("/proposals/generate", async (req, res): Promise<void> => {
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  // Read fields that aren't in the Zod schema before parse strips them
  const rawBody = req.body as Record<string, unknown>;
  const pitchMode = rawBody.pitchMode === true;
  const collegeCity = typeof rawBody.collegeCity === "string" ? rawBody.collegeCity : "";
  const tone =
    typeof rawBody.tone === "string"
      ? (rawBody.tone as import("../lib/aiClient").OutreachTone)
      : "formal";
  const subset = rawBody.subset === true;

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
    const outreachLetter = await generateOutreachLetter({
      college: collegeInfo,
      courses,
      contacts: contacts.map((c) => ({
        ...c,
        institution: input.collegeName,
      })),
      aiVirtues: input.aiVirtues ?? [],
      costAnalysis,
      tone,
      subset,
    });

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
      tone,
      subset,
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
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProposalParams.safeParse({ proposalId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const proposalId = parseInt(raw, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }

  const { outreachLetter } = req.body as { outreachLetter?: string };
  if (typeof outreachLetter !== "string" || !outreachLetter.trim()) {
    res.status(400).json({ error: "'outreachLetter' is required" });
    return;
  }

  try {
    const [updated] = await db
      .update(proposalsTable)
      .set({ outreachLetter })
      .where(eq(proposalsTable.id, proposalId))
      .returning({ id: proposalsTable.id });

    if (!updated) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Patch proposal failed");
    res.status(500).json({ error: "Failed to update proposal" });
  }
});

// POST /proposals/:id/email
router.post("/proposals/:id/email", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const proposalId = parseInt(raw, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }

  const { to, recipientName } = req.body as { to?: string; recipientName?: string };
  if (!to || !to.includes("@")) {
    res.status(400).json({ error: "A valid 'to' email address is required" });
    return;
  }

  try {
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);

    const emailLog = parseEmailLog(proposal.emailLog);
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
    const updatedLog = [...existingLog, newEntry];
function parseEmailLog(raw: unknown): EmailLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw as EmailLogEntry[];
}
    const lastEntry = emailLog.length > 0 ? emailLog[emailLog.length - 1] : null;
    const newEntry: EmailLogEntry = {
      sentAt: new Date().toISOString(),
      to,
      ...(recipientName ? { recipientName } : {}),
    };

    const existingLog = parseEmailLog(proposal.emailLog);
