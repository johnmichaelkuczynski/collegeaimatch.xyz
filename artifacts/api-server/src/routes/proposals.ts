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
  computeSingleCoursePitchNumbers,
  type CollegeInfo,
  type CourseData,
  type OutreachTone,
} from "../lib/aiClient";
import { webSearch } from "../lib/serpapi";
import { sendProposalEmail } from "../lib/sendgrid";

const router: IRouter = Router();

// ── Email-log helpers ─────────────────────────────────────────────────────────

interface EmailLogEntry {
  emailLogId: string;
  sentAt: string;
  to: string;
  recipientName?: string;
  status: "sent" | "delivered" | "opened" | "bounced" | "spam";
  deliveredAt?: string;
  openedAt?: string;
  bounceReason?: string;
}

function parseEmailLog(raw: unknown): EmailLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw as EmailLogEntry[];
}

// ── GET /proposals/email-history ─────────────────────────────────────────────

router.get("/proposals/email-history", async (_req, res): Promise<void> => {
  try {
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

    const entries: {
      proposalId: number;
      collegeName: string;
      sentAt: string;
      to: string;
      recipientName?: string;
    }[] = [];

    for (const proposal of proposals) {
      const log = parseEmailLog(proposal.emailLog);
      for (const entry of log) {
        entries.push({
          proposalId: proposal.id,
          collegeName: proposal.collegeName,
          sentAt: entry.sentAt,
          to: entry.to,
          ...(entry.recipientName ? { recipientName: entry.recipientName } : {}),
        });
      }
    }

    // Sort by most recent send first
    entries.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

    res.json(entries);
  } catch (err) {
    _req.log.error({ err }, "List email history failed");
    res.status(500).json({ error: "Failed to list email history" });
  }
});

// ── GET /proposals ────────────────────────────────────────────────────────────

router.get("/proposals", async (_req, res): Promise<void> => {
  try {
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

// ── POST /proposals/generate — BEFORE /:id to avoid param capture ─────────────

router.post("/proposals/generate", async (req, res): Promise<void> => {
  // Pre-normalise body so GenerateProposalBody parses cleanly:
  // - contacts need { institution } (required by schema but not always sent)
  // - costAnalysis needs { collegeName, courses } (required by schema)
  const rawBody = req.body as Record<string, unknown>;
  const bodyForParse = { ...rawBody };
  if (Array.isArray(bodyForParse.contacts)) {
    bodyForParse.contacts = (bodyForParse.contacts as Record<string, unknown>[]).map((c) => ({
      institution: bodyForParse.collegeName ?? "",
      department: "",
      ...c,
    }));
  }
  if (bodyForParse.costAnalysis && typeof bodyForParse.costAnalysis === "object") {
    bodyForParse.costAnalysis = {
      collegeName: bodyForParse.collegeName ?? "",
      courses: [],
      ...(bodyForParse.costAnalysis as object),
    };
  }

  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  // Extra fields not in the Zod schema
  const pitchMode = rawBody.pitchMode === true;
  const collegeCity =
    typeof rawBody.collegeCity === "string" ? rawBody.collegeCity : "";
  const tone: OutreachTone =
    typeof rawBody.tone === "string"
      ? (rawBody.tone as OutreachTone)
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
      const nums = computeSingleCoursePitchNumbers(course, collegeInfo.type);
      const pitchCostAnalysis = {
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
      // Use generateOutreachLetter so tone is respected in pitch mode too
    const outreachLetter = await generateOutreachLetter({
      college: collegeInfo,
      courses,
      contacts: contacts.map((c) => ({ ...c, institution: input.collegeName })),
      aiVirtues: input.aiVirtues ?? [],
      costAnalysis,
      tone,
      subset,
    });
      res.json({
        outreachLetter,
        costAnalysis: { collegeName: input.collegeName, courses, ...pitchCostAnalysis },
        prioritizedCourses: courses,
        executiveSummary: `Single-course pitch: ${course.name} at ${input.collegeName}. Saves ≈$${nums.savingsVsTrue.toLocaleString()} per year vs true cost. Zhi price: $${nums.zhiAnnual.toLocaleString()}/yr + $${nums.zhiSetup.toLocaleString()} one-time.`,
      });
      return;
    }

    // ── Full / subset multi-course proposal path ──────────────────────────────

    // Use provided contacts or generate them via web search
    let contacts = (input.contacts ?? []) as Awaited<
      ReturnType<typeof generateContacts>
    >;
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

    // Generate outreach letter with tone + subset flag
    const outreachLetter = await generateOutreachLetter({
      college: collegeInfo,
      courses,
      contacts: contacts.map((c) => ({ ...c, institution: input.collegeName })),
      aiVirtues: input.aiVirtues ?? [],
      costAnalysis,
      tone,
      subset,
    });

    const prioritizedCourses = [...courses].sort(
      (a, b) => (b.estimatedAnnualCost ?? 0) - (a.estimatedAnnualCost ?? 0)
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

// ── POST /proposals ───────────────────────────────────────────────────────────

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

    res.json(proposal);
  } catch (err) {
    req.log.error({ err }, "Get proposal failed");
    res.status(500).json({ error: "Failed to get proposal" });
  }
});

// ── PATCH /proposals/:id — update outreach letter ─────────────────────────────

router.patch("/proposals/:id", async (req, res): Promise<void> => {
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

    res.json(proposal);
  } catch (err) {
    req.log.error({ err }, "Get proposal failed");
    res.status(500).json({ error: "Failed to get proposal" });
  }
});

// ── PATCH /proposals/:id — update outreach letter ─────────────────────────────

router.patch("/proposals/:id", async (req, res): Promise<void> => {
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

// ── POST /proposals/:id/email ─────────────────────────────────────────────────

router.post("/proposals/:id/email", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const proposalId = parseInt(raw, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }

  const { to, recipientName } = req.body as {
    to?: string;
    recipientName?: string;
  };
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

    // Unique ID so the SendGrid webhook can find this exact log entry
    const emailLogId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // Send the email via SendGrid
    await sendProposalEmail({
      to,
      recipientName: recipientName ?? undefined,
      collegeName: proposal.collegeName,
      outreachLetter: proposal.outreachLetter ?? "",
      courses: proposal.courses as Parameters<typeof sendProposalEmail>[0]["courses"],
      costAnalysis: proposal.costAnalysis as Parameters<typeof sendProposalEmail>[0]["costAnalysis"],
      proposalId,
      emailLogId,
    });

    // Append to emailLog so we can track send history
    const existingLog = parseEmailLog(proposal.emailLog);
    const newEntry: EmailLogEntry = {
      emailLogId,
      sentAt: new Date().toISOString(),
      to,
      status: "sent",
      ...(recipientName ? { recipientName } : {}),
    };
    const updatedLog = [...existingLog, newEntry];

    await db
      .update(proposalsTable)
      .set({ emailLog: updatedLog })
      .where(eq(proposalsTable.id, proposalId));

    res.json({ success: true, sentAt: newEntry.sentAt });
  } catch (err) {
    req.log.error({ err }, "Email proposal failed");
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ── DELETE /proposals/:id ─────────────────────────────────────────────────────

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
