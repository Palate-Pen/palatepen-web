# Palatable runbook

What to do when something breaks in production and the founder isn't reachable.
One page. Skim top to bottom; act on what fits the symptom.

---

## 0. Contacts + URLs at a glance

| What | Where |
| --- | --- |
| Founder | jack@palateandpen.co.uk · jack-harrison95@hotmail.co.uk |
| Customer support inbox | hello@palateandpen.co.uk (Microsoft 365) |
| App | https://app.palateandpen.co.uk |
| Marketing | https://palateandpen.co.uk |
| Vercel project | palatepen-web (team: palate-pen's projects) |
| Supabase project | xbnsytrcvyayzdxezpha (EU West London) |
| GitHub repo | https://github.com/Palate-Pen/palatepen-web |
| Stripe dashboard | https://dashboard.stripe.com (mode: live once switched) |
| Anthropic console | https://console.anthropic.com (top-up: …/settings/plans) |

---

## 1. "The app is broken — what do I do?"

**Always start here.** Order matters: do these in sequence before you go deeper.

### 1.1 Flip maintenance mode (90 seconds, stops the bleeding)

Customers see a friendly "back shortly" page instead of a crash. Webhooks (Stripe, inbound email, cron) still serve normally so you don't break billing or lose invoices.

1. Open the [Vercel project](https://vercel.com/palate-pens-projects/palatepen-web) → **Settings** → **Environment Variables**
2. Set `MAINTENANCE_MODE=true` in Production
3. Optional: set `MAINTENANCE_MESSAGE="custom note for the page"` (else generic copy renders)
4. Trigger a redeploy: **Deployments** tab → latest READY deploy → **⋮** → **Redeploy** (do NOT untick "Use existing build cache" — instant)
5. To bypass for yourself: append `?bypass=<MAINTENANCE_BYPASS_TOKEN>` to any URL — drops a 24h cookie

To resume normal service: set `MAINTENANCE_MODE=false` (or delete it) and redeploy.

### 1.2 Roll back to last working deploy (60 seconds, undoes a bad release)

Use this when the breakage started right after a deploy. The previous READY deploy is always live and rollback-able.

1. [Vercel → Deployments](https://vercel.com/palate-pens-projects/palatepen-web/deployments) → find the last green deploy (state: **Ready**, not **Error**)
2. Click that deploy → **⋮** → **Promote to Production**
3. Production aliases swap over in seconds; no rebuild

Or via CLI: `vercel rollback <deployment-url> --token=…` (CLI install: `npm i -g vercel`).

### 1.3 Read the error log (find the cause)

[Vercel → Project → Logs](https://vercel.com/palate-pens-projects/palatepen-web/logs) — runtime errors stream here. The error reporter logs as JSON prefixed `[palatable.error]` so search for that string.

Every error in the boundary surfaces a `request_id` (looks like `err_a4f2b1`) to the customer; that id lands in the log payload so you can find the exact trace from a support ticket.

---

## 2. Symptom → response cheat sheet

| Symptom | Likely cause | First move |
| --- | --- | --- |
| Whole app shows the maintenance page unexpectedly | `MAINTENANCE_MODE` left on | Set to `false`, redeploy |
| Customers email "credit balance is too low" on recipe import / invoice scan | Anthropic credits drained | Top up at https://console.anthropic.com/settings/plans |
| Stripe checkout 500s after a deploy | `STRIPE_WEBHOOK_SECRET` or `STRIPE_SECRET_KEY` env var rotated | Re-add in Vercel env vars, redeploy |
| Email-forwarded invoices not landing | DNS MX record or `INBOUND_EMAIL_SECRET` mismatch | Check inbound provider dashboard for delivery failures |
| Supabase queries returning empty / phantom rows | supabase-js fetch caching (should be fixed via `svc()`) | Confirm any new admin code uses `createSupabaseServiceClient`, not raw `createClient` |
| "Could not find the table" error | Migration in `supabase/migrations/` not applied | Open Supabase SQL editor, paste the file, run. Then update the `-- Applied:` breadcrumb in the file |
| Auth loop on /signin | Cookie domain mismatch (preview vs prod) | Clear cookies, sign in again. If persistent, check middleware host logic |
| Founder admin returns 403 | Signed in as wrong email | Sign out, sign back in as `jack@palateandpen.co.uk` |
| Vercel build failing | Type error or new env var missing | Click failed deploy → Build Logs. Fix locally with `npm run build`, push fix |

---

## 3. Service status of the dependencies

Check these before assuming our code broke:

- Vercel status: https://www.vercel-status.com
- Supabase status: https://status.supabase.com
- Stripe status: https://status.stripe.com
- Anthropic status: https://status.anthropic.com

If a dep is down, set maintenance mode (1.1) and wait. Don't try to engineer around a vendor outage.

---

## 4. Talking to a customer while it's broken

If `hello@palateandpen.co.uk` lands a ticket during an outage:

> "Thanks for the heads up — we're aware and working on a fix right now. The
> app is briefly down for repair; we'll be in touch the moment it's back. If
> you've got a quote `err_xxxxxx` from the error screen, send it over and
> we'll pull the exact trace."

Avoid: blaming a specific vendor, promising a fix ETA you can't hit, asking for screenshots before checking the log yourself (you usually don't need them — the `request_id` is enough).

---

## 5. Setting up an error webhook (5 minutes — do this before launch)

You'll want runtime errors to push into Discord/Slack so you hear about them before customers do.

1. Create a webhook URL: Discord channel → Settings → Integrations → Webhooks → New Webhook → copy URL. (Slack equivalent: Incoming Webhooks app.)
2. Add `ERROR_WEBHOOK_URL=<the-url>` to Vercel env vars (Production)
3. Redeploy

Every error caught by an `error.tsx` boundary now posts a single-line summary to your channel, including the `request_id`, route, and error message.

---

## 6. Hard credentials reset (founder-only)

When something gets really bad — leaked key, compromised account:

- **Stripe**: Dashboard → Developers → API keys → Roll. Update `STRIPE_SECRET_KEY` in Vercel.
- **Supabase service role**: Dashboard → Project Settings → API → Reset. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- **Anthropic**: Console → API Keys → Revoke + create new. Update `ANTHROPIC_API_KEY` in Vercel.
- **Founder auth**: Supabase → Authentication → Users → find jack@palateandpen.co.uk → reset password.
- **CRON secret**: Generate new with `node -e "console.log(crypto.randomUUID())"`. Update `CRON_SECRET` in Vercel + `vercel.json` if hardcoded paths reference it.

After any reset: redeploy to pick up new env vars.

---

## 7. Database recovery

- Supabase free tier has **no point-in-time restore**. Move to Pro before launch if you can.
- Daily backups happen on Pro; restore via Dashboard → Database → Backups.
- For ad-hoc data fixes use the Supabase SQL editor. Always `SELECT` first to confirm row count before any `UPDATE`/`DELETE`.
- Migrations live in `supabase/migrations/YYYYMMDD_*.sql`. Paste-run them via the SQL editor, then add `-- Applied: YYYY-MM-DD` to the file header.

---

## 8. Future upgrades to harden this

When you have time + revenue:

- **Sentry** (paid: $26/mo Team) — full stack traces, breadcrumbs, performance. Replaces the lightweight webhook reporter. Wire via `npx @sentry/wizard@latest -i nextjs`.
- **BetterStack or UptimeRobot** uptime monitor — every 60s probe on `https://app.palateandpen.co.uk/api/health` (build a health endpoint that pings Supabase + Stripe).
- **Supabase Pro** — PITR, daily backups, higher rate limits.
- **PagerDuty / OpsGenie** — once you have customers paying you and an actual SLA, route the error webhook through here for escalation rules.
- **Read-only mode** — separate from maintenance mode: lets chefs view recipes / scan invoices but disables writes during DB issues. Worth building if you ever have a Supabase write-side outage.
