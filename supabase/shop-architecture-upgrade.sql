-- Twonara Shop/Admin/Customer architecture upgrade
-- Run AFTER schema.sql, google-auth-upgrade.sql and community-trust-upgrade.sql.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shop application + public shop page fields
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists contact_name text;
alter table public.listings add column if not exists subtype text;
alter table public.listings add column if not exists whatsapp_phone text;
alter table public.listings add column if not exists page_status text not null default 'draft';
alter table public.listings add column if not exists logo_url text;
alter table public.listings add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists packages jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists facilities jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists hero_text text;
alter table public.listings add column if not exists theme text not null default 'rose';
alter table public.listings add column if not exists rejection_reason text;
alter table public.listings add column if not exists approved_at timestamptz;
alter table public.listings add column if not exists published_at timestamptz;
alter table public.listings add column if not exists featured_approved boolean not null default false;

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('Do', 'Eat', 'Privacy', 'Relax', 'Stay', 'Gift'));

alter table public.listings drop constraint if exists listings_page_status_check;
alter table public.listings add constraint listings_page_status_check
  check (page_status in ('draft', 'published'));

alter table public.listings drop constraint if exists listings_theme_check;
alter table public.listings add constraint listings_theme_check
  check (theme in ('rose', 'midnight', 'cream'));

create index if not exists listings_public_shop_idx
  on public.listings(status, page_status, location, category, featured_approved);

-- Existing approved listings become drafts until their owners deliberately publish.
update public.listings
set page_status = coalesce(page_status, 'draft')
where page_status is null;

-- ---------------------------------------------------------------------------
-- RLS: public can ONLY see approved + published shops.
-- Owners can see their own application/page. Admin can see everything.
-- ---------------------------------------------------------------------------
drop policy if exists "public approved listings" on public.listings;
create policy "public published shops" on public.listings
for select to anon, authenticated
using (
  (status = 'approved' and page_status = 'published')
  or owner_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "business create own pending listing" on public.listings;
create policy "business create shop application" on public.listings
for insert to authenticated
with check (
  owner_id = auth.uid()
  and status = 'pending'
  and page_status = 'draft'
  and ad_plan = 'free'
  and payment_status = 'not_required'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'business' and p.status = 'active'
  )
);

drop policy if exists "business edit own unpublished listing" on public.listings;
drop policy if exists "business edit own application" on public.listings;
create policy "business edit own application" on public.listings
for update to authenticated
using (
  owner_id = auth.uid()
  and status in ('pending', 'rejected')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'business' and p.status = 'active'
  )
)
with check (
  owner_id = auth.uid()
  and status in ('pending', 'rejected')
  and page_status = 'draft'
  and ad_plan = 'free'
  and payment_status = 'not_required'
);

-- ---------------------------------------------------------------------------
-- Approved shop page builder.
-- These SECURITY DEFINER functions only update permitted page fields.
-- A business cannot self-approve, change payment state or grant Featured status.
-- ---------------------------------------------------------------------------
create or replace function public.update_my_shop_page(
  p_listing_id uuid,
  p_logo_url text,
  p_cover_image_url text,
  p_hero_text text,
  p_description text,
  p_whatsapp_phone text,
  p_phone text,
  p_opening_hours text,
  p_subtype text,
  p_theme text,
  p_gallery_urls jsonb,
  p_facilities jsonb,
  p_packages jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1 from public.listings l
    join public.profiles p on p.id = auth.uid()
    where l.id = p_listing_id
      and l.owner_id = auth.uid()
      and l.status = 'approved'
      and p.role = 'business'
      and p.status = 'active'
  ) then
    raise exception 'Only the approved shop owner can edit this page.';
  end if;

  update public.listings
  set logo_url = nullif(trim(p_logo_url), ''),
      cover_image_url = nullif(trim(p_cover_image_url), ''),
      hero_text = left(coalesce(p_hero_text, ''), 220),
      description = left(coalesce(p_description, ''), 3000),
      whatsapp_phone = left(coalesce(p_whatsapp_phone, ''), 40),
      phone = left(coalesce(p_phone, ''), 40),
      opening_hours = left(coalesce(p_opening_hours, ''), 160),
      subtype = left(coalesce(p_subtype, ''), 80),
      theme = case when p_theme in ('rose', 'midnight', 'cream') then p_theme else 'rose' end,
      gallery_urls = case when jsonb_typeof(coalesce(p_gallery_urls, '[]'::jsonb)) = 'array' then coalesce(p_gallery_urls, '[]'::jsonb) else '[]'::jsonb end,
      facilities = case when jsonb_typeof(coalesce(p_facilities, '[]'::jsonb)) = 'array' then coalesce(p_facilities, '[]'::jsonb) else '[]'::jsonb end,
      packages = case when jsonb_typeof(coalesce(p_packages, '[]'::jsonb)) = 'array' then coalesce(p_packages, '[]'::jsonb) else '[]'::jsonb end,
      updated_at = now()
  where id = p_listing_id;

  return true;
end;
$$;

create or replace function public.publish_my_shop_page(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1 from public.listings l
    join public.profiles p on p.id = auth.uid()
    where l.id = p_listing_id
      and l.owner_id = auth.uid()
      and l.status = 'approved'
      and p.role = 'business'
      and p.status = 'active'
      and nullif(trim(l.name), '') is not null
      and nullif(trim(l.address), '') is not null
      and nullif(trim(l.description), '') is not null
      and nullif(trim(coalesce(l.whatsapp_phone, l.phone)), '') is not null
  ) then
    raise exception 'Complete the required shop information before publishing.';
  end if;

  update public.listings
  set page_status = 'published', published_at = now(), updated_at = now()
  where id = p_listing_id;
  return true;
end;
$$;

create or replace function public.unpublish_my_shop_page(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_id = auth.uid() and l.status = 'approved'
  ) then
    raise exception 'Only the approved shop owner can unpublish this page.';
  end if;
  update public.listings set page_status = 'draft', updated_at = now() where id = p_listing_id;
  return true;
end;
$$;

create or replace function public.request_featured_ad(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1 from public.listings l
    join public.profiles p on p.id = auth.uid()
    where l.id = p_listing_id
      and l.owner_id = auth.uid()
      and l.status = 'approved'
      and p.role = 'business'
      and p.status = 'active'
  ) then
    raise exception 'Only an approved shop can request Featured Ads.';
  end if;

  update public.listings
  set ad_plan = 'featured', payment_status = 'pending', featured_approved = false, featured_until = null, updated_at = now()
  where id = p_listing_id;
  return true;
end;
$$;

revoke all on function public.update_my_shop_page(uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb) from public;
revoke all on function public.publish_my_shop_page(uuid) from public;
revoke all on function public.unpublish_my_shop_page(uuid) from public;
revoke all on function public.request_featured_ad(uuid) from public;
grant execute on function public.update_my_shop_page(uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.publish_my_shop_page(uuid) to authenticated;
grant execute on function public.unpublish_my_shop_page(uuid) to authenticated;
grant execute on function public.request_featured_ad(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Anonymous Date Stories: customers do not need Twonara accounts.
-- Anonymous submissions go to PENDING moderation; admin publishes them.
-- ---------------------------------------------------------------------------
alter table public.date_stories alter column user_id drop not null;
alter table public.date_stories drop constraint if exists date_stories_status_check;
alter table public.date_stories add constraint date_stories_status_check
  check (status in ('pending', 'published', 'hidden'));

update public.date_stories set status = 'published' where status not in ('pending', 'published', 'hidden');

drop policy if exists "stories public published" on public.date_stories;
create policy "stories public published" on public.date_stories
for select to anon, authenticated
using (status = 'published' or user_id = auth.uid() or public.is_admin());

drop policy if exists "stories guest anonymous insert" on public.date_stories;
create policy "stories guest anonymous insert" on public.date_stories
for insert to anon
with check (
  user_id is null
  and anonymous = true
  and display_name is null
  and status = 'pending'
);

-- Logged-in shop/admin accounts are not needed for customer story submission.
-- Existing authenticated story policies can remain for backwards compatibility.

-- IMPORTANT WORKFLOW
-- 1) Shop logs in and inserts status=pending, page_status=draft.
-- 2) Admin changes status to approved. This ONLY unlocks the Shop Dashboard.
-- 3) Shop owner customizes via update_my_shop_page().
-- 4) Shop owner publishes via publish_my_shop_page().
-- 5) Public can now select/read the shop.
-- 6) Featured Ads require ad_plan=featured + payment_status=paid + featured_approved=true.
