import app from "./app";
import { logger } from "./lib/logger";
import { db, seedCollegesIfEmpty } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Auto-seed colleges on first boot ────────────────────────────────────────
// If the colleges table is empty (e.g. fresh production deploy), download and
// insert the full IPEDS HD2023 dataset before accepting requests.
async function ensureCollegesSeeded(): Promise<void> {
  try {
    const inserted = await seedCollegesIfEmpty();
    if (inserted > 0) {
      logger.info({ inserted }, "Auto-seeded colleges from IPEDS HD2023");
    }
  } catch (err) {
    // Log but don't crash — the server should still start even if seeding fails.
    logger.error({ err }, "Auto-seed failed; server will start without college data");
  }
}

ensureCollegesSeeded().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
