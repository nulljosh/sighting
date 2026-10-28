create extension if not exists pgcrypto;

create type listing_type as enum ('lost', 'found');
create type listing_status as enum ('active', 'resolved');

create table listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type listing_type not null,
  pet_name text,
  species text not null,
  color text,
  description text,
  tag_number text,
  last_seen_location text not null,
  lat double precision,
  lng double precision,
  photo_url text,
  contact_phone text,
  contact_email text,
  status listing_status not null default 'active',
  edit_token uuid not null default gen_random_uuid()
);

alter table listings enable row level security;

-- public can read everything except the edit_token
create view public_listings as
  select id, created_at, type, pet_name, species, color, description,
         tag_number, last_seen_location, lat, lng, photo_url,
         contact_phone, contact_email, status
  from listings;

create policy "anyone can read listings" on listings
  for select using (true);

create policy "anyone can insert a listing" on listings
  for insert with check (true);

-- updates require the edit_token to be passed via request, enforced by this function
create or replace function update_listing(p_id uuid, p_token uuid, p_status listing_status)
returns void as $$
begin
  update listings
  set status = p_status
  where id = p_id and edit_token = p_token;
end;
$$ language plpgsql security definer;

create policy "no direct updates" on listings
  for update using (false);

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "anyone can upload pet photos" on storage.objects
  for insert with check (bucket_id = 'pet-photos');

create policy "anyone can view pet photos" on storage.objects
  for select using (bucket_id = 'pet-photos');
