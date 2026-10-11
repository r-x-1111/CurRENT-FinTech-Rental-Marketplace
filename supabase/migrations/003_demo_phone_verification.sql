-- Demo-only phone verification for newly registered, authenticated Normal accounts.
-- Apply after 001_initial_schema.sql and 002_account_workspaces_and_rls.sql.
-- The demo code is returned only to the requesting authenticated user's active session.
-- No SMS is sent and this must never be represented as real phone verification.
create extension if not exists pgcrypto;

create table if not exists public.demo_phone_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\\+601[0-9]{8,9}$'),
  code_hash text not null,
  expires_at timestamptz not null,
  resend_after timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.demo_phone_challenges enable row level security;
revoke all on public.demo_phone_challenges from public, anon, authenticated;

create or replace function public.demo_phone_verified()
returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1 from public.demo_phone_challenges c
    where c.user_id = auth.uid() and c.verified_at is not null
  );
end;
$$;

create or replace function public.issue_demo_phone_code(p_phone text)
returns text
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_previous public.demo_phone_challenges%rowtype;
  v_bytes bytea;
  v_number bigint;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Sign in to complete phone verification.';
  end if;
  if auth.jwt() -> 'app_metadata' ->> 'account_kind' = 'demo' then
    raise exception 'This account is already provisioned for the demo.';
  end if;
  if p_phone !~ '^\\+601[0-9]{8,9}$' then
    raise exception 'Enter a valid Malaysian mobile number.';
  end if;

  select * into v_previous from public.demo_phone_challenges
  where user_id = v_uid for update;
  if found and v_previous.verified_at is not null then
    raise exception 'Phone verification has already been completed.';
  end if;
  if found and v_previous.resend_after > now() then
    raise exception 'Wait before requesting another demo code.';
  end if;

  v_bytes := gen_random_bytes(4);
  v_number := get_byte(v_bytes, 0)::bigint * 16777216
            + get_byte(v_bytes, 1)::bigint * 65536
            + get_byte(v_bytes, 2)::bigint * 256
            + get_byte(v_bytes, 3)::bigint;
  v_code := lpad((v_number % 1000000)::text, 6, '0');

  insert into public.demo_phone_challenges
    (user_id, phone_e164, code_hash, expires_at, resend_after, attempts, verified_at, updated_at)
  values
    (v_uid, p_phone, crypt(v_code, gen_salt('bf')), now() + interval '10 minutes',
     now() + interval '60 seconds', 0, null, now())
  on conflict (user_id) do update set
    phone_e164 = excluded.phone_e164,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    resend_after = excluded.resend_after,
    attempts = 0,
    verified_at = null,
    updated_at = now();

  return v_code;
end;
$$;

create or replace function public.verify_demo_phone_code(p_code text)
returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.demo_phone_challenges%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in before verifying your code.';
  end if;
  if p_code !~ '^[0-9]{6}$' then
    return false;
  end if;

  select * into v_challenge from public.demo_phone_challenges
  where user_id = v_uid for update;
  if not found or v_challenge.verified_at is not null then
    return false;
  end if;
  if v_challenge.attempts >= 5 or v_challenge.expires_at <= now() then
    return false;
  end if;

  if crypt(p_code, v_challenge.code_hash) <> v_challenge.code_hash then
    update public.demo_phone_challenges
    set attempts = attempts + 1, updated_at = now()
    where user_id = v_uid;
    return false;
  end if;

  update public.demo_phone_challenges
  set verified_at = now(), code_hash = 'used', updated_at = now()
  where user_id = v_uid;
  update public.profiles set phone = v_challenge.phone_e164 where id = v_uid;
  return true;
end;
$$;

revoke all on function public.demo_phone_verified() from public, anon;
revoke all on function public.issue_demo_phone_code(text) from public, anon;
revoke all on function public.verify_demo_phone_code(text) from public, anon;
grant execute on function public.demo_phone_verified() to authenticated;
grant execute on function public.issue_demo_phone_code(text) to authenticated;
grant execute on function public.verify_demo_phone_code(text) to authenticated;
