# WPC CRM

Multi-tenant, mobile-first CRM for Indian local businesses.

## Quick start

```bash
docker start wpc-postgres   # local Postgres
npm install
npm run db:apply
npm run db:seed
npm run dev
```

Create an account at `/signup`, then open `/admin` if your user is marked super admin.

## Phases implemented

### Phase 0–1
Auth, onboarding, contacts, pipeline, tasks, public form, import/export, team, FAB/nav

### Phase 2 — Finance & goals
- Invoices/quotes (GST line items), payments, print/WhatsApp share
- Quick income/expense, vendors, recurring rules, budgets + 80/100% alerts
- Reports: daily closing, month/FY P&L, expense by category, receivables
- Goals: yearly target, monthly split, pace, staff targets, revision history

### Phase 3 — Ops & comms
- Appointments + status + auto reminder task
- WhatsApp Cloud API (Meta): send, broadcast, webhook inbound/status
- Automations: new lead, appointment, overdue invoice, birthday, win-back
- Source ROI report

### Phase 4 — SaaS
- Plans + usage limits (contacts/users)
- Billing page (Razorpay stubbed)
- Super-admin panel (`/admin`)
- PWA manifest + icons

### Phase 5 — AI / i18n foundation
- AI assist page (drafts, lead scores, weekly summary stubs)
- i18n dictionaries (en/hi/ta) ready for UI switch

## WhatsApp setup

1. Meta Developer → WhatsApp → API Setup → copy **Phone number ID** + **token**
2. Settings → **WhatsApp API** in the app → paste + enable
3. Webhook: `NEXT_PUBLIC_APP_URL/api/whatsapp/webhook` (verify token must match)
4. For cold outreach, set `waTemplateName` on message templates to an approved Meta template

Env fallback (optional): `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`

## Still external / stubbed
- Live Razorpay checkout
- FB/IG Lead Ads sync
- Full PDF engine / Tally export
- Locale switcher UI
- WPC AI (coming soon)
