-- The `select using (true)` policy on `listings` let anyone read every row's
-- edit_token, and therefore resolve or edit anyone else's listing.
-- Fix: the table keeps the token but is no longer reachable over the API. The
-- public name `listings` is now a read-only view without that column, and
-- create_listing() is the only thing that ever hands a token back.

alter table listings rename to listings_data;
drop view if exists public_listings;
revoke all on listings_data from anon, authenticated;

-- definer view: the base table is unreachable, so this is the whole read surface
create view listings as
  select id, created_at, type, pet_name, species, color, description,
         tag_number, last_seen_location, lat, lng, photo_url,
         contact_phone, contact_email, status, user_id
  from listings_data;

grant select on listings to anon, authenticated;
-- a simple view is auto-updatable, and a definer view ignores RLS; reads only
revoke insert, update, delete on listings from anon, authenticated;

drop policy if exists "anyone can insert a listing" on listings_data;

create or replace function create_listing(
  type listing_type,
  species text,
  last_seen_location text,
  pet_name text default null,
  color text default null,
  description text default null,
  tag_number text default null,
  photo_url text default null,
  contact_phone text default null,
  contact_email text default null
) returns listings_data as $$
  insert into listings_data (
    type, species, last_seen_location, pet_name, color, description,
    tag_number, photo_url, contact_phone, contact_email, user_id
  ) values (
    type, species, last_seen_location, pet_name, color, description,
    tag_number, photo_url, contact_phone, contact_email, auth.uid()
  )
  returning *;
$$ language sql security definer;

-- the edit link: exchange a token you already hold for the one row it unlocks
create or replace function listing_by_token(p_token uuid)
returns listings_data as $$
  select * from listings_data where edit_token = p_token;
$$ language sql security definer;

-- signed-in owners don't need the token; anonymous posters do
create or replace function update_listing(p_id uuid, p_token uuid, p_status listing_status)
returns void as $$
begin
  update listings_data
  set status = p_status
  where id = p_id
    and (edit_token = p_token or (user_id is not null and user_id = auth.uid()));
end;
$$ language plpgsql security definer;
