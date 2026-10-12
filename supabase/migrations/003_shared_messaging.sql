-- Shared renter/owner chat, independent of account-private marketplace snapshots.
create table if not exists public.chat_listings (
  listing_id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text not null,
  listing_data jsonb not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.chat_listings(listing_id) on delete cascade,
  renter_id uuid not null references auth.users(id) on delete cascade,
  renter_name text not null default 'Renter',
  owner_id uuid not null references auth.users(id) on delete cascade,
  booking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, renter_id, owner_id),
  check (renter_id <> owner_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id),
  check (char_length(trim(body)) > 0 or image_path is not null)
);
create index if not exists chat_conversations_renter_idx on public.chat_conversations(renter_id, updated_at desc);
create index if not exists chat_conversations_owner_idx on public.chat_conversations(owner_id, updated_at desc);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);

alter table public.chat_listings enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
grant select, insert, update on public.chat_listings, public.chat_conversations, public.chat_messages to authenticated;
revoke update on public.chat_conversations, public.chat_messages from authenticated;
grant update (booking_id, updated_at) on public.chat_conversations to authenticated;
grant update (read_at) on public.chat_messages to authenticated;

create policy "Published chat listings are visible" on public.chat_listings
  for select to authenticated using (published or owner_id = (select auth.uid()));
create policy "Owner creates chat listing" on public.chat_listings
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owner updates chat listing" on public.chat_listings
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Participants read chat conversations" on public.chat_conversations
  for select to authenticated using (renter_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy "Renter starts chat for published listing" on public.chat_conversations
  for insert to authenticated with check (
    renter_id = (select auth.uid()) and renter_id <> owner_id and
    exists (select 1 from public.chat_listings l where l.listing_id = chat_conversations.listing_id
      and l.owner_id = chat_conversations.owner_id and l.published)
  );
create policy "Participants update booking link" on public.chat_conversations
  for update to authenticated using (renter_id = (select auth.uid()) or owner_id = (select auth.uid()))
  with check (renter_id = (select auth.uid()) or owner_id = (select auth.uid()));

create policy "Participants read chat messages" on public.chat_messages
  for select to authenticated using (
    (sender_id = (select auth.uid()) or receiver_id = (select auth.uid())) and
    exists (select 1 from public.chat_conversations c where c.id = conversation_id
      and (c.renter_id = (select auth.uid()) or c.owner_id = (select auth.uid())))
  );
create policy "Participants send chat messages" on public.chat_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and sender_id <> receiver_id and
    exists (select 1 from public.chat_conversations c where c.id = conversation_id and
      ((c.renter_id = sender_id and c.owner_id = receiver_id) or
       (c.owner_id = sender_id and c.renter_id = receiver_id))) and
    (image_path is null or image_path like conversation_id::text || '/%')
  );
create policy "Recipient marks chat message read" on public.chat_messages
  for update to authenticated using (receiver_id = (select auth.uid()))
  with check (receiver_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "Chat participants view images" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and exists (
    select 1 from public.chat_conversations c where c.id::text = split_part(name, '/', 1)
      and (c.renter_id = (select auth.uid()) or c.owner_id = (select auth.uid()))));
create policy "Chat participants upload images" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and exists (
    select 1 from public.chat_conversations c where c.id::text = split_part(name, '/', 1)
      and (c.renter_id = (select auth.uid()) or c.owner_id = (select auth.uid()))));

alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_messages;
