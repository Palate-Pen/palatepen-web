# palatable-inbound-email Worker

Cloudflare Email Worker that catches mail sent to `*@mail.palateandpen.co.uk`,
parses MIME with `postal-mime`, extracts PDF/image attachments, and POSTs JSON
to `https://app.palateandpen.co.uk/api/inbound-email` with the shared bearer.

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
2. Enable Email Routing on the **`mail.palateandpen.co.uk`** subdomain (NOT the apex — apex MX must stay on Microsoft 365 for jack@/hello@)
3. Cloudflare auto-adds the MX records for the subdomain
4. **Routing rules → Add** → Custom address: `*@mail.palateandpen.co.uk` → Action: **Send to Worker** → select `palatable-inbound-email`

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
