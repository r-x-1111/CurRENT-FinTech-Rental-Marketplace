-- Only public, published listing snapshots are readable before sign-in.
grant select on public.chat_listings to anon;
create policy "Guests browse published chat listings" on public.chat_listings
  for select to anon using (published);
