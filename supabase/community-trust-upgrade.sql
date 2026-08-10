-- Twonara community + trusted reviews upgrade
-- Run AFTER supabase/schema.sql and supabase/google-auth-upgrade.sql.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Contact tracking used only to label a review as "Contacted via Twonara".
-- Clicking WhatsApp is NOT treated as proof of a real visit.
-- ---------------------------------------------------------------------------
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ref text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  created_at timestamptz not null default now(),
  unique (user_id, place_ref, channel)
);

create index if not exists contact_inquiries_place_idx on public.contact_inquiries(place_ref, created_at desc);

-- ---------------------------------------------------------------------------
-- One-time visit codes. Only the business that owns an approved listing can
-- create a code. The plain code is returned once; only its hash is stored.
-- ---------------------------------------------------------------------------
create table if not exists public.visit_codes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists visit_codes_listing_idx on public.visit_codes(listing_id, created_at desc);

create table if not exists public.review_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ref text not null,
  listing_id uuid references public.listings(id) on delete cascade,
  visit_code_id uuid not null unique references public.visit_codes(id) on delete cascade,
  verified_at timestamptz not null default now(),
  unique (user_id, place_ref)
);

create index if not exists review_verifications_place_idx on public.review_verifications(place_ref, verified_at desc);

-- Review trust is set by a trigger, never accepted from the browser.
alter table public.reviews add column if not exists trust_level text not null default 'community';
alter table public.reviews add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_trust_level_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_trust_level_check
      check (trust_level in ('community', 'contacted', 'verified'));
  end if;
end $$;

create or replace function public.set_review_trust_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.status = 'active'
  ) then
    raise exception 'Only active Twonara accounts can review.';
  end if;

  -- A business owner cannot review their own listing.
  if exists (
    select 1 from public.listings l
    where l.id::text = new.place_ref and l.owner_id = new.user_id
  ) then
    raise exception 'Businesses cannot review their own listing.';
  end if;

  if exists (
    select 1 from public.review_verifications v
    where v.user_id = new.user_id and v.place_ref = new.place_ref
  ) then
    new.trust_level := 'verified';
  elsif exists (
    select 1 from public.contact_inquiries i
    where i.user_id = new.user_id
      and i.place_ref = new.place_ref
      and i.channel = 'whatsapp'
  ) then
    new.trust_level := 'contacted';
  else
    new.trust_level := 'community';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reviews_set_trust_level on public.reviews;
create trigger reviews_set_trust_level
before insert or update on public.reviews
for each row execute procedure public.set_review_trust_level();

create or replace function public.create_visit_code(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_code text;
  code_digest text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.listings l
    join public.profiles p on p.id = auth.uid()
    where l.id = p_listing_id
      and l.owner_id = auth.uid()
      and l.status = 'approved'
      and p.role = 'business'
      and p.status = 'active'
  ) then
    raise exception 'Only the active owner of an approved listing can create visit codes.';
  end if;

  raw_code := 'TW-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
  code_digest := encode(digest(raw_code, 'sha256'), 'hex');

  insert into public.visit_codes (listing_id, code_hash, created_by)
  values (p_listing_id, code_digest, auth.uid());

  return raw_code;
end;
$$;

create or replace function public.redeem_visit_code(p_place_ref text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched public.visit_codes%rowtype;
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  normalized_code := upper(trim(p_code));

  select vc.* into matched
  from public.visit_codes vc
  join public.listings l on l.id = vc.listing_id
  where l.id::text = p_place_ref
    and vc.code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
    and vc.used_at is null
    and vc.expires_at > now()
  order by vc.created_at desc
  limit 1
  for update of vc;

  if matched.id is null then
    return false;
  end if;

  if exists (
    select 1 from public.listings l
    where l.id = matched.listing_id and l.owner_id = auth.uid()
  ) then
    raise exception 'Business owners cannot verify themselves on their own listing.';
  end if;

  update public.visit_codes
  set used_by = auth.uid(), used_at = now()
  where id = matched.id;

  insert into public.review_verifications (user_id, place_ref, listing_id, visit_code_id)
  values (auth.uid(), p_place_ref, matched.listing_id, matched.id)
  on conflict (user_id, place_ref) do nothing;

  -- Upgrade an existing review immediately if this user already reviewed.
  update public.reviews
  set updated_at = now()
  where user_id = auth.uid() and place_ref = p_place_ref;

  return true;
end;
$$;

revoke all on function public.create_visit_code(uuid) from public;
revoke all on function public.redeem_visit_code(text, text) from public;
grant execute on function public.create_visit_code(uuid) to authenticated;
grant execute on function public.redeem_visit_code(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Gift Shop
-- ---------------------------------------------------------------------------
create table if not exists public.gift_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shop_name text not null check (char_length(shop_name) between 1 and 120),
  name text not null check (char_length(name) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  price_text text not null default 'Contact for price',
  price_amount numeric(12,2) not null default 0 check (price_amount >= 0),
  location text not null,
  whatsapp_phone text not null,
  delivery_text text not null default 'Contact seller for delivery',
  image_url text,
  featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_products_public_idx on public.gift_products(status, location, featured, created_at desc);
create index if not exists gift_products_owner_idx on public.gift_products(owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Date Stories. Public identity can be anonymous, but the authenticated user
-- id remains attached internally for moderation/accountability.
-- ---------------------------------------------------------------------------
create table if not exists public.date_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  story text not null check (char_length(story) between 1 and 2000),
  location text not null check (char_length(location) between 1 and 80),
  anonymous boolean not null default true,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists date_stories_public_idx on public.date_stories(status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.contact_inquiries enable row level security;
alter table public.visit_codes enable row level security;
alter table public.review_verifications enable row level security;
alter table public.gift_products enable row level security;
alter table public.date_stories enable row level security;

drop policy if exists "contact own select" on public.contact_inquiries;
drop policy if exists "contact own insert" on public.contact_inquiries;
drop policy if exists "contact admin select" on public.contact_inquiries;
create policy "contact own select" on public.contact_inquiries for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "contact own insert" on public.contact_inquiries for insert to authenticated with check (user_id = auth.uid());
create policy "contact own update" on public.contact_inquiries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "verification own select" on public.review_verifications;
create policy "verification own select" on public.review_verifications for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Visit code rows are intentionally not readable by customers. Business owners
-- can see metadata for codes they generated, but never the original plain code.
drop policy if exists "visit codes owner select" on public.visit_codes;
create policy "visit codes owner select" on public.visit_codes for select to authenticated using (
  created_by = auth.uid() or public.is_admin()
);

-- Gift products
drop policy if exists "gift public approved" on public.gift_products;
drop policy if exists "gift business insert" on public.gift_products;
drop policy if exists "gift owner update unpublished" on public.gift_products;
drop policy if exists "gift admin update" on public.gift_products;
create policy "gift public approved" on public.gift_products for select to anon, authenticated using (
  status = 'approved' or owner_id = auth.uid() or public.is_admin()
);
create policy "gift business insert" on public.gift_products for insert to authenticated with check (
  owner_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'business' and p.status = 'active'
  )
);
create policy "gift owner update unpublished" on public.gift_products for update to authenticated using (
  owner_id = auth.uid() and status in ('pending', 'rejected')
) with check (
  owner_id = auth.uid() and status in ('pending', 'rejected')
);
create policy "gift admin update" on public.gift_products for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Date stories
drop policy if exists "stories public published" on public.date_stories;
drop policy if exists "stories own insert" on public.date_stories;
drop policy if exists "stories own update" on public.date_stories;
drop policy if exists "stories own delete" on public.date_stories;
drop policy if exists "stories admin update" on public.date_stories;
create policy "stories public published" on public.date_stories for select to anon, authenticated using (
  status = 'published' or user_id = auth.uid() or public.is_admin()
);
create policy "stories own insert" on public.date_stories for insert to authenticated with check (
  user_id = auth.uid()
  and status = 'published'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
);
create policy "stories own update" on public.date_stories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "stories own delete" on public.date_stories for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "stories admin update" on public.date_stories for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Recalculate trust for existing reviews if contact/verification records exist.
update public.reviews set updated_at = now();
