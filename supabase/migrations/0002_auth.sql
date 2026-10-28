alter table listings add column user_id uuid references auth.users(id);

create policy "owners can update their own listings" on listings
  for update using (auth.uid() = user_id);
