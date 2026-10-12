-- Keep a listing snapshot visible to participants of an existing chat after unpublishing.
drop policy if exists "Published chat listings are visible" on public.chat_listings;
create policy "Published or chatted listings are visible" on public.chat_listings
  for select to authenticated using (
    published or owner_id = (select auth.uid()) or
    exists (select 1 from public.chat_conversations c
      where c.listing_id = chat_listings.listing_id
        and c.renter_id = (select auth.uid()))
  );
