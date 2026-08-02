import { logger } from "./logger";

// ─── OpenAI (GPT-4o-mini) ────────────────────────────────────────────────────

async function openaiChat(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? "";
}

// ─── Gemini (Flash) ──────────────────────────────────────────────────────────

async function geminiChat(prompt: string, jsonMode = true): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (jsonMode) {
    body.generationConfig = { response_mime_type: "application/json" };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

export interface CollegeInfo {
  name: string;
  city: string;
  state: string;
  type: string;
  enrollmentSize: number;
  dropoutRate: number | null;
  tuitionInState: number | null;
}

export interface CourseData {
  name: string;
  subject: string;
  description: string;
  estimatedEnrollment: number;
  sections: number;
  failRate: number;
  estimatedAnnualCost: number;
  aiInstallCost: number;
  aiAnnualCost: number;
  isHighPriority: boolean;
}

export interface ContactData {
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  decisionPower: string;
}

export async function generateCourses(
  college: CollegeInfo,
  subject?: string
): Promise<CourseData[]> {
  const systemPrompt = `You are an expert in higher education curriculum and AI-powered course delivery.
Generate realistic course data for a college. Return a JSON object with a "courses" array.
Each course must include: name, subject, description, estimatedEnrollment, sections, failRate (%), estimatedAnnualCost ($), aiInstallCost ($), aiAnnualCost ($), isHighPriority (bool).
Focus on courses with high enrollment or high fail rates — those are prime AI replacement candidates.
AI costs should be roughly 30-50% lower than current delivery costs for install, and 15-25% for annual maintenance.`;

  const userPrompt = `College: ${college.name} (${college.city}, ${college.state})
Type: ${college.type}
Enrollment: ${college.enrollmentSize} students
Dropout rate: ${college.dropoutRate ? `${college.dropoutRate.toFixed(1)}%` : "unknown"}
Tuition (in-state): ${college.tuitionInState ? `$${college.tuitionInState.toLocaleString()}` : "unknown"}
${subject ? `Focus on subject area: ${subject}` : "Generate the 12-15 most important AI-candidate courses for this institution type"}

Generate realistic, institution-specific course data. Include both general education gateway courses (Ethics, Critical Thinking, Remedial Math, Psychology 101, Composition) and programs relevant to this type of school.
Annual cost should reflect credit hours * sections * instructor salary/benefits overhead.`;

  const raw = await openaiChat(systemPrompt, userPrompt);
  const parsed = JSON.parse(raw) as { courses: CourseData[] };
  return parsed.courses ?? [];
}

export async function generateContacts(
  college: CollegeInfo,
  searchSnippets: string[],
  realEmails: string[] = [],
  realPhones: string[] = [],
  collegeDomain: string | null = null
): Promise<ContactData[]> {
  const emailNote = realEmails.length > 0
    ? `Real email addresses found:\n${realEmails.map((e) => `  - ${e}`).join("\n")}`
    : `No real emails found in search. Construct emails using format: firstname.lastname@${collegeDomain ?? "institution.edu"}`;

  const phoneNote = realPhones.length > 0
    ? `Real phone numbers found:\n${realPhones.map((p) => `  - ${p}`).join("\n")}`
    : `No real phone numbers found — use the institution's main switchboard if known from snippets, otherwise leave phone as empty string "".`;

  const systemPrompt = `You are an expert at identifying higher education decision-makers.
Extract and return real contact data from the provided web search snippets.

STRICT RULES:
1. ONLY use names and titles that actually appear in the search snippets. Do not invent names.
2. NEVER use 555 phone numbers. NEVER make up phone numbers. If you cannot find a real number, use "".
3. Use the real email addresses provided if available. For others, construct plausible emails from the college domain.
4. Do NOT generate LinkedIn URLs — leave linkedinUrl as "".
5. Return 4-6 contacts covering: chief academic officer/provost, VP academic affairs, dean of instruction, CIO/CTO, department chair, budget/finance officer.

Return a JSON object with a "contacts" array. Each item: name, title, department, email, phone, linkedinUrl (always ""), decisionPower (one of: provost, curriculum, budget, ai_strategy).`;

  const userPrompt = `College: ${college.name} (${college.state})
Type: ${college.type}
Enrollment: ${college.enrollmentSize.toLocaleString()}

${emailNote}

${phoneNote}

Web search snippets (extract real people from these):
${searchSnippets.slice(0, 15).join("\n---\n")}

Extract real names and titles from these snippets. If snippets don't mention enough names for 4-6 contacts, fill the remaining slots with plausible titles for this institution type but STILL leave phone as "" and do NOT use 555 numbers.`;

  const raw = await openaiChat(systemPrompt, userPrompt);
  const parsed = JSON.parse(raw) as { contacts: ContactData[] };

  // Post-process: strip fake numbers and placeholder names
  // Job title words that indicate the AI used the title as the name
  const JOB_TITLE_WORDS = [
    "officer", "director", "dean", "president", "provost", "chancellor",
    "manager", "coordinator", "administrator", "chair", "professor",
    "vice president", "vp ", "tbd", "unknown",
  ];

  const cleaned = (parsed.contacts ?? [])
    .filter((c) => {
      const name = (c.name ?? "").toLowerCase().trim();
      if (name.length < 3) return false;
      // Drop obvious placeholder names
      if (["john doe", "jane doe", "tbd", "[name tbd]"].includes(name)) return false;
      // Drop entries where the "name" is just a job title (no space = likely one word title; or matches known job words with no personal name structure)
      const hasPersonalNameStructure = name.split(/\s+/).length >= 2;
      if (!hasPersonalNameStructure) return false;
      // If the name IS the title (name === title), it's a placeholder
      const title = (c.title ?? "").toLowerCase().trim();
      if (name === title) return false;
      // If the name contains only job-title words and no apparent surname
      const nameWords = name.split(/\s+/);
      const looksLikeTitle = JOB_TITLE_WORDS.some(
        (w) => name.startsWith(w) && nameWords.length <= 3
      );
      if (looksLikeTitle && name === name.toLowerCase()) return false; // all lowercase = not a proper name
      return true;
    })
    .map((c) => ({
      ...c,
      // Kill any 555-0xxx numbers (NANP reserved for fiction)
      phone: /555.?0\d{3}/.test(c.phone ?? "") ? "" : (c.phone ?? ""),
    }));

  // Deduplicate by name
  const seen = new Set<string>();
  return cleaned.filter((c) => {
    const key = c.name?.toLowerCase().trim() ?? "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface CostAnalysisData {
  totalCurrentAnnualCost: number;
  totalAiInstallCost: number;
  totalAiAnnualCost: number;
  attritionCost: number;
  benchmarkingCost: number;
  totalCostWithoutAI: number;
  totalCostWithAI: number;
  savingsYear1: number;
  savingsAnnual: number;
}

export async function generateCostAnalysis(
  college: CollegeInfo,
  courses: CourseData[]
): Promise<CostAnalysisData> {
  const totalCurrentAnnualCost = courses.reduce(
    (sum, c) => sum + (c.estimatedAnnualCost ?? 0),
    0
  );
  const totalAiInstallCost = courses.reduce(
    (sum, c) => sum + (c.aiInstallCost ?? 0),
    0
  );
  const totalAiAnnualCost = courses.reduce(
    (sum, c) => sum + (c.aiAnnualCost ?? 0),
    0
  );

  // Attrition cost scales with enrollment and dropout rate
  const dropoutFraction = (college.dropoutRate ?? 35) / 100;
  const attritionCost = Math.round(
    college.enrollmentSize * dropoutFraction * (college.tuitionInState ?? 8000) * 0.12
  );

  // Benchmarking cost is typically 15-20% of total course delivery costs
  const benchmarkingCost = Math.round(totalCurrentAnnualCost * 0.17);

  const totalCostWithoutAI =
    totalCurrentAnnualCost + attritionCost + benchmarkingCost;
  const totalCostWithAI =
    totalAiInstallCost + totalAiAnnualCost + attritionCost * 0.6 + benchmarkingCost * 0.3;

  const savingsYear1 = Math.round(totalCostWithoutAI - totalCostWithAI);
  const savingsAnnual = Math.round(
    totalCurrentAnnualCost -
      totalAiAnnualCost +
      attritionCost * 0.4 +
      benchmarkingCost * 0.7
  );

  return {
    totalCurrentAnnualCost,
    totalAiInstallCost,
    totalAiAnnualCost,
    attritionCost,
    benchmarkingCost,
    totalCostWithoutAI: Math.round(totalCostWithoutAI),
    totalCostWithAI: Math.round(totalCostWithAI),
    savingsYear1,
    savingsAnnual,
  };
}

export async function generateOutreachLetter(params: {
  college: CollegeInfo;
  courses: CourseData[];
  contacts: ContactData[];
  aiVirtues: string[];
  costAnalysis: CostAnalysisData;
}): Promise<string> {
  const { college, courses, contacts, aiVirtues, costAnalysis } = params;

  const priorityCourses = courses
    .filter((c) => c.isHighPriority)
    .slice(0, 8)
    .map((c, i) => `${i + 1}. ${c.name} — ${c.subject}`)
    .join("\n");

  const virtueList =
    aiVirtues.length > 0
      ? aiVirtues.join(", ")
      : "adaptive pacing, embedded diagnostics, built-in tutoring, job-readiness benchmarking";

  const primaryContact =
    contacts.find((c) => c.decisionPower === "provost") ?? contacts[0];

  const systemPrompt = `You are a senior business development writer for Zhi Systems, an AI courseware company.
Write a compelling, specific outreach proposal letter for a college. The letter must:
- Be addressed to the primary decision-maker by name and title
- Reference specific institutional data (enrollment, dropout rates, tuition, specific courses)
- Explain exactly which courses Zhi Systems recommends replacing with AI versions and why
- Include specific cost figures (current delivery cost vs AI costs) with precise dollar amounts
- Reference the AI virtues/features that matter most to this institution
- Close with concrete next steps
- Sound authoritative, data-driven, and specific — NOT generic
- Be formatted as a proper business letter (date, salutation, body paragraphs, closing)
- Be approximately 600-900 words

Return the letter as plain text with standard letter formatting. No JSON wrapper.`;

  const userPrompt = `College: ${college.name} (${college.city}, ${college.state})
Type: ${college.type}
Enrollment: ${college.enrollmentSize.toLocaleString()} students
Dropout rate: ${college.dropoutRate?.toFixed(1) ?? "~35"}%
In-state tuition: $${(college.tuitionInState ?? 8000).toLocaleString()}

Primary contact: ${primaryContact?.name ?? "Dr. Academic Vice President"}, ${primaryContact?.title ?? "Provost"}

Priority courses for AI replacement:
${priorityCourses || "Remedial Math, Ethics, Critical Thinking, Psychology 101"}

AI course features: ${virtueList}

Current annual delivery cost: $${costAnalysis.totalCurrentAnnualCost.toLocaleString()}
AI install cost: $${costAnalysis.totalAiInstallCost.toLocaleString()}
Annual AI license: $${costAnalysis.totalAiAnnualCost.toLocaleString()}
First-year savings: $${costAnalysis.savingsYear1.toLocaleString()}
Recurring annual savings: $${costAnalysis.savingsAnnual.toLocaleString()}
Total cost without AI: $${costAnalysis.totalCostWithoutAI.toLocaleString()}
Total cost with AI (year 1): $${costAnalysis.totalCostWithAI.toLocaleString()}

Write a specific, data-driven outreach letter for this institution.`;

  const letter = await openaiChat(systemPrompt, userPrompt, false);
  return letter;
}

export interface SubjectOpportunity {
  collegeId: string;
  opportunityScore: number;
  reason: string;
  estimatedEnrollment: number;
  estimatedAnnualCost: number;
}

export async function rankCollegesForSubject(
  subject: string,
  colleges: CollegeInfo[]
): Promise<SubjectOpportunity[]> {
  const systemPrompt = `You are an expert in higher education AI adoption.
Rank colleges by how likely they are to want an AI-powered version of a specific subject/course.
Factors that increase opportunity: high enrollment, high dropout rate, community/for-profit college type, large enrollment size, lower-tier institutions.
Return a JSON object with a "rankings" array, each item: { collegeId, opportunityScore (0-100), reason (1-2 sentences), estimatedEnrollment, estimatedAnnualCost }.`;

  const userPrompt = `Subject: "${subject}"

Colleges to rank (index | name | type | enrollment | dropoutRate):
${colleges
  .slice(0, 30)
  .map(
    (c, i) =>
      `${i} | ${c.name} (${c.state}) | ${c.type} | ${c.enrollmentSize || "?"} enrolled | ${c.dropoutRate?.toFixed(1) ?? "?"}% dropout`
  )
  .join("\n")}

Rank these colleges by how strongly they need an AI course for "${subject}". High-enrollment gateway courses at community colleges, for-profit schools, and schools with high dropout rates score highest.
Use the numeric index (0, 1, 2…) as the collegeId. Estimate realistic enrollments for this subject at each institution.`;

  const raw = await openaiChat(systemPrompt, userPrompt);
  const parsed = JSON.parse(raw) as { rankings: SubjectOpportunity[] };
  return parsed.rankings ?? [];
}

export async function generatePopularMajors(
  college: CollegeInfo
): Promise<string[]> {
  const systemPrompt = `Return a JSON object with a "majors" array of 5-8 popular major names for this college type. Be brief.`;
  const userPrompt = `College type: ${college.type}, name: ${college.name}, state: ${college.state}, size: ${college.enrollmentSize}`;
  const raw = await openaiChat(systemPrompt, userPrompt);
  const parsed = JSON.parse(raw) as { majors: string[] };
  return parsed.majors ?? [];
}
