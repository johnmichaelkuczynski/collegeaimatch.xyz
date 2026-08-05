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
  courses?: CourseSummary[] | null;
  costAnalysis?: CostAnalysisSummary | null;
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
          <td style="padding:8px 12px;font-size:13px;color:#1f2937;">${c.name}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:center;">${failRateHtml}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-family:monospace;">${fmt(current)}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(ai)}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-family:monospace;font-weight:700;color:#16a34a;">${fmt(saves)}</td>
        </tr>`;
    })
    .join("");

  const totalCurrent = costAnalysis.totalCurrentAnnualCost ?? 0;
  const totalAi = costAnalysis.totalAiAnnualCost ?? 0;
  const totalSaves = costAnalysis.savingsAnnual ?? totalCurrent - totalAi;
  const setupCost = costAnalysis.totalAiInstallCost ?? 0;

  return `
  <!-- ROI Analysis -->
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:8px;margin:32px 0;overflow:hidden;font-family:sans-serif;">
    <tr>
      <td colspan="5" style="background:#f9fafb;padding:14px 16px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px;font-weight:700;color:#374151;letter-spacing:0.03em;">
          📊 COURSE-LEVEL ROI ANALYSIS
        </span>
      </td>
    </tr>
    <!-- Summary tiles -->
    <tr>
      <td colspan="2" style="padding:16px;background:#fff7f7;text-align:center;border-right:1px solid #e5e7eb;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Current Annual Cost</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626;font-family:monospace;">${fmt(totalCurrent)}</div>
      </td>
      <td colspan="1" style="padding:16px;background:#ffffff;text-align:center;border-right:1px solid #e5e7eb;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Zhi AI Annual License</div>
        <div style="font-size:20px;font-weight:700;color:#1f2937;font-family:monospace;">${fmt(totalAi)}</div>
        ${setupCost ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">+ ${fmt(setupCost)} one-time setup</div>` : ""}
      </td>
      <td colspan="2" style="padding:16px;background:#f0fdf4;text-align:center;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Annual Savings</div>
        <div style="font-size:20px;font-weight:700;color:#16a34a;font-family:monospace;">${fmt(totalSaves)}</div>
      </td>
    </tr>
    <!-- Table header -->
    <tr style="background:#f3f4f6;border-top:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Course</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Fail Rate</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Current/yr</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">AI/yr</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Saves/yr</td>
    </tr>
    ${rows}
    <!-- Total row -->
    <tr style="border-top:2px solid #d1fae5;background:#f0fdf4;font-weight:700;">
      <td colspan="2" style="padding:10px 12px;font-size:13px;color:#1f2937;">Total</td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;">${fmt(totalCurrent)}</td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(totalAi)}</td>
      <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;color:#16a34a;">${fmt(totalSaves)}</td>
    </tr>
  </table>`;
}

export async function sendProposalEmail(params: SendProposalEmailParams): Promise<void> {
  const { to, recipientName, collegeName, outreachLetter, courses, costAnalysis } = params;

  // Strip markdown bold markers that sometimes leak through
  const cleanLetter = outreachLetter.replace(/\*\*/g, "");

  // Convert the plain-text letter to a clean HTML version
  const bodyHtml = cleanLetter
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";
      // Section headers (ALL CAPS lines or lines ending with colon)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 4) {
        return `<h3 style="margin:24px 0 4px;font-family:sans-serif;letter-spacing:0.05em;font-size:12px;text-transform:uppercase;color:#6b7280;">${trimmed}</h3>`;
      }
      return `<p style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;line-height:1.65;color:#1f2937;">${trimmed}</p>`;
    })
    .join("\n");

  // Build ROI table if course data is available
  const hasCourseData =
    courses && courses.length > 0 && costAnalysis;
  const roiTableHtml = hasCourseData
    ? buildRoiTable(courses, costAnalysis)
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#f3f4f6;margin:0;padding:32px 16px;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;">
    <tr>
      <td style="background:#111827;padding:24px 32px;border-radius:8px 8px 0 0;">
        <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Zhi Systems</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">AI-Powered Courseware for Higher Education</p>
        <p style="margin:8px 0 0;">
          <a href="https://zhisystems.ai/" style="color:#818cf8;font-size:13px;text-decoration:none;letter-spacing:0.02em;">zhisystems.ai</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:40px 32px;border-radius:0 0 8px 8px;">
        ${bodyHtml}
        ${roiTableHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;"/>
        <p style="margin:0;font-family:sans-serif;font-size:12px;color:#9ca3af;">
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
  });
}
