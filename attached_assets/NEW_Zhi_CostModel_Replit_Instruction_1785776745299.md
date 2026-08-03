# Build Instruction: Course Cost Estimator

**For:** Replit agent
**Feature:** Per-course cost model shown on the "Generate Proposal" pop-up

## Goal

For any course row (e.g. "Remedial Math" at "College of DuPage"), compute and display **three numbers**:

1. **Direct course cost** — what the college spends to *teach the course itself* (instructor pay only; no dropout/collateral damage).
2. **Total cost to the college** — a ballpark that *also* accounts for retakes and the revenue lost when failed students drop out.
3. **Cost with Zhi** — the flat price of our service.

**Golden rule: always err LOW.** Every constant below is set to the conservative (low) end of a defensible range. If in doubt, round *down*. We would rather understate the college's current spend than be accused of inflating it.

## Inputs (already present in each course row)

- `enrollment` — integer (e.g. `750`)
- `failRate` — decimal 0–1 (e.g. `0.40` for 40%)
- `institutionType` — `"community"` or `"university"` (default `"community"`)

## Tunable constants (put these at the top of the file)

```js
const COST_PER_STUDENT_DIRECT = 150;   // $/student, community college adjunct-taught (~$4,500/section ÷ 30)
const COST_PER_STUDENT_UNIV    = 300;  // $/student, 4-year (full-time faculty + benefits); use if institutionType === "university"
const DROPOUT_SHARE            = 0.25;  // share of FAILERS who leave entirely (conservative — most estimates are higher)
const LOST_REVENUE_PER_DROPOUT = 3000;  // $ lost per dropout (~1 yr in-district tuition; deliberately low)
const ZHI_ANNUAL_LICENSE       = 18000; // $/year, flat — no per-seat metering
const ZHI_ONE_TIME_SETUP       = 85000; // $ one-time (show separately, not in the annual comparison)
```

## Formulas

```
directCost   = enrollment × costPerStudent
totalCost    = directCost × (1 + failRate)            // one retake cycle
             + (enrollment × failRate × DROPOUT_SHARE) × LOST_REVENUE_PER_DROPOUT
zhiCost      = ZHI_ANNUAL_LICENSE                     // plus ZHI_ONE_TIME_SETUP shown separately
```

Where `costPerStudent` is `COST_PER_STUDENT_DIRECT` for community colleges, `COST_PER_STUDENT_UNIV` for universities.

Round every displayed dollar figure **down** to the nearest $5,000.

## Drop-in function

```js
function estimateCourseCosts({ enrollment, failRate, institutionType = "community" }) {
  const costPerStudent =
    institutionType === "university" ? COST_PER_STUDENT_UNIV : COST_PER_STUDENT_DIRECT;

  const directCost = enrollment * costPerStudent;

  const retakeCost  = directCost * (1 + failRate);
  const dropouts    = enrollment * failRate * DROPOUT_SHARE;
  const lostRevenue = dropouts * LOST_REVENUE_PER_DROPOUT;
  const totalCost   = retakeCost + lostRevenue;

  const roundDown = (n) => Math.floor(n / 5000) * 5000;

  return {
    directCost:  roundDown(directCost),   // (1) teaching only
    totalCost:   roundDown(totalCost),    // (2) ballpark, incl. retakes + dropout loss
    zhiAnnual:   ZHI_ANNUAL_LICENSE,      // (3) our annual license
    zhiSetup:    ZHI_ONE_TIME_SETUP,      // one-time, show separately
  };
}
```

## Validation — expected output (community college)

Run these four and confirm the numbers match:

| Course | enrollment | failRate | (1) Direct | (2) Total | (3) Zhi |
|---|---|---|---|---|---|
| Remedial Math | 750 | 0.40 | $110,000 | $380,000 | $18,000/yr |
| Composition I | 1200 | 0.25 | $180,000 | $450,000 | $18,000/yr |
| Intro to Psychology | 1000 | 0.30 | $150,000 | $420,000 | $18,000/yr |
| Ethics | 500 | 0.35 | $75,000 | $230,000 | $18,000/yr |

(Small rounding differences of one $5,000 step are fine.)

## Display on the pop-up

Show the three numbers only — keep it stark:

- **"Teaching this course now: ~$110,000/yr"**
- **"True cost once failures are counted: ~$380,000/yr"**
- **"With Zhi: $18,000/yr"** (plus a small line: "$85,000 one-time setup")

Do **not** put the retake/dropout math on this screen. That reasoning belongs in the detailed report generated after the button is pressed.
