# Twonara — Gifts, Stories & Trusted Reviews

The website now includes:

- **Gift Shop** tab
- **Date Stories** tab with public anonymous posting
- **Community Review** badge
- **Contacted via Twonara** badge after a logged-in customer starts WhatsApp from Twonara
- **Verified Visit** badge after a customer redeems a one-time business visit code
- Business gift-product submissions
- Business one-time visit-code generation
- Admin gift approval/rejection
- Admin Story show/hide moderation

## Database upgrade

If the original Twonara schema and Google Auth upgrade are already installed, open **Supabase → SQL Editor** and run only:

```text
supabase/community-trust-upgrade.sql
```

For a new database, run in this order:

```text
supabase/schema.sql
supabase/google-auth-upgrade.sql
supabase/community-trust-upgrade.sql
```

## Review trust rules

### Community Review
A normal authenticated Twonara user review.

### Contacted via Twonara
The customer must be logged in and press **Chat on WhatsApp** from that place's Twonara detail page. Twonara records a contact inquiry before opening WhatsApp.

This proves only that the customer used Twonara to contact the business. It does **not** prove a visit.

### Verified Visit
1. Business has an approved Twonara listing.
2. Customer actually visits.
3. Business opens **Business Portal → Review codes**.
4. Business creates one one-time code for that customer.
5. Customer enters the code on the place detail page.
6. Supabase marks the visit verified.
7. The customer's review receives the **Verified Visit** badge automatically.

The browser cannot choose its own review trust level. A database trigger calculates it from trusted records.

## Date Story privacy

A Story can be publicly anonymous while still remaining tied to its authenticated Twonara account internally for moderation. The posting form warns users not to include phone numbers, exact home/live locations, school/work details, private messages, or other identifying information.

## Gift Shop moderation

Business gift products start as `pending` and become public only after an admin approves them in **Admin → Gifts**.
