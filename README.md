# Twonara ❤️

Twonara is a mobile-first web platform for couples to discover useful places and experiences, build a date plan, save ideas, and share the plan. Local businesses can post listings and advertise through Twonara, while admins review and manage the platform.

## Main customer categories

- **Do** — activities and experiences
- **Eat** — restaurants and cafés
- **Privacy** — quiet/private couple-friendly experiences such as bookable screening spaces
- **Relax** — wellness and relaxing places
- **Stay** — accommodation subject to each property’s age, ID and check-in rules

---

## Project status

### Phase 1 — Customer homepage ✅
- Location selector / search
- Do, Eat, Privacy, Relax and Stay tabs
- Friendly discovery cards
- Mobile navigation
- Date Plan entry point

### Phase 2 — Explore & place details ✅
- Search places and experiences
- Category filters
- Open-now filter
- Recommended / top-rated / nearest / budget sorting
- Responsive Explore results
- Full place details
- Save / favorite places
- Add / remove from Date Plan
- Share, contact and Google Maps directions

### Phase 3 — Date Planner ✅
- Create and name a plan
- Choose a date
- Add places from Explore or Place Details
- Reorder stops
- Choose a time for each stop
- Remove stops
- Estimated budget
- Approximate combined distance
- Add more stops
- Save plans
- Share through Web Share or clipboard fallback

### Phase 4 — Customer accounts ✅
- Customer sign up / login
- Customer profile
- Saved places
- Saved date plans
- Reviews
- Demo accounts for testing
- Supabase Auth support for production

### Phase 5 — Business / Post Ad ✅
- Business sign up / login
- Business dashboard
- Post a place
- Listing status: Pending / Approved / Rejected
- Free / Premium / Featured ad plans
- Demo paid-plan workflow without taking payment
- Production PayHere checkout hook

### Phase 6 — Admin ✅
- Admin dashboard
- Review / approve / reject listings
- Prevent paid listings from publishing before verified payment
- User suspension / reactivation
- Category overview
- Ad-plan overview
- Published listings automatically become visible to customers

### Phase 7 — Backend & launch foundation ✅
- Supabase Postgres schema
- Supabase Auth
- Row Level Security policies
- Persistent favorites, reviews and date plans
- Persistent business listings
- Trusted database roles
- Secure PayHere payment creation in a Supabase Edge Function
- PayHere callback signature verification
- Google Maps directions without requiring an API key
- Cloudflare-ready Vite build
- GitHub Actions build check

---

# 1. Fastest way to test — Demo Mode

Demo Mode needs **no Supabase account, no PayHere account and no `.env` file**.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, normally:

```text
http://localhost:5173
```

### Demo roles

Open **Profile** and use the Quick Testing buttons:

- **Customer** — test saved places, plans and reviews
- **Business** — test Post a Place and ad plans
- **Admin** — approve/reject listings and manage demo users

Demo data is stored in your browser `localStorage`, so refreshing the page keeps your test data.

### Full demo workflow to test

1. Open Twonara.
2. Keep location as **Negombo**.
3. Test **Do / Eat / Privacy / Relax / Stay**.
4. Open **Explore** and test search, filters and sorting.
5. Open a place and test **Save**, **Directions** and **Add to plan**.
6. Add 2–4 places to a Date Plan.
7. Open **Plan**, choose a date and times, reorder stops and check the budget.
8. Log in with the **Customer** demo button and save the plan.
9. Add a review to a place.
10. Sign out.
11. Open **Post a place** and use the **Business** demo login.
12. Submit a new listing using Free, Premium or Featured.
13. Sign out and use the **Admin** demo login.
14. Open Admin → Listings and approve the new listing.
15. Return to the customer site and confirm the approved listing appears in Explore.

---

# 2. Production Supabase setup

The app automatically switches from Demo Mode to Supabase Mode when these two frontend variables exist.

Copy:

```text
.env.example
```

to:

```text
.env.local
```

Then add:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never put the Supabase service-role key or PayHere Merchant Secret in a `VITE_*` variable.

## Database

Create a Supabase project and run this file in the Supabase SQL Editor:

```text
supabase/schema.sql
```

It creates:

- profiles
- listings
- favorites
- reviews
- date_plans
- date_plan_items
- ad_orders
- RLS policies
- listing-images storage bucket

## Admin account

Public users cannot create themselves as admins.

1. Create a normal Twonara account.
2. Find its UUID in Supabase Auth.
3. Promote it manually:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_ADMIN_USER_UUID';
```

---

# 3. PayHere setup

Twonara never puts the PayHere Merchant Secret in browser code.

The payment files are:

```text
supabase/functions/payhere-create/index.ts
supabase/functions/payhere-notify/index.ts
```

`payhere-create` creates the payment request and hash on the server.

`payhere-notify` receives PayHere’s server callback, verifies its signature, and only then updates the payment status.

## Edge Function secrets

Use `supabase/functions/.env.example` as a guide and set these as Supabase Edge Function secrets:

```env
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_SANDBOX=true
TWONARA_APP_URL=https://your-domain.com
PAYHERE_NOTIFY_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/payhere-notify
```

With the Supabase CLI linked to your project:

```bash
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy --use-api
```

For first payment testing keep:

```env
PAYHERE_SANDBOX=true
```

Switch to live credentials only after the sandbox flow is verified.

---

# 4. Location and maps

Twonara V1 keeps location simple and low-cost:

- Customer selects/searches an area such as Negombo.
- Explore filters listings by the selected area.
- **Directions** opens the listing address in Google Maps.
- No Google Maps API key is required for this first version.

Later, Places Autocomplete and real route-distance calculations can be added without changing the core listing structure.

---

# 5. Cloudflare deployment

Twonara is a normal Vite SPA.

Production build:

```bash
npm run build
```

Build output:

```text
dist
```

For a Cloudflare Pages project use:

```text
Build command: npm run build
Build output directory: dist
```

Add these frontend environment variables in the Cloudflare project only when Supabase production mode is ready:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

# 6. GitHub build check

The repository includes:

```text
.github/workflows/build.yml
```

It runs `npm install` and `npm run build` for pushes and pull requests to `main`.

---

# 7. Important safety / trust rules

- Admin approval is required before a business listing becomes public.
- Paid-plan listings cannot be published in production until PayHere confirms payment.
- Admin role cannot be self-selected during public sign-up.
- Sensitive payment secrets stay server-side.
- Supabase RLS limits customers and businesses to the data they are allowed to manage.
- Businesses should post accurate contact, price, venue and availability details.
- Accommodation listings must follow the property’s age, identification and check-in policies.

---

# Run locally

```bash
npm install
npm run dev
```

# Build locally

```bash
npm run build
npm run preview
```

Twonara V1 is designed so the complete workflow can be tested in Demo Mode first, then Supabase and PayHere can be connected without rebuilding the user experience.
