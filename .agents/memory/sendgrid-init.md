---
name: SendGrid initialization
description: sgMail.setApiKey() must be called at module load time or all sends return 401.
---

# SendGrid must be initialized before use

## The rule
Call `sgMail.setApiKey(process.env.SENDGRID_API_KEY)` at the top of `sendgrid.ts`, immediately after the import. Without it every send silently fails with "Permission denied, wrong credentials" (HTTP 401) even though the key is correctly set in the environment.

**Why:** `@sendgrid/mail` does not auto-read the environment variable. The call must be explicit.

**How to apply:** Any time sendgrid.ts is touched or a new email-sending module is created, verify the `setApiKey` call is present and runs before any `sgMail.send()`.

## Current location
`artifacts/api-server/src/lib/sendgrid.ts` — lines 4-6.
