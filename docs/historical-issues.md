# Historical issues

Closed punch lists and post-incident notes. Reference material.

## Tomorrow's punch list — from stress-test 2026-05-12

Surfaced during the system-wide audit at end of day. Tackle top-down.

**Quick wins (~2 hours total)** — all done 2026-05-13, see Progress Log.
- [x] **Lazy-init Stripe**
- [x] **Wire feature-flag enforcement** (UI gates + server gates for all 10 flags)
- [x] **`publicMenus` flag check on `/m/[slug]`**
- [x] **Idempotency on invite accept**

**Medium-priority follow-ups** — all done 2026-05-13, see Progress Log.
- [x] **SettingsView autosave perms-aware** (already in place — `if(!perms.canManageSettings)return;` guards the effect body)
- [x] **Invite expiry check** (accept route blocks at line 39 with 410)
- [x] **Anthropic model into a constant** (`src/lib/anthropic.ts` exports `ANTHROPIC_MODEL`)
- [x] **Inbound-email row guard** (collision detection + account_id-keyed write)

**Config gaps (no code change required)** — all closed.
- [x] **`INBOUND_EMAIL_SECRET`** set on Vercel production 2026-05-13. Unauthenticated POSTs to `/api/inbound-email` now return 401. Value lives only in the Vercel env store and the (eventually-configured) inbound provider's webhook config — mirror them together when wiring up Resend / Postmark / Mailgun.

**Long-tail (no action needed yet, log for memory)**
- API-key lookup via JSONB containment is fine at current scale; revisit if user count > 10k.
- Ownership-transfer endpoint lacks a transaction (3 writes); fine until it breaks.
- `wasteTracking` and `menuBuilder` flag definitions have no enforcement points — that's deliberate, they're there for when the flags need to be flipped during incident response.

**Stress-test positives (audit confirmed OK)**
- All admin routes auth via `isAuthorized` ✓
- All `/api/v1/*` routes auth via `authenticateApi` + tier ✓
- React hook order consistent everywhere (the earlier admin bug stays fixed) ✓
- Supabase clients use lazy `createClient(url!, key!)` — module load succeeds, fails-at-request when env missing ✓
- MaintenanceGate fails open and hard-reloads on restore ✓
- All recent rebuilds (admin, Settings, MenuDesigner, Reports) typecheck clean ✓
