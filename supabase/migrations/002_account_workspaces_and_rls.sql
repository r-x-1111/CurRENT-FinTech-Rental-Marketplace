-- Persist each signed-in account's marketplace workspace behind owner-only RLS.
create table if not exists public.marketplace_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  account_kind text not null check (account_kind in ('normal', 'demo')),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_workspaces enable row level security;
revoke all on public.marketplace_workspaces from anon, authenticated;
grant select, insert, update on public.marketplace_workspaces to authenticated;

drop policy if exists "Account reads own marketplace workspace"
  on public.marketplace_workspaces;
create policy "Account reads own marketplace workspace"
  on public.marketplace_workspaces
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    and account_kind = case
      when auth.jwt() -> 'app_metadata' ->> 'account_kind' = 'demo'
        and auth.jwt() -> 'app_metadata' ->> 'verified_demo' = 'true'
      then 'demo'
      else 'normal'
    end
  );

drop policy if exists "Account creates own marketplace workspace"
  on public.marketplace_workspaces;
create policy "Account creates own marketplace workspace"
  on public.marketplace_workspaces
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and account_kind = case
      when auth.jwt() -> 'app_metadata' ->> 'account_kind' = 'demo'
        and auth.jwt() -> 'app_metadata' ->> 'verified_demo' = 'true'
      then 'demo'
      else 'normal'
    end
  );

drop policy if exists "Account updates own marketplace workspace"
  on public.marketplace_workspaces;
create policy "Account updates own marketplace workspace"
  on public.marketplace_workspaces
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    and account_kind = case
      when auth.jwt() -> 'app_metadata' ->> 'account_kind' = 'demo'
        and auth.jwt() -> 'app_metadata' ->> 'verified_demo' = 'true'
      then 'demo'
      else 'normal'
    end
  )
  with check (
    owner_id = (select auth.uid())
    and account_kind = case
      when auth.jwt() -> 'app_metadata' ->> 'account_kind' = 'demo'
        and auth.jwt() -> 'app_metadata' ->> 'verified_demo' = 'true'
      then 'demo'
      else 'normal'
    end
  );

-- Remove permissive legacy policies from the initial schema.
drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Listing images are readable" on public.listing_images;
drop policy if exists "Reviews are readable" on public.reviews;
drop policy if exists "Booking participants update bookings" on public.bookings;
drop policy if exists "Renters create booking requests" on public.bookings;
drop policy if exists "Participants read messages" on public.messages;
drop policy if exists "Participants send messages" on public.messages;
drop policy if exists "Users create reviews" on public.reviews;
drop policy if exists "Participants manage evidence" on public.rental_evidence;
drop policy if exists "Users manage own disputes" on public.disputes;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

create policy "Published listing images are readable" on public.listing_images
  for select to authenticated using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.owner_id = (select auth.uid()))
    )
  );

create policy "Booking participants read reviews" on public.reviews
  for select to authenticated using (
    reviewer_id = (select auth.uid())
    or reviewee_id = (select auth.uid())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
    )
  );
create policy "Completed booking participants create reviews" on public.reviews
  for insert to authenticated with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (
          (b.renter_id = reviewer_id and b.owner_id = reviewee_id)
          or (b.owner_id = reviewer_id and b.renter_id = reviewee_id)
        )
    )
  );

create policy "Renter creates request for published listing" on public.bookings
  for insert to authenticated with check (
    renter_id = (select auth.uid())
    and renter_id <> owner_id
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.owner_id = public.bookings.owner_id
        and l.status = 'published'
    )
  );

create policy "Booking participants read messages" on public.messages
  for select to authenticated using (
    (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()))
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          (b.renter_id = (select auth.uid()) and
            (sender_id = b.renter_id or receiver_id = b.renter_id))
          or
          (b.owner_id = (select auth.uid()) and
            (sender_id = b.owner_id or receiver_id = b.owner_id))
        )
    )
  );
create policy "Booking participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and sender_id <> receiver_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          (b.renter_id = sender_id and b.owner_id = receiver_id)
          or (b.owner_id = sender_id and b.renter_id = receiver_id)
        )
    )
  );

create policy "Booking participants read evidence" on public.rental_evidence
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
    )
  );
create policy "Booking participants add own evidence" on public.rental_evidence
  for insert to authenticated with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
    )
  );

create policy "Booking participants read disputes" on public.disputes
  for select to authenticated using (
    opened_by = (select auth.uid())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
    )
  );
create policy "Booking participants open disputes" on public.disputes
  for insert to authenticated with check (
    opened_by = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
    )
  );

revoke execute on function public.handle_new_user() from public, anon, authenticated;
