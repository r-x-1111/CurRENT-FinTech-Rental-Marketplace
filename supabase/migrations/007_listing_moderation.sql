-- CurRENT listing approval is shared between accounts and enforced by RLS.
alter type listing_status add value if not exists 'pending_review';
alter type listing_status add value if not exists 'rejected';

drop policy if exists "Owners manage own listings" on public.listings;
create policy "Owners create non-public listings" on public.listings
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and status::text in ('draft', 'pending_review')
  );
create policy "Owners edit non-public listings" on public.listings
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and status::text in ('draft', 'pending_review', 'paused', 'unavailable'));
create policy "Owners delete own listings" on public.listings
  for delete to authenticated using (owner_id = (select auth.uid()));
create policy "Administrators approve legacy listings" on public.listings
  for update to authenticated using (
    owner_id <> (select auth.uid()) and auth.jwt() -> 'app_metadata' ->> 'current_admin' = 'true'
  ) with check (
    owner_id <> (select auth.uid()) and auth.jwt() -> 'app_metadata' ->> 'current_admin' = 'true'
  );

alter table public.chat_listings
  add column if not exists moderation_status text,
  add column if not exists rejection_reason text,
  add column if not exists archived boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

update public.chat_listings
set moderation_status = case when published then 'approved' else 'draft' end
where moderation_status is null;
alter table public.chat_listings alter column moderation_status set default 'draft';
alter table public.chat_listings alter column moderation_status set not null;
alter table public.chat_listings add constraint chat_listing_moderation_status_check
  check (moderation_status in ('draft', 'pending_review', 'approved', 'rejected'));

drop policy if exists "Published chat listings are visible" on public.chat_listings;
drop policy if exists "Guests browse published chat listings" on public.chat_listings;
create policy "Published chat listings are visible" on public.chat_listings
  for select to authenticated using ((published and not archived) or owner_id = (select auth.uid()));
create policy "Guests browse published chat listings" on public.chat_listings
  for select to anon using (published and not archived);

drop policy if exists "Owner creates chat listing" on public.chat_listings;
drop policy if exists "Owner updates chat listing" on public.chat_listings;
create policy "Owners submit unpublished listings" on public.chat_listings
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and not published
    and moderation_status in ('draft', 'pending_review')
  );
create policy "Owners edit unpublished listings" on public.chat_listings
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and not published
    and moderation_status in ('draft', 'pending_review')
  );
create policy "Administrators inspect submitted listings" on public.chat_listings
  for select to authenticated using (
    auth.jwt() -> 'app_metadata' ->> 'current_admin' = 'true'
  );

create or replace function public.review_chat_listing(
  target_listing_id text, approve boolean, reason text default null
) returns void language plpgsql security definer set search_path = public as $$
declare target public.chat_listings;
begin
  if auth.jwt() -> 'app_metadata' ->> 'current_admin' is distinct from 'true' then
    raise exception 'Administrator access required';
  end if;
  select * into target from public.chat_listings where listing_id = target_listing_id and not archived for update;
  if not found or target.moderation_status <> 'pending_review' then
    raise exception 'Listing is not awaiting review';
  end if;
  if target.owner_id = auth.uid() then
    raise exception 'You cannot review your own listing';
  end if;
  if not approve and nullif(trim(reason), '') is null then
    raise exception 'Provide a rejection reason';
  end if;
  update public.chat_listings set
    moderation_status = case when approve then 'approved' else 'rejected' end,
    published = approve,
    rejection_reason = case when approve then null else trim(reason) end,
    reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now(),
    listing_data = listing_data || jsonb_build_object(
      'status', case when approve then 'published' else 'rejected' end,
      'rejectionReason', case when approve then null else trim(reason) end
    )
  where listing_id = target_listing_id;
end;
$$;
revoke all on function public.review_chat_listing(text, boolean, text) from public;
grant execute on function public.review_chat_listing(text, boolean, text) to authenticated;

create or replace function public.set_approved_listing_active(
  target_listing_id text, make_active boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.chat_listings set
    published = make_active, updated_at = now(),
    listing_data = listing_data || jsonb_build_object('status', case when make_active then 'published' else 'paused' end)
  where listing_id = target_listing_id
    and owner_id = auth.uid() and moderation_status = 'approved' and not archived;
  if not found then raise exception 'Only an approved listing can be paused or resumed by its owner'; end if;
end;
$$;
revoke all on function public.set_approved_listing_active(text, boolean) from public;
grant execute on function public.set_approved_listing_active(text, boolean) to authenticated;

create or replace function public.archive_chat_listing(target_listing_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.chat_listings set published = false, archived = true, updated_at = now()
  where listing_id = target_listing_id and owner_id = auth.uid();
end;
$$;
revoke all on function public.archive_chat_listing(text) from public;
grant execute on function public.archive_chat_listing(text) to authenticated;
