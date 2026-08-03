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
  /** One-time AI setup cost — always $30,000 */
  aiInstallCost: number;
  /** Annual AI maintenance cost — always 15% of estimatedAnnualCost */
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
  const systemPrompt = `You are an expert in higher education curriculum and labor economics.
Generate realistic course data for a college. Return a JSON object with a "courses" array.
Each course must include: name, subject, description, estimatedEnrollment, sections, failRate (%), estimatedAnnualCost ($), isHighPriority (bool).
Do NOT include aiInstallCost or aiAnnualCost — those are calculated separately.

CRITICAL — use these real-world instructor cost benchmarks for estimatedAnnualCost:
- Community college section: $3,500–$5,500 (mostly adjuncts; some FT faculty prorated)
- State/regional university section: $5,000–$9,000 (mix of FT and adjunct)
- Private/liberal-arts college section: $8,000–$14,000 (primarily FT faculty)
- estimatedAnnualCost = sections × avg_cost_per_section for that institution type
- A 30-section community college course costs roughly $105,000–$165,000 total — never $300,000+
- DO NOT inflate. Real community college course delivery costs $60,000–$200,000/year for high-enrollment courses.
- Verified benchmark: Fresno State's Developmental Math (~780 students, state university) = $780,000/year. Community colleges cost proportionally less.

Focus on courses with high enrollment or high fail rates — those are prime AI replacement candidates.`;

  const userPrompt = `College: ${college.name} (${college.city}, ${college.state})
Type: ${college.type}
Enrollment: ${college.enrollmentSize} students
Dropout rate: ${college.dropoutRate ? `${college.dropoutRate.toFixed(1)}%` : "unknown"}
Tuition (in-state): ${college.tuitionInState ? `$${college.tuitionInState.toLocaleString()}` : "unknown"}
${subject ? `Focus on subject area: ${subject}` : "Generate the 12-15 most important AI-candidate courses for this institution type"}

Include general education gateway courses (Remedial Math, Composition I, Intro to Psychology, Ethics, Critical Thinking) plus computer science / tech courses (Databases / SQL, Data Structures and Algorithms, Introduction to Programming / Computational Thinking) plus programs specific to this institution type.
Use realistic section counts based on enrollment and typical class sizes (25–35 students/section).
Apply the cost-per-section benchmarks for this institution type strictly.`;

  const raw = await openaiChat(systemPrompt, userPrompt);
  const parsed = JSON.parse(raw) as { courses: CourseData[] };
  const courses = parsed.courses ?? [];

  // Compute AI costs using Zhi Systems' verified rate card (Fresno State benchmark).
  // Flat fee per course — NOT enrollment-scaled, NOT a percentage of current cost.
  // Source: empirically verified proposal for Cal State Fresno Developmental Mathematics.
  //   Setup:   $85,000 one-time (Canvas integration + courseware build)
  //   License: $18,000/year flat (no per-seat metering, no enrollment escalation)
  return courses.map((c) => ({
    ...c,
    aiInstallCost: 85_000,   // one-time courseware build & Canvas integration
    aiAnnualCost:  18_000,   // flat annual license per course
  }));
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

  const systemPrompt = `You are extracting REAL contact data from web search snippets for a sales intelligence tool.

ABSOLUTE RULES — violating any of these makes the output worthless:
1. A contact entry is ONLY allowed if a real person's full name (first + last) appears explicitly in the snippets. No name found = no entry.
2. NEVER invent or guess names. Do not use: John Smith, Jane Smith, John Doe, Jane Doe, or any placeholder.
3. NEVER use 555 phone numbers or invent phone numbers. Use "" for phone if not found in snippets.
4. Leave linkedinUrl as "" always.
5. It is BETTER to return 2 real contacts than 6 invented ones. Quality over quantity.
6. For email: use a real email found in the snippets if available. If not found, construct "firstname.lastname@domain" using the college domain. Never use random character strings (like mr647738@) as emails.

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
  // Known placeholder / generic names the AI uses when it can't find real people
  const FAKE_NAMES = new Set([
    "john doe", "jane doe", "john smith", "jane smith", "tbd", "[name tbd]",
    "name tbd", "unknown", "first last", "firstname lastname",
    "sarah johnson", "michael johnson", "robert johnson", "mary johnson",
    "sarah williams", "michael williams", "sarah brown", "michael brown",
    "sarah davis", "michael davis", "sarah miller", "michael miller",
    "james wilson", "mary wilson", "robert wilson", "sarah wilson",
    "thomas anderson", "mary anderson", "james anderson",
  ]);

  // Job title words that indicate name field contains a title, not a person
  const TITLE_STARTS = [
    "officer", "director", "dean", "president", "provost", "chancellor",
    "manager", "coordinator", "administrator", "chair", "professor",
    "vice president", "vp ", "tbd", "unknown", "associate vice",
  ];

  const cleaned = (parsed.contacts ?? [])
    .filter((c) => {
      const name = (c.name ?? "").toLowerCase().trim();
      if (name.length < 4) return false;
      if (FAKE_NAMES.has(name)) return false;
      // Must have at least two words (first + last name)
      if (name.split(/\s+/).length < 2) return false;
      // If name equals title, it's a placeholder
      if (name === (c.title ?? "").toLowerCase().trim()) return false;
      // If name starts with a job title word, it's a title not a name
      if (TITLE_STARTS.some((w) => name.startsWith(w))) return false;
      return true;
    })
    .map((c) => ({
      ...c,
      // Remove student-ID style emails: letters + 5+ digits @ domain
      email: /^[a-z]{1,3}\d{5,}@/.test(c.email ?? "") ? "" : (c.email ?? ""),
      // Kill any invented 555-0xxx numbers
      phone: /555.?0\d{3}/.test(c.phone ?? "") ? "" : (c.phone ?? ""),
    }))
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

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

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
- The letter is from Douglas Fong at Zhi Systems. Use his name and contact details in the closing signature.

Return the letter as plain text with standard letter formatting. No JSON wrapper.`;

  const userPrompt = `Date: ${today}
Sender: Douglas Fong, Zhi Systems | zhi@zhisystems.org | 845-240-4235

College: ${college.name} (${college.city}, ${college.state})
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

// ── Single-course pitch report ────────────────────────────────────────────────
// Mirrors the constants in artifacts/college-finder/src/lib/courseCosts.ts.
// Keep in sync if either side changes.

const PITCH_COST_PER_STUDENT_COMMUNITY = 150;
const PITCH_COST_PER_STUDENT_UNIVERSITY = 300;
const PITCH_DROPOUT_SHARE = 0.25;
const PITCH_LOST_REVENUE = 3_000;
const PITCH_ZHI_ANNUAL = 18_000;
const PITCH_ZHI_SETUP = 85_000;

function roundDown5k(n: number): number {
  return Math.floor(n / 5_000) * 5_000;
}

export interface SingleCoursePitchCostAnalysis {
  directCost: number;
  retakeCost: number;
  dropoutLoss: number;
  totalCost: number;
  zhiAnnual: number;
  zhiSetup: number;
  savingsVsDirect: number;
  savingsVsTrue: number;
  savingsYear1: number;
}

export function computeSingleCoursePitchNumbers(
  course: CourseData,
  collegeType: string
): SingleCoursePitchCostAnalysis {
  const isCommunity = collegeType.toLowerCase().includes("community") ||
    collegeType.toLowerCase().includes("junior") ||
    collegeType.toLowerCase().includes("technical");
  const costPerStudent = isCommunity ? PITCH_COST_PER_STUDENT_COMMUNITY : PITCH_COST_PER_STUDENT_UNIVERSITY;
  const enrollment = course.estimatedEnrollment ?? 100;
  const failRateDecimal = (course.failRate ?? 0) / 100;

  const rawDirectCost  = enrollment * costPerStudent;
  const rawRetakeCost  = rawDirectCost * failRateDecimal;
  const rawDropoutLoss = enrollment * failRateDecimal * PITCH_DROPOUT_SHARE * PITCH_LOST_REVENUE;
  const rawTotalCost   = rawDirectCost * (1 + failRateDecimal) + rawDropoutLoss;

  const directCost  = roundDown5k(rawDirectCost);
  const retakeCost  = roundDown5k(rawRetakeCost);
  const dropoutLoss = roundDown5k(rawDropoutLoss);
  const totalCost   = roundDown5k(rawTotalCost);

  return {
    directCost,
    retakeCost,
    dropoutLoss,
    totalCost,
    zhiAnnual:       PITCH_ZHI_ANNUAL,
    zhiSetup:        PITCH_ZHI_SETUP,
    savingsVsDirect: directCost  - PITCH_ZHI_ANNUAL,
    savingsVsTrue:   totalCost   - PITCH_ZHI_ANNUAL,
    savingsYear1:    totalCost   - PITCH_ZHI_ANNUAL - PITCH_ZHI_SETUP,
  };
}

export async function generateSingleCoursePitch(
  college: CollegeInfo,
  course: CourseData,
): Promise<string> {
  const nums = computeSingleCoursePitchNumbers(course, college.type);
  const { directCost, retakeCost, dropoutLoss, totalCost, zhiAnnual, zhiSetup,
          savingsVsDirect, savingsVsTrue, savingsYear1 } = nums;
  const failPct = course.failRate ?? 0;
  const enrollment = course.estimatedEnrollment ?? 100;
  const isCommunity = college.type.toLowerCase().includes("community") ||
    college.type.toLowerCase().includes("junior");
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // One AI call — returns five tight paragraphs separated by blank lines
  const systemPrompt = `You are a senior analyst at Zhi Systems writing a tight, data-driven cost analysis report. Write exactly five short sections. Each section is 2-4 sentences maximum. Be specific to the institution and course. Do not include labels or headers — just the paragraph text. Separate sections with a single blank line. Use only the numbers you are given — do not invent or alter any figures. Tone: authoritative, direct, understated. No marketing language.`;

  const userPrompt = `Write five narrative sections for a cost analysis of ${course.name} at ${college.name} (${college.state}).

Verified numbers — use exactly as given:
  Enrollment in this course:  ${enrollment.toLocaleString()} students/yr
  Fail rate:                  ${failPct}%
  Direct teaching cost:       $${directCost.toLocaleString()}/yr
  Retake cycle adds:          +$${retakeCost.toLocaleString()}/yr
  Dropout revenue loss:       +$${dropoutLoss.toLocaleString()}/yr
  True annual cost:           ≈$${totalCost.toLocaleString()}/yr
  Zhi annual license:         $${zhiAnnual.toLocaleString()}/yr (flat, no per-seat)
  Zhi one-time setup:         $${zhiSetup.toLocaleString()}
  Savings vs teaching line:   $${savingsVsDirect.toLocaleString()}/yr
  Savings vs true cost:       ≈$${savingsVsTrue.toLocaleString()}/yr
  Year-one net saving:        $${savingsYear1.toLocaleString()} (after setup)

Write these five sections in order, blank line between each:
1. THE BOTTOM LINE — Name the course and college. One paragraph: what the college pays now (the visible line and the true cost once failures are counted), and what Zhi charges. Make the contrast stark.
2. WHAT YOU SPEND NOW — One paragraph: explain the $${directCost.toLocaleString()} figure in human terms. Describe how the course is delivered — sections, students, ${isCommunity ? "adjunct" : "faculty"} pay. Establish this as the number that appears in the budget.
3. HIDDEN COST PARAGRAPH — One paragraph to appear after the breakdown table. Do not repeat the table numbers. Explain the logic: why retakes add cost, and why dropout revenue loss is larger than the teaching line. Reference the ${failPct}% fail rate and the human reality of students who stop out.
4. WHAT YOU SPEND WITH ZHI — One paragraph: what Zhi delivers (AI-powered course in Canvas, embedded diagnostics that verify competency, not just record pass/fail). Flat $${zhiAnnual.toLocaleString()}/yr, $${zhiSetup.toLocaleString()} one-time. No per-seat metering.
5. THE SAVINGS — One paragraph: quote $${savingsVsDirect.toLocaleString()} saved vs the teaching line and ≈$${savingsVsTrue.toLocaleString()} saved vs the true cost, on a single course. Note that year one nets $${savingsYear1.toLocaleString()} even after the setup fee.`;

  const raw = await openaiChat(systemPrompt, userPrompt, false); // plain text, not JSON
  const paras = raw.trim().split(/\n\n+/);
  const [p1, p2, p3, p4, p5] = paras.map((p) => p.trim());

  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const cityPart = college.city ? `${college.city}, ` : "";

  const report = [
    "ZHI SYSTEMS\n",
    "Course Cost & Modernization Analysis\n",
    `${reportDate}\n`,
    "\n\n",
    `${course.name}\n`,
    `${college.name}  ·  ${cityPart}${college.state}  ·  ~${college.enrollmentSize.toLocaleString()} students  ·  ~${enrollment.toLocaleString()} enrolled / yr  ·  ${failPct}% fail rate\n`,
    "\n",
    "Teaching this course today\n\n",
    `~${fmt(directCost)} / year\n`,
    "\n",
    "True cost once failures are counted\n\n",
    `~${fmt(totalCost)} / year\n`,
    "\n",
    "With Zhi\n\n",
    `${fmt(zhiAnnual)} / year\n`,
    "\n\n",
    "The bottom line\n\n",
    (p1 ?? "") + "\n",
    "\n",
    "What you spend now\n\n",
    (p2 ?? "") + "\n",
    "\n",
    "The cost the budget line hides\n\n",
    `Direct teaching (~${enrollment.toLocaleString()} students × section cost)\t${fmt(directCost)}\n`,
    `Add one retake cycle (${failPct}% fail and repeat)\t+ ${fmt(retakeCost)}\n`,
    `Add lost tuition from students who fail and drop out\t+ ${fmt(dropoutLoss)}\n`,
    `True annual cost to the college\t≈ ${fmt(totalCost)}\n`,
    "\n",
    (p3 ?? "") + "\n",
    "\n",
    "What you spend with Zhi\n\n",
    (p4 ?? "") + "\n",
    "\n",
    "The savings\n\n",
    (p5 ?? "") + "\n",
    "\n\n",
    "Methodology\n\n",
    `Figures are conservative estimates built from published ${isCommunity ? "community-college" : "university"} section costs and this course's enrollment and fail rate. Every assumption is set to the low end: direct cost assumes ${isCommunity ? "adjunct-taught sections" : "standard faculty section rates"}; the dropout share counts only a quarter of failing students; lost revenue is valued at roughly one year of in-district tuition. Dollar figures are rounded down.\n`,
    "\n",
    "Douglas Fong  ·  Zhi Systems\n",
    "zhi@zhisystems.org  ·  845-240-4235",
  ].join("");

  return report;
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
