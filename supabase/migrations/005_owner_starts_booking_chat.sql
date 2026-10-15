-- Let an authenticated listing owner open the same renter/owner thread from a rental.
-- The unique constraint on (listing_id, renter_id, owner_id) prevents duplicates.
create policy "Owner starts chat for own published listing" on public.chat_conversations
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and renter_id <> owner_id and
    exists (select 1 from public.chat_listings l
      where l.listing_id = chat_conversations.listing_id
        and l.owner_id = chat_conversations.owner_id and l.published)
  );
