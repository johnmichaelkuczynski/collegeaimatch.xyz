import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, proposalsTable } from "@workspace/db";

const router: IRouter = Router();

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  reason?: string;
  custom_args?: Record<string, string>;
}

/**
 * POST /webhooks/sendgrid
 * Receives delivery event notifications from SendGrid and updates
 * the matching emailLog entry on the proposal.
 *
 * Required SendGrid setup:
 *   Dashboard → Settings → Mail Settings → Event Webhook
 *   URL: https://<your-domain>/webhooks/sendgrid
 *   Events: Delivered, Opens, Bounces, Spam Reports
 */
router.post("/webhooks/sendgrid", async (req, res): Promise<void> => {
  const events: SendGridEvent[] = Array.isArray(req.body) ? req.body : [];

  for (const evt of events) {
    const { event, timestamp, reason, custom_args } = evt;
    if (!custom_args?.proposalId || !custom_args?.emailLogId) continue;

    const proposalId = parseInt(custom_args.proposalId, 10);
    if (isNaN(proposalId)) continue;

    try {
      const [proposal] = await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.id, proposalId));
      if (!proposal) continue;

      const log: Record<string, unknown>[] = Array.isArray(proposal.emailLog)
        ? (proposal.emailLog as Record<string, unknown>[])
        : [];

      const idx = log.findIndex(
        (e) => e.emailLogId === custom_args.emailLogId
      );
      if (idx === -1) continue;

      const entry = { ...log[idx] };
      const ts = new Date(timestamp * 1000).toISOString();

      if (event === "delivered") {
        entry.status = "delivered";
        entry.deliveredAt = ts;
      } else if (event === "open") {
        // Only promote to "opened" — don't downgrade from opened back to delivered
        entry.status = "opened";
        if (!entry.openedAt) entry.openedAt = ts;
      } else if (event === "bounce" || event === "blocked") {
        entry.status = "bounced";
        entry.bounceReason = reason ?? "Unknown";
      } else if (event === "spamreport") {
        entry.status = "spam";
      } else {
        // click, unsubscribe, etc. — no status change needed
        continue;
      }

      const updated = [...log];
      updated[idx] = entry;

      await db
        .update(proposalsTable)
        .set({ emailLog: updated })
        .where(eq(proposalsTable.id, proposalId));
    } catch (err) {
      // Log and continue — never let one bad event fail the whole batch
      console.error("Webhook event processing failed", { event, err });
    }
  }

  // Always 200 — SendGrid retries on non-2xx
  res.sendStatus(200);
});

export default router;
