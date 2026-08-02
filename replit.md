# 🎓 COLLEGE FINDER FOR AI

https://college-finder.zhisystems.com

**The AI Sales Rep's Edge — Find, Qualify, and Close US Colleges Before the Competition Does.**

---

## ⚙️ Overview

College Finder for AI is a B2B sales intelligence platform built exclusively for Zhi Systems account executives. It surfaces the highest-opportunity US colleges for AI-powered course replacement, generates fully reasoned outreach proposals, and delivers verified contact data for the exact people who control curriculum and budget.

It searches 4,153 active, degree-granting US institutions ranked by dropout rate, enrollment size, and AI opportunity score. For every prospect it identifies the specific courses to target, models the cost displacement, and writes the outreach letter.

Designed for reps who close enterprise education deals, it replaces a week of manual research with a two-minute workflow — college search, course targeting, cost analysis, contact lookup, and proposal generation in a single session.

---

## 🔗 What It Does

**College Search** -- Query 4,153 active US institutions by name, state, type, and dropout rate. Flexible multi-word search matches partial names and abbreviations. Results paginate with 20 per page.

**Hot Lead Scoring** -- Every college carries an AI Opportunity Score (0–100) derived from enrollment size, dropout rate, and institution type. Scores above 80 surface as Hot Lead badges so reps know where to focus.

**Target Courses** -- AI identifies the specific high-enrollment courses at each institution most susceptible to AI displacement — with enrollment estimates, current cost burden, and displacement confidence.

**Cost Analysis** -- Full side-by-side ROI model: current annual cost vs. projected cost with AI integration. Bar chart and cost-breakdown donut. Includes net savings and three-year projection figures.

**Real Contact Intelligence** -- Decision-maker contacts sourced from live web data via SerpAPI — provosts, VPs of Academic Affairs, deans of instruction, CIOs. Real names pulled from public web; no invented placeholders.

**Hunter.io Email Verification** -- Every contact email is verified in real time through Hunter.io email-finder. Confidence score required ≥ 40 before an address is accepted. Student-ID-format addresses are filtered automatically.

**LinkedIn Search Links** -- Each contact card links directly to a LinkedIn people search scoped to that person's name and institution — resolves to the correct profile rather than a guessed URL that 404s.

**Proposal Generation** -- One click produces a full outreach proposal: course targets, cost displacement analysis, and a personalized outreach letter in the voice and register appropriate for academic leadership.

**Proposal Management** -- Every generated proposal is saved and retrievable. View, revisit, and track the full pipeline of institutions across sessions.

**Subject → College Search** -- Enter a subject area — Remedial Math, Intro Economics — and the platform ranks the colleges most receptive to AI replacement in that domain, scored and sorted automatically.

**Dashboard** -- Pipeline overview: total proposals generated, institutions contacted, average opportunity score, and cost displacement modeled across the full prospect universe.

---

## ⚙️ Technical Features

**IPEDS Database Backbone** -- All 4,153 institutions sourced from NCES IPEDS HD2023 — the federal census of US postsecondary education. Data includes enrollment size, institution type, Carnegie classification, control (public/private), tuition, and completion rates.

**OpenAI Analysis Engine** -- GPT-4o-mini powers all AI tasks: course identification, contact extraction, cost modeling, subject ranking, and proposal writing. All prompts run at temperature 0 for deterministic, repeatable output.

**SerpAPI Contact Discovery** -- Four parallel Google searches per college target provosts, VPs of Academic Affairs, deans, and CIOs. Snippets are parsed for real names and phone numbers before any AI processing occurs.

**Hunter.io Email Enrichment** -- Per-person email lookup via Hunter.io email-finder API. Returns verified addresses with confidence scoring. Falls back to domain-pattern construction only when Hunter cannot resolve the address.

**Multi-Word Flexible Search** -- Query terms are split on whitespace and applied as independent ILIKE conditions against the college name. Partial matches, acronyms, and transposed words all resolve correctly.

**Opportunity Scoring** -- Composite score weights enrollment size (40%), dropout rate (40%), and institution type (20%). Community colleges and large public four-years dominate the top of the list by design.

**PostgreSQL + Drizzle ORM** -- All college data, proposals, and pipeline state stored in a managed PostgreSQL database. Drizzle ORM provides type-safe query construction with no raw SQL in business logic.

**React + Vite Frontend** -- Single-page application with wouter routing, Tailwind CSS, shadcn/ui components, and Recharts data visualization. All API calls go through React Query with loading and error state management.

---

## 🎓 Designed For

**Account Executives at AI EdTech Companies** -- Run a full prospecting workflow in minutes. Find the college, identify the course, model the savings, get the contact, write the pitch.

**Sales Directors Building Territory Plans** -- Filter by state, institution type, and dropout rate to carve territories. Export proposals for pipeline tracking.

**Business Development Reps Doing Outreach** -- Each contact card links to a verified email and a LinkedIn people search. The proposal includes a ready-to-send outreach letter in academic register.

**Sales Engineers Preparing Discovery Calls** -- Cost analysis and course targeting give reps the institutional knowledge to walk into a call prepared — without spending hours on a college's website.

**Team Leads Reviewing Opportunity Quality** -- Hot Lead scoring, opportunity scores, and cost displacement figures make it easy to rank prospects and prioritize the highest-value conversations.

---

## 💡 Core Idea

Most sales tools give you a list. College Finder gives you the pitch.

It treats every institution as a structured sales opportunity — a budget to be modeled, a curriculum to be analyzed, a set of decision-makers to be identified. The output is not a CRM record with a name and a phone number. It is a complete, reasoned case for why this college should replace this course with AI, delivered with the cost figures and the letter.

No invented contacts. No placeholder phone numbers. No 404 LinkedIn links.

**College Finder for AI — precision sales intelligence for the AI education market.**

---

> Zhi Systems — https://zhisystems.com

## User preferences

- All AI calls use OpenAI GPT-4o-mini (Gemini removed — quota exhausted, model deprecated)
- Contact data must be real: SerpAPI → AI name extraction → Hunter.io email verification pipeline
- Never use api.data.ed.gov (DNS-blocked on Replit); all college data is in local PostgreSQL from IPEDS HD2023
- Phone numbers must be real; 555-0xxx numbers are filtered in post-processing
- LinkedIn links use search URLs (linkedin.com/search/results/people) not invented profile slugs
