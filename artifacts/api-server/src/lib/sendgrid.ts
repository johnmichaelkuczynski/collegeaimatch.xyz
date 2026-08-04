import sgMail from "@sendgrid/mail";

const FROM_EMAIL = "zhi@zhisystems.org";
const FROM_NAME = "Douglas Fong · Zhi Systems";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export interface SendProposalEmailParams {
  to: string;
  recipientName?: string;
  collegeName: string;
  outreachLetter: string;
  proposalId: number;
}

export async function sendProposalEmail(params: SendProposalEmailParams): Promise<void> {
  const { to, recipientName, collegeName, outreachLetter, proposalId } = params;

  const greeting = recipientName ? `Dear ${recipientName},` : "Dear Colleague,";

  // Convert the plain-text letter to a clean HTML version
  const bodyHtml = outreachLetter
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
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:40px 32px;border-radius:0 0 8px 8px;">
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;"/>
        <p style="margin:0;font-family:sans-serif;font-size:12px;color:#9ca3af;">
          This proposal was prepared by Zhi Systems. Questions? Reply to this email or contact us at
          <a href="mailto:zhi@zhisystems.org" style="color:#4f46e5;">zhi@zhisystems.org</a> · 845-240-4235
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
    text: outreachLetter,
    html,
  });
}
