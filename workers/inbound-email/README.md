# palatable-inbound-email Worker

Cloudflare Email Worker that catches mail sent to `*@palateandpen.co.uk`
(caught by the catch-all rule in Cloudflare Email Routing on the apex zone),
parses MIME with `postal-mime`, extracts PDF/image attachments, and POSTs JSON
to `https://app.palateandpen.co.uk/api/inbound-email` with the shared bearer.

Apex coexistence note: Cloudflare Email Routing replaces the apex MX, so
`jack@palateandpen.co.uk` and `hello@palateandpen.co.uk` are configured as
forwarding rules in the dashboard that send to `JackHarrison@PalatePen.onmicrosoft.com`
(the underlying M365 mailbox). The catch-all then fires this Worker for
anything else, which the Worker uses for the `invoices+TOKEN` chef pattern.

## Deploy

```bash
cd workers/inbound-email
npm install
npx wrangler login                                    # one-time, opens browser
npx wrangler secret put INBOUND_EMAIL_SECRET          # paste the same value as Vercel
npx wrangler deploy
```

After deploy, wire the Cloudflare dashboard:

1. Cloudflare → `palateandpen.co.uk` zone → **Email** → **Email Routing**
2. Enable Email Routing on the **`palateandpen.co.uk`** apex zone (CF will replace the M365 MX records — this is intentional)
3. Add destination address `JackHarrison@PalatePen.onmicrosoft.com` and verify it (CF sends a confirmation email)
4. **Routing rules → Custom address** → `jack@palateandpen.co.uk` → Action: **Send to an email** → `JackHarrison@PalatePen.onmicrosoft.com`
5. Repeat for `hello@palateandpen.co.uk` (same destination, same M365 mailbox)
6. **Catch-all address** → Action: **Send to a Worker** → select `palatable-inbound-email`

## Test

Send an email with a PDF attachment to `invoices+TEST@mail.palateandpen.co.uk`.
Watch the Worker logs:

```bash
npx wrangler tail
```

Successful runs return 200 from the webhook with either parsed invoice items
or a `skipped` reason (no token matched, no attachments, tier ineligible).

## Rotating the secret

If the secret leaks, rotate both sides together:

```bash
# Vercel side
vercel env rm INBOUND_EMAIL_SECRET production
vercel env add INBOUND_EMAIL_SECRET production         # paste new value
vercel deploy --prod

# Worker side
npx wrangler secret put INBOUND_EMAIL_SECRET           # paste same new value
```
