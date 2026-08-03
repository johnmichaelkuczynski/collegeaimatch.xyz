---
name: AI cost calibration
description: Real cost benchmarks and Zhi Systems rate card used in the course cost model.
---

## Verified benchmark — Fresno State Developmental Math
- Current annual delivery: ~$780,000 (state university, high enrollment)
- Zhi Systems courseware price: $85,000 one-time install + $42,000/year license
- With diagnostics add-on: $113,000 install + $60,000/year

## Zhi Systems rate card (hardcoded in generateCourses post-processing)
- `aiInstallCost` = **$85,000** flat per course (Canvas-ready courseware build)
- `aiAnnualCost` = **$42,000** flat per course (annual license, no per-seat metering)
- These are FIXED, not enrollment-scaled, not a percentage of current cost.

**Why:** User confirmed these are empirically verified numbers from an actual Fresno State proposal. Previous model (15% of current cost) and earlier model ($30K/$10K) were both wrong.

**How to apply:** In `generateCourses` in `aiClient.ts`, after parsing AI response, always override with these fixed values. Never let the AI generate cost fields.

## Current-cost generation benchmarks (in system prompt)
- Community college section: $3,500–$5,500 (mostly adjuncts)
- State/regional university section: $5,000–$9,000
- Private college section: $8,000–$14,000
- estimatedAnnualCost = sections × avg_cost_per_section
- Community college range: $60K–$200K/year for high-enrollment courses (NOT $300K–$600K)

**Why:** GPT was wildly inflating current costs (3–4× real), making the AI savings look fake.
