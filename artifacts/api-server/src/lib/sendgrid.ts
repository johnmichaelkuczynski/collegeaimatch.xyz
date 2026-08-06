import sgMail from "@sendgrid/mail";

const FROM_EMAIL = "zhi@zhisystems.org";
const FROM_NAME = "Douglas Fong · Zhi Systems";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

interface CourseSummary {
  name?: string | null;
  failRate?: number | null;
  estimatedAnnualCost?: number | null;
  aiAnnualCost?: number | null;
}

interface CostAnalysisSummary {
  totalCurrentAnnualCost?: number;
  totalAiAnnualCost?: number;
  totalAiInstallCost?: number;
  savingsAnnual?: number;
}

export interface SendProposalEmailParams {
  to: string;
  recipientName?: string;
  collegeName: string;
  outreachLetter: string;
  proposalId?: number;
  emailLogId?: string;
  courses?: CourseSummary[] | null;
  costAnalysis?: CostAnalysisSummary | null;
  /** Selected virtue strings from the proposal — used to reorder feature cards. Empty = default order. */
  aiVirtues?: string[] | null;
}

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

function buildRoiTable(
  courses: CourseSummary[],
  costAnalysis: CostAnalysisSummary
): string {
  const rows = courses
    .filter((c) => c.name)
    .map((c) => {
      const current = c.estimatedAnnualCost ?? 0;
      const ai = c.aiAnnualCost ?? 18_000;
      const saves = current - ai;
      const failRateHtml =
        (c.failRate ?? 0) > 20
          ? `<span style="color:#dc2626;font-weight:600;">${c.failRate}%</span>`
          : c.failRate
          ? `${c.failRate}%`
          : "—";
      return `
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:5px 10px;font-size:11px;color:#1f2937;">${c.name}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;">${failRateHtml}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;font-family:monospace;">${current > 0 ? fmt(current) : "—"}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(ai)}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;font-family:monospace;font-weight:700;color:#16a34a;">${saves > 0 ? fmt(saves) : "—"}</td>
        </tr>`;
    })
    .join("");

  const courseData = courses.filter((c) => c.name).map((c) => ({
    name: c.name!,
    current: c.estimatedAnnualCost ?? 0,
    ai: c.aiAnnualCost ?? 18_000,
    saves: (c.estimatedAnnualCost ?? 0) - (c.aiAnnualCost ?? 18_000),
  }));
  const totalCurrent = courseData.reduce((s, c) => s + c.current, 0);
  const totalAi      = courseData.reduce((s, c) => s + c.ai, 0);
  const totalSaves   = totalCurrent - totalAi;
  const setupCost    = costAnalysis.totalAiInstallCost ?? 0;
  const maxSaves     = Math.max(...courseData.map((c) => c.saves), 1);

  // ── HTML bar helper (compact) ─────────────────────────────────────────────
  const bar = (value: number, max: number, color: string) => {
    const pct = Math.round((value / max) * 100);
    return `<table width="100%" cellpadding="0" cellspacing="0" style="height:14px;">
      <tr>
        <td width="${pct}%" style="background:${color};border-radius:3px;height:12px;"></td>
        <td width="${100 - pct}%"></td>
      </tr>
    </table>`;
  };

  // ── Comparison chart rows ─────────────────────────────────────────────────
  const comparisonRows = `
    <tr>
      <td style="padding:4px 10px 2px;font-size:11px;color:#374151;white-space:nowrap;width:100px;">Current Costs</td>
      <td style="padding:4px 10px 2px;">${bar(totalCurrent, totalCurrent, "#dc2626")}</td>
      <td style="padding:4px 10px 2px;font-size:11px;font-family:monospace;color:#dc2626;white-space:nowrap;text-align:right;">${fmt(totalCurrent)}</td>
    </tr>
    <tr>
      <td style="padding:2px 10px 4px;font-size:11px;color:#374151;">With AI</td>
      <td style="padding:2px 10px 4px;">${bar(totalAi, totalCurrent, "#16a34a")}</td>
      <td style="padding:2px 10px 4px;font-size:11px;font-family:monospace;color:#16a34a;text-align:right;">${fmt(totalAi)}</td>
    </tr>`;

  // ── Per-course savings bar rows ───────────────────────────────────────────
  const savingsBarRows = courseData
    .filter((c) => c.saves > 0)
    .map((c) => `
    <tr>
      <td style="padding:2px 10px;font-size:10px;color:#374151;white-space:nowrap;width:150px;">${c.name.length > 22 ? c.name.slice(0, 20) + "…" : c.name}</td>
      <td style="padding:2px 10px;">${bar(c.saves, maxSaves, "#16a34a")}</td>
      <td style="padding:2px 10px;font-size:10px;font-family:monospace;font-weight:700;color:#16a34a;white-space:nowrap;text-align:right;">${fmt(c.saves)}</td>
    </tr>`).join("");

  return `
  <!-- ROI Analysis -->
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:8px;margin:0 0 28px 0;overflow:hidden;font-family:sans-serif;">

    <!-- Header -->
    <tr>
      <td colspan="5" style="background:#f9fafb;padding:10px 14px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;font-weight:700;color:#374151;letter-spacing:0.03em;">
          📊 COURSE-LEVEL ROI ANALYSIS — ${courseData.length} course${courseData.length !== 1 ? "s" : ""}
        </span>
      </td>
    </tr>

    <!-- Summary tiles -->
    <tr>
      <td colspan="2" style="padding:12px 14px;background:#fff7f7;text-align:center;border-right:1px solid #e5e7eb;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.04em;">Current Annual Cost</div>
        <div style="font-size:17px;font-weight:700;color:#dc2626;font-family:monospace;">${fmt(totalCurrent)}</div>
      </td>
      <td colspan="1" style="padding:12px 14px;background:#ffffff;text-align:center;border-right:1px solid #e5e7eb;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.04em;">Zhi AI Annual License</div>
        <div style="font-size:17px;font-weight:700;color:#1f2937;font-family:monospace;">${fmt(totalAi)}</div>
        ${setupCost ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;">+ ${fmt(setupCost)} one-time setup</div><div style="font-size:10px;color:#16a34a;margin-top:1px;font-weight:600;">incl. 5 yrs free maintenance</div>` : ""}
      </td>
      <td colspan="2" style="padding:12px 14px;background:#f0fdf4;text-align:center;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.04em;">Annual Savings</div>
        <div style="font-size:17px;font-weight:700;color:#16a34a;font-family:monospace;">${fmt(totalSaves)}</div>
      </td>
    </tr>

    <!-- Comparison bar chart + per-course savings side by side -->
    <tr>
      <td colspan="3" style="padding:10px 0 6px;border-top:1px solid #e5e7eb;vertical-align:top;width:50%;">
        <div style="padding:0 10px;font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">
          Current Burden vs. AI Integration
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">${comparisonRows}</table>
      </td>
      <td colspan="2" style="padding:10px 0 6px;border-top:1px solid #e5e7eb;border-left:1px solid #f3f4f6;vertical-align:top;width:50%;">
        <div style="padding:0 10px;font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">
          Annual Savings per Course
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">${savingsBarRows}</table>
      </td>
    </tr>

    <!-- Table header -->
    <tr style="background:#f3f4f6;border-top:1px solid #e5e7eb;">
      <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Course</td>
      <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Fail Rate</td>
      <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Current/yr</td>
      <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">AI/yr</td>
      <td style="padding:6px 10px;font-size:10px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Saves/yr</td>
    </tr>
    ${rows}
    <!-- Total row -->
    <tr style="border-top:2px solid #d1fae5;background:#f0fdf4;font-weight:700;">
      <td colspan="2" style="padding:7px 10px;font-size:11px;color:#1f2937;">Total</td>
      <td style="padding:7px 10px;font-size:11px;text-align:right;font-family:monospace;">${fmt(totalCurrent)}</td>
      <td style="padding:7px 10px;font-size:11px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(totalAi)}</td>
      <td style="padding:7px 10px;font-size:11px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(totalSaves)}</td>
    </tr>
  </table>`;
}

function orderVirtueCards(
  virtues: Array<{ icon: string; title: string; body: string }>,
  aiVirtues: string[]
): Array<{ icon: string; title: string; body: string }> {
  if (!aiVirtues || aiVirtues.length === 0) return virtues;

  // Keyword fingerprints to match aiVirtues strings against card titles
  const KEYWORDS: Record<string, string[]> = {
    "24/7 Built-In Tutors":             ["24/7"],
    "Cheat-Proof by Design":            ["cheat-proof", "cheat proof"],
    "Industry-Aligned Progress":        ["industry-aligned"],
    "Fixed Assessments, Adaptive Lectures": ["fixed assessments", "adaptive lectures"],
    "Verified Mastery":                 ["verified mastery"],
    "5-Year Free Maintenance Guarantee": [], // never matched; always stays at end
  };

  const lowerVirtues = aiVirtues.map((v) => v.toLowerCase());

  const isSelected = (title: string) => {
    const kws = KEYWORDS[title] ?? [];
    return kws.some((k) => lowerVirtues.some((v) => v.includes(k)));
  };

  // Maintenance guarantee always goes last; selected virtues bubble to top
  const maintenance = virtues.filter((v) => v.title === "5-Year Free Maintenance Guarantee");
  const rest = virtues.filter((v) => v.title !== "5-Year Free Maintenance Guarantee");
  const selected = rest.filter((v) => isSelected(v.title));
  const unselected = rest.filter((v) => !isSelected(v.title));
  return [...selected, ...unselected, ...maintenance];
}
export async function sendProposalEmail(params: SendProposalEmailParams): Promise<void> {
  const { to, recipientName, collegeName, outreachLetter, courses, costAnalysis, aiVirtues } = params;

  // Strip markdown bold markers that sometimes leak through
  const cleanLetter = outreachLetter.replace(/\*\*/g, "");

  // Convert the plain-text letter to a clean HTML version
  // 13pt font, compact line-height (1.35) per user spec
  const bodyHtml = cleanLetter
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return `<div style="height:6px;"></div>`;
      // Section headers (### markdown or ALL CAPS lines)
      if (trimmed.startsWith("###")) {
        const text = trimmed.replace(/^###\s*/, "");
        return `<h3 style="margin:16px 0 4px;font-family:sans-serif;letter-spacing:0.04em;font-size:11px;text-transform:uppercase;color:#6b7280;">${text}</h3>`;
      }
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 4 && !/^\d/.test(trimmed)) {
        return `<h3 style="margin:16px 0 4px;font-family:sans-serif;letter-spacing:0.04em;font-size:11px;text-transform:uppercase;color:#6b7280;">${trimmed}</h3>`;
      }
      // Bullet / numbered list items — slightly indented
      if (/^[-•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        return `<p style="margin:0 0 5px 14px;font-family:Georgia,serif;font-size:13pt;line-height:1.35;color:#1f2937;">${trimmed}</p>`;
      }
      return `<p style="margin:0 0 7px;font-family:Georgia,serif;font-size:13pt;line-height:1.35;color:#1f2937;">${trimmed}</p>`;
    })
    .join("\n");

  // Build ROI table if course data is available
  const hasCourseData = courses && courses.length > 0 && costAnalysis;
  const roiTableHtml = hasCourseData ? buildRoiTable(courses, costAnalysis) : "";

  // Zhi Systems feature showcase — reorder so selected virtues appear first
  const baseVirtues = [
    { icon: "🕐", title: "24/7 Built-In Tutors", body: "Every student has on-demand, personalized instruction — eliminating the access gap that stalls most online learning." },
    { icon: "🔒", title: "Cheat-Proof by Design", body: "Assessments cannot be gamed, so course completion actually certifies competence employers can rely on." },
    { icon: "📈", title: "Industry-Aligned Progress", body: "Advancement is benchmarked to professional standards, making the credential something hiring managers trust." },
    { icon: "🎯", title: "Fixed Assessments, Adaptive Lectures", body: "Tests and homework stay locked for rigor, while lectures flex in length, depth, and style to fit each learner." },
    { icon: "✅", title: "Verified Mastery", body: "Adaptation never dilutes standards — retention and mastery are confirmed, not assumed." },
    { icon: "🛡️", title: "5-Year Free Maintenance Guarantee", body: "The one-time setup fee locks in five full years of platform maintenance at no additional cost — zero budget surprises." },
  ];
  const virtues = orderVirtueCards(baseVirtues, aiVirtues ?? []);
  const virtueCards = virtues.map((v) => `
    <tr>
      <td width="36" style="padding:10px 6px 10px 14px;vertical-align:top;font-size:20px;">${v.icon}</td>
      <td style="padding:10px 14px 10px 0;vertical-align:top;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:2px;">${v.title}</div>
        <div style="font-size:12px;color:#4b5563;line-height:1.4;">${v.body}</div>
      </td>
    </tr>`).join("");

  const virtuesHtml = `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:8px;margin:28px 0;overflow:hidden;font-family:sans-serif;">
    <tr>
      <td colspan="2" style="background:#111827;padding:12px 14px;">
        <span style="font-size:12px;font-weight:700;color:#ffffff;letter-spacing:0.03em;">
          ✦ WHY ZHI SYSTEMS — WHAT MAKES THIS DIFFERENT
        </span>
      </td>
    </tr>
    ${virtueCards}
    <tr>
      <td colspan="2" style="padding:10px 14px;background:#f9fafb;text-align:center;">
        <a href="https://zhisystems.ai/" style="font-size:12px;color:#4f46e5;font-weight:600;text-decoration:none;">
          Learn more at zhisystems.ai →
        </a>
      </td>
    </tr>
  </table>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#f3f4f6;margin:0;padding:24px 16px;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;">
    <!-- Zhi Systems header -->
    <tr>
      <td style="background:#111827;padding:18px 28px;border-radius:8px 8px 0 0;">
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Zhi Systems</p>
        <p style="margin:3px 0 0;color:#9ca3af;font-size:12px;">AI-Powered Courseware for Higher Education</p>
        <p style="margin:6px 0 0;">
          <a href="https://zhisystems.ai/" style="color:#818cf8;font-size:12px;text-decoration:none;letter-spacing:0.02em;">zhisystems.ai</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:28px 28px 36px;border-radius:0 0 8px 8px;">

        <!-- ROI charts first — compact, same proportions -->
        ${roiTableHtml}

        <!-- Letter body — 13pt font, 1.35 line-height -->
        ${bodyHtml}

        <!-- Why Zhi Systems -->
        ${virtuesHtml}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="margin:0;font-family:sans-serif;font-size:11px;color:#9ca3af;">
          This proposal was prepared by Zhi Systems. Questions? Reply to this email or contact us at
          <a href="mailto:zhi@zhisystems.org" style="color:#4f46e5;">zhi@zhisystems.org</a> · 845-240-4235 ·
          <a href="https://zhisystems.ai/" style="color:#4f46e5;">zhisystems.ai</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Zhi Systems AI Courseware Proposal — ${collegeName}`,
    text: cleanLetter,
    html,
    // custom_args are echoed back in every SendGrid webhook event so the
    // webhook handler can find the exact log entry to update
    ...(params.proposalId != null && params.emailLogId
      ? {
          customArgs: {
            proposalId: String(params.proposalId),
            emailLogId: params.emailLogId,
          },
        }
      : {}),
  });
}
