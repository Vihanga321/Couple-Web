-- Twonara Google Auth upgrade
-- Run this once in Supabase SQL Editor after supabase/schema.sql.

-- Make Google-created profile names friendlier when Auth metadata provides full_name instead of name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Twonara user'
    ),
    case when new.raw_user_meta_data ->> 'role' = 'business' then 'business' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Users may switch only between normal customer/business roles.
-- This function intentionally never grants admin access.
create or replace function public.set_my_account_role(new_role text)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  result_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new_role not in ('customer', 'business') then
    raise exception 'Invalid account role';
  end if;

  update public.profiles
  set role = new_role
  where id = auth.uid()
    and status = 'active'
    and role <> 'admin'
  returning * into result_profile;

  if result_profile.id is null then
    select * into result_profile
    from public.profiles
    where id = auth.uid();
  end if;

  return result_profile;
end;
$$;

revoke all on function public.set_my_account_role(text) from public;
grant execute on function public.set_my_account_role(text) to authenticated;
