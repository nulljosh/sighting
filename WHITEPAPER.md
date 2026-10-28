# Sighting Technical Whitepaper

**v0.1.0** | August 2026

A pet goes missing. The neighbourhood should know in minutes.

Sighting exists because the places people actually post a lost pet, Facebook
groups and Craigslist, are both account-walled and neither is searchable by
location or species, which costs exactly the minutes that matter most. It is a lost and found board for pets. Post one, find one, mark it resolved.
Web plus native apps on a shared Supabase backend. Live at
[homeward.heyitsmejosh.com](https://homeward.heyitsmejosh.com).

## Problem

Lost-pet posts live on Facebook groups and Craigslist, both of which are
account-walled and neither of which is searchable by location or species. The
constraint that shapes everything here: a person who just lost a dog will not
create an account. Any signup step loses the post.

## No-Auth Posting

There are no accounts, because the one constraint above rules out the
standard fix of gating edits behind a login. Posting writes a listing and returns a private
edit-token link, the same mechanic Craigslist uses. Whoever holds the link can
edit or resolve the listing; nobody else can, because the token is the
credential.

Mutation runs through a Postgres RPC (`update_listing`) rather than a direct
table write, so the token check happens server-side inside the function
instead of trusting a client to enforce it. A
client that guesses a listing id still cannot mutate it without the token, and
RLS denies unmediated writes to the table outright.

Resolved listings are marked, not deleted, because a found pet is the useful half of
the record and a record of past resolutions is worth more than a clean table.

## Data Model

One `listings` table (species, status, location, contact, photo, edit token)
plus a `pet-photos` storage bucket. No joins, no user table, nothing to
migrate. Photos upload straight to Supabase Storage from the client.

## Clients

| Platform | Stack | Notes |
|----------|-------|-------|
| Web | Next.js 16 (App Router) + Tailwind, on Vercel | Static export |
| iOS | SwiftUI, xcodegen, supabase-swift | Same table, same RPC |

Both clients talk to Supabase directly, there is no intermediate API to keep
in sync, because a second server would just be one more place the token check
could be forgotten, which is why the check has to live in the database.

## Privacy

No accounts means no user records to leak, the same design choice that
removed the signup barrier also removes an entire category of thing to
secure. A listing carries whatever contact
method the poster chose to publish, and nothing else; the edit token is the
only secret and it is held by the poster alone.

## License

MIT 2026, Joshua Trommel
