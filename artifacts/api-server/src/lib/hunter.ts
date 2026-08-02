import { logger } from "./logger";

const BASE = "https://api.hunter.io/v2";

export interface HunterEmail {
  email: string;
  score: number;
  verified: boolean;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  department: string | null;
  seniority: string | null;
}

/**
 * Find a verified email for a specific person at a domain.
 * Returns null if Hunter can't find one.
 */
export async function findEmail(params: {
  domain: string;
  firstName: string;
  lastName: string;
}): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  try {
    const qs = new URLSearchParams({
      domain: params.domain,
      first_name: params.firstName,
      last_name: params.lastName,
      api_key: apiKey,
    });
    const res = await fetch(`${BASE}/email-finder?${qs}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { email?: string; score?: number };
      errors?: unknown;
    };
    const email = json.data?.email;
    const score = json.data?.score ?? 0;
    // Only return if confidence is reasonable
    return email && score >= 40 ? email : null;
  } catch (err) {
    logger.warn({ err }, "Hunter email-finder failed");
    return null;
  }
}

/**
 * Verify whether an email address is valid.
 */
export async function verifyEmail(email: string): Promise<boolean> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return true; // assume valid if no key

  try {
    const qs = new URLSearchParams({ email, api_key: apiKey });
    const res = await fetch(`${BASE}/email-verifier?${qs}`);
    if (!res.ok) return false;
    const json = (await res.json()) as {
      data?: { status?: string; result?: string };
    };
    const status = json.data?.status;
    return status === "valid" || status === "accept_all";
  } catch {
    return true;
  }
}

/**
 * Enrich a list of contacts with verified emails from Hunter.
 * Fires all requests in parallel; falls back to the existing email if Hunter fails.
 */
export async function enrichContactEmails(
  contacts: Array<{ name: string; email: string }>,
  domain: string
): Promise<string[]> {
  return Promise.all(
    contacts.map(async (c) => {
      // Parse first/last from name (handles "Martin Maliwesky, Ph.D." etc.)
      const clean = c.name.replace(/,.*$/, "").trim(); // strip suffixes
      const parts = clean.split(/\s+/);
      if (parts.length < 2) return c.email; // can't split name, keep existing

      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      const found = await findEmail({ domain, firstName, lastName });
      return found ?? c.email;
    })
  );
}
