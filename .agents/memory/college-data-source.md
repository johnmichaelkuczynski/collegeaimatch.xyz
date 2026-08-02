---
name: College data source
description: How and why college data is stored locally instead of fetched from the College Scorecard API
---

## Rule
College data is seeded into the local PostgreSQL `colleges` table from IPEDS HD2023, **not** fetched live from `api.data.ed.gov`.

**Why:** `api.data.ed.gov` is DNS-blocked in the Replit dev environment (`getaddrinfo ENOTFOUND`). `nces.ed.gov` (the IPEDS data host) is reachable. 4,153 US degree-granting active institutions were seeded from HD2023.zip.

**How to apply:**
- College search/detail routes query `collegesTable` (Drizzle) with ILIKE on `name` — one ILIKE condition per word in the query, so partial/typo queries still match.
- `api.data.ed.gov` must never be used. `nces.ed.gov` and `collegescorecard.ed.gov` resolve fine.
- To refresh/reseed: `node lib/db/seed-colleges.cjs --force`
- The seed script is at `lib/db/seed-colleges.cjs` (plain CJS — no tsx needed).
- Financial/enrollment data (tuition, completion rate) is estimated by institution type since Scorecard API is unreachable.
- AI (OpenAI/Gemini) is still used for course generation, contacts, proposals.
