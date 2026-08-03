---
name: AI cost calibration
description: Real cost benchmarks and Zhi Systems rate card used in the course cost model.
---

## Verified benchmark — Fresno State Developmental Math (authoritative)
- Current annual delivery: ~$500,000 (~90 sections/yr at CSU section rates)
- Zhi Systems setup: $85,000 one-time
- Zhi Systems annual license: $18,000/year (flat, no per-seat, no enrollment escalation)
- Year-1 total: $103,000. Saves ~$397,000 year 1, ~$482,000 every year after.

## Zhi Systems rate card (hardcoded in generateCourses post-processing)
- `aiInstallCost` = **$85,000** flat per course (Canvas-ready courseware build)
- `aiAnnualCost` = **$18,000** flat per course (annual license, no per-seat metering)
- These are FIXED, not enrollment-scaled, not a percentage of current cost.

**Why:** Second Fresno State document is the authoritative benchmark. First document ($42K/yr) was incorrect per user. Earlier models (15% or $10K/yr) were also wrong.

**How to apply:** In `generateCourses` in `aiClient.ts`, after parsing AI response, always override with these fixed values. Never let the AI generate cost fields.

## Current-cost generation benchmarks (in system prompt)
- Community college section: $3,500–$5,500 (mostly adjuncts)
- State/regional university section: $5,000–$9,000
- Private college section: $8,000–$14,000
- estimatedAnnualCost = sections × avg_cost_per_section
- Community college range: $60K–$200K/year for high-enrollment courses (NOT $300K–$600K)

**Why:** GPT was wildly inflating current costs (3–4× real), making the AI savings look fake.
