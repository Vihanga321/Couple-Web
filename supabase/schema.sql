-- Twonara V1 Supabase schema
-- Run this in the Supabase SQL Editor once for a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'business', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'business' then 'business' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null check (category in ('Do', 'Eat', 'Privacy', 'Relax', 'Stay')),
  location text not null,
  address text not null,
  description text not null,
  price_text text not null default 'Contact for price',
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0),
  phone text not null,
  opening_hours text,
  cover_image_url text,
  ad_plan text not null default 'free' check (ad_plan in ('free', 'premium', 'featured')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'cancelled', 'chargedback')),
  featured_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists listings_public_idx on public.listings(status, location, category);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, place_ref)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_ref text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (place_ref, user_id)
);

create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  plan_date date,
  location text not null,
  estimated_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.date_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.date_plans(id) on delete cascade,
  place_ref text not null,
  position int not null default 0,
  visit_time time,
  created_at timestamptz not null default now()
);

create index if not exists date_plan_items_plan_idx on public.date_plan_items(plan_id, position);

create table if not exists public.ad_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  plan text not null check (plan in ('premium', 'featured')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'LKR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'chargedback')),
  payhere_order_id text not null unique,
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.date_plans enable row level security;
alter table public.date_plan_items enable row level security;
alter table public.ad_orders enable row level security;

create policy "profile own select" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin profiles update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public approved listings" on public.listings for select to anon, authenticated using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "business create own pending listing" on public.listings for insert to authenticated with check (
  owner_id = auth.uid()
  and status = 'pending'
  and payment_status in ('not_required', 'pending')
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business' and p.status = 'active')
);
create policy "business edit own unpublished listing" on public.listings for update to authenticated using (
  owner_id = auth.uid() and status in ('pending', 'rejected')
) with check (
  owner_id = auth.uid() and status in ('pending', 'rejected') and payment_status in ('not_required', 'pending')
);
create policy "admin listing update" on public.listings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "favorite own select" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "favorite own insert" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorite own delete" on public.favorites for delete to authenticated using (user_id = auth.uid());

create policy "reviews public select" on public.reviews for select to anon, authenticated using (true);
create policy "review own insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "review own update" on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "review own delete" on public.reviews for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "plans own select" on public.date_plans for select to authenticated using (user_id = auth.uid());
create policy "plans own insert" on public.date_plans for insert to authenticated with check (user_id = auth.uid());
create policy "plans own update" on public.date_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plans own delete" on public.date_plans for delete to authenticated using (user_id = auth.uid());

create policy "plan items own select" on public.date_plan_items for select to authenticated using (
  exists (select 1 from public.date_plans p where p.id = plan_id and p.user_id = auth.uid())
);
create policy "plan items own insert" on public.date_plan_items for insert to authenticated with check (
  exists (select 1 from public.date_plans p where p.id = plan_id and p.user_id = auth.uid())
);
create policy "plan items own update" on public.date_plan_items for update to authenticated using (
  exists (select 1 from public.date_plans p where p.id = plan_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.date_plans p where p.id = plan_id and p.user_id = auth.uid())
);
create policy "plan items own delete" on public.date_plan_items for delete to authenticated using (
  exists (select 1 from public.date_plans p where p.id = plan_id and p.user_id = auth.uid())
);

create policy "business own ad orders" on public.ad_orders for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Listing image storage bucket. Upload policies can be added once the UI switches from URL input to file upload.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- IMPORTANT: Admin accounts must be promoted manually in SQL/dashboard.
-- Never allow public sign-up metadata to create an admin role.
-- Example after creating the admin account:
-- update public.profiles set role = 'admin' where id = '<ADMIN_USER_UUID>';
