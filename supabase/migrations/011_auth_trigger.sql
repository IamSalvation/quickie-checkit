-- 011_auth_trigger.sql
-- CheckIt signup trigger. Creates an account (pending) + operator (owner/admin)
-- atomically when a new auth.user is created.
--
-- Frontend must send these in signUp options.data:
--   account_name  - e.g. "St. Mary's Secondary School" (defaults to "My Account")
--   full_name     - e.g. "Ada Okoye" (defaults to email)
--   preset        - school | symposium | bootcamp | conference | hotel | event | custom
--                   (defaults to school if missing or invalid)

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  v_account_name text := coalesce(new.raw_user_meta_data->>'account_name', 'My Account');
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_preset text := coalesce(new.raw_user_meta_data->>'preset', 'school');
  v_slug text;
  v_id_prefix text;
begin
  -- Normalize preset
  if v_preset not in ('school','symposium','bootcamp','conference','hotel','event','custom') then
    v_preset := 'school';
  end if;

  -- Slug: slugified name + 6-char random
  v_slug := lower(regexp_replace(v_account_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(gen_random_uuid()::text, 1, 6);
  -- Trim leading/trailing dashes just in case
  v_slug := trim(both '-' from v_slug);

  -- id_prefix: uppercase letters/digits from name, first 4-6 chars, min 2, fallback ACCT
  v_id_prefix := upper(regexp_replace(v_account_name, '[^a-zA-Z0-9]', '', 'g'));
  v_id_prefix := substr(v_id_prefix, 1, 6);
  if length(v_id_prefix) < 2 then
    v_id_prefix := 'ACCT';
  end if;
  -- Ensure it starts with a letter (constraint requires it)
  if v_id_prefix !~ '^[A-Z]' then
    v_id_prefix := 'A' || v_id_prefix;
    v_id_prefix := substr(v_id_prefix, 1, 6);
  end if;

  -- Create account: pending status, v1 tier, preset from metadata
  insert into public.accounts (name, slug, id_prefix, status, tier, preset)
  values (v_account_name, v_slug, v_id_prefix, 'pending', 'v1', v_preset)
  returning id into new_account_id;

  -- Create operator: owner + admin
  insert into public.operators (id, account_id, email, full_name, role, is_owner, status)
  values (new.id, new_account_id, new.email, v_full_name, 'admin', true, 'active')
  on conflict (id) do nothing;

  return new;
end $$;

-- Wire the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();