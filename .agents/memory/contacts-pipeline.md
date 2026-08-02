---
name: Contacts pipeline
description: How college contacts are sourced — real names, real emails, no fake 555 numbers
---

## Rule
Contacts are built in three stages: SerpAPI → AI name extraction → Hunter.io email enrichment.

**Why:** AI-only generation produced fake names (Jane Smith), 555 phone numbers, and invalid LinkedIn URLs. Hunter.io provides verified emails; SerpAPI finds real names from web snippets.

## Pipeline
1. `findCollegeLeadership(name, url)` in `serpapi.ts` — 4 parallel SerpAPI searches, extracts real emails/phones via regex from snippets.
2. `generateContacts(...)` in `aiClient.ts` — AI extracts ONLY names that appear in snippets; strict prompt bans invented names, 555 numbers, fake LinkedIn URLs.
3. Post-processing filters: FAKE_NAMES set, student-ID email regex (`/^[a-z]{1,3}\d{5,}@/`), 555-0xxx killer, dedup by name.
4. `enrichContactEmails(contacts, domain)` in `hunter.ts` — calls Hunter.io email-finder per contact; falls back to constructed email if score < 40.

## How to apply
- `HUNTER_API_KEY` secret must be set.
- LinkedIn URLs are never generated; the frontend builds a LinkedIn people-search URL from name + college.
- It's intentional to return 2 real contacts rather than 6 invented ones.
- College pages use JS rendering so direct HTML scraping doesn't work — SerpAPI is the only reliable web source.
