-- Any signed-in user can mark a listing found, not just the owner via edit_token.
-- Mirrors update_listing's shape (security definer, listing_status enum) but
-- gates on auth.uid() instead of a token match.
create or replace function resolve_listing(p_id uuid)
returns listings_data as $$
  update listings_data
  set status = 'resolved'
  where id = p_id and status = 'active' and auth.uid() is not null
  returning *;
$$ language sql security definer;
