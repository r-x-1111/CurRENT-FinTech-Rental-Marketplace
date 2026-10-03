-- CurRENT initial database schema
-- Run this migration in a Supabase project before connecting the mobile app.

create extension if not exists "pgcrypto";

create type verification_status as enum ('not_verified', 'pending', 'verified', 'failed');
create type listing_status as enum ('draft', 'published', 'paused', 'unavailable');
create type rental_status as enum (
  'pending', 'approved', 'rejected', 'payment_required', 'confirmed',
  'upcoming', 'active', 'return_pending', 'completed', 'cancelled', 'disputed'
);
create type payment_status as enum ('required', 'processing', 'paid', 'failed', 'refunded');
create type deposit_status as enum ('required', 'secured', 'held', 'release_pending', 'released', 'disputed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  verification_status verification_status not null default 'not_verified',
  risk_score integer not null default 50 check (risk_score between 0 and 100),
  average_rating numeric(3,2) not null default 0,
  completed_rentals integer not null default 0,
  late_returns integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  daily_price numeric(10,2) not null check (daily_price > 0),
  estimated_value numeric(12,2) not null check (estimated_value > 0),
  location text not null,
  status listing_status not null default 'draft',
  available_from date,
  available_to date,
  created_at timestamptz not null default now()
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  renter_id uuid not null references public.profiles(id),
  owner_id uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  rental_fee numeric(10,2) not null,
  service_fee numeric(10,2) not null,
  security_deposit numeric(10,2) not null,
  protection_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  status rental_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (renter_id <> owner_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  status payment_status not null default 'required',
  payment_method text,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  status deposit_status not null default 'required',
  held_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  message text not null check (char_length(message) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id, reviewee_id)
);

create table public.rental_evidence (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  evidence_type text not null check (evidence_type in ('check_in', 'check_out', 'dispute')),
  photo_url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  opened_by uuid not null references public.profiles(id),
  reason text not null,
  description text not null,
  status text not null default 'under_review' check (status in ('under_review', 'awaiting_evidence', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create table public.favourites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'general',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index listings_owner_idx on public.listings(owner_id);
create index listings_category_idx on public.listings(category);
create index listings_status_idx on public.listings(status);
create index bookings_renter_idx on public.bookings(renter_id);
create index bookings_owner_idx on public.bookings(owner_id);
create index bookings_status_idx on public.bookings(status);
create index messages_booking_idx on public.messages(booking_id, created_at);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.deposits enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.rental_evidence enable row level security;
alter table public.disputes enable row level security;
alter table public.favourites enable row level security;
alter table public.notifications enable row level security;

-- Public marketplace reads
create policy "Published listings are readable" on public.listings
  for select using (status = 'published' or owner_id = auth.uid());
create policy "Listing images are readable" on public.listing_images
  for select using (true);
create policy "Profiles are readable" on public.profiles
  for select using (true);
create policy "Reviews are readable" on public.reviews
  for select using (true);

-- User-owned writes
create policy "Users update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Owners manage own listings" on public.listings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners manage listing images" on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

-- Booking participants can see booking-related records
create policy "Booking participants read bookings" on public.bookings
  for select using (renter_id = auth.uid() or owner_id = auth.uid());
create policy "Renters create booking requests" on public.bookings
  for insert with check (renter_id = auth.uid());
create policy "Booking participants update bookings" on public.bookings
  for update using (renter_id = auth.uid() or owner_id = auth.uid());

create policy "Participants read payments" on public.payments
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and (b.renter_id = auth.uid() or b.owner_id = auth.uid()))
  );
create policy "Participants read deposits" on public.deposits
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and (b.renter_id = auth.uid() or b.owner_id = auth.uid()))
  );

create policy "Participants read messages" on public.messages
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "Participants send messages" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "Users create reviews" on public.reviews
  for insert with check (reviewer_id = auth.uid());
create policy "Participants manage evidence" on public.rental_evidence
  for all using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
create policy "Users manage own disputes" on public.disputes
  for all using (opened_by = auth.uid()) with check (opened_by = auth.uid());
create policy "Users manage favourites" on public.favourites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read own notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile automatically when a new Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
