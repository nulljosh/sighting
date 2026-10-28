-- Fields that real street posters carry: reward, sex, and the date last seen.
alter table listings_data
  add column reward text,
  add column sex text,
  add column last_seen_at date;

create or replace view listings as
  select id, created_at, type, pet_name, species, color, description,
         tag_number, last_seen_location, lat, lng, photo_url,
         contact_phone, contact_email, status, user_id,
         reward, sex, last_seen_at
  from listings_data;

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
  contact_email text default null,
  reward text default null,
  sex text default null,
  last_seen_at date default null
) returns listings_data as $$
  insert into listings_data (
    type, species, last_seen_location, pet_name, color, description,
    tag_number, photo_url, contact_phone, contact_email, user_id,
    reward, sex, last_seen_at
  ) values (
    type, species, last_seen_location, pet_name, color, description,
    tag_number, photo_url, contact_phone, contact_email, auth.uid(),
    reward, sex, last_seen_at
  )
  returning *;
$$ language sql security definer;
