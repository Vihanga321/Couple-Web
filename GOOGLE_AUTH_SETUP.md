# Twonara — Real Google Sign-In Setup

The frontend Google OAuth flow is already implemented. Complete these dashboard steps once.

## 1. Supabase database

In Supabase SQL Editor, run:

1. `supabase/schema.sql` (if you have not already run it)
2. `supabase/google-auth-upgrade.sql`

The Google auth upgrade improves Google profile names and adds a safe RPC that lets a normal account become a business account. It never grants admin access.

## 2. Connect Twonara to Supabase

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Never put a Supabase secret/service-role key in a Vite environment variable.

## 3. Create Google OAuth credentials

In Google Cloud / Google Auth Platform:

- Create or select the Twonara project.
- Configure the OAuth consent screen / branding.
- Create an OAuth Client ID with application type **Web application**.
- For local desktop testing, add `http://localhost:5173` as an Authorized JavaScript origin.
- Under Authorized redirect URIs, add the exact Supabase callback URL shown on the Supabase Google provider page. It normally looks like:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Copy the Google Client ID and Client Secret.

## 4. Enable Google in Supabase

Supabase Dashboard → Authentication → Providers → Google:

- Enable Google.
- Paste the Google Client ID.
- Paste the Google Client Secret.
- Save.

Do not put the Google Client Secret in the website code or GitHub.

## 5. Configure Supabase redirect URLs

Supabase Dashboard → Authentication → URL Configuration:

For local desktop testing:

```text
Site URL: http://localhost:5173
Redirect URL: http://localhost:5173/**
```

Later, add the real HTTPS Twonara domain as the Site URL / allowed redirect and remove development URLs when appropriate.

## 6. Test

Restart Vite after creating `.env.local`:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Customer

Profile → Continue with Google → choose Google account → return to Twonara.

Expected result: a real Supabase Auth user and `profiles` row with role `customer`.

### Business

Post a place → Continue with Google.

Expected result: the authenticated account is safely set to `business`, allowing access to the business portal and listing submission.

### Admin

Google Sign-In does not create admins. Create/sign in to the intended account, then manually promote it in Supabase SQL:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_ADMIN_USER_UUID';
```

## Mobile testing note

For Google OAuth, test locally on `http://localhost:5173` first. The normal phone-on-LAN Vite address uses a private IP and is not a good permanent OAuth origin. Once Twonara is deployed on an HTTPS domain (for example through Cloudflare), add that HTTPS domain to Google and Supabase and test Google login on mobile there.
