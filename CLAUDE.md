# Sighting, project notes

Craigslist-style lost/found pet board: Next.js web app + SwiftUI iOS/macOS app sharing one Supabase backend. Auth is optional everywhere: posts are public and editable via a UUID `edit_token` link generated at post time whether or not you're signed in; signing in (email/password, Apple, or Google) just sets `user_id` on new posts so they can be edited without the token.

Deployed at pets.heyitsmejosh.com (Vercel). Backend lives on the shared `spark` Supabase project (ref `tjsxsqlxjmanwvmywwvw`), not a dedicated project, free-tier project limit is maxed, so this project's tables/bucket/RPC just sit alongside spark's own schema.

## Key files
- `lib/supabase.ts`: web Supabase client + `Listing` type, shared by all pages
- `supabase/migrations/0001_init.sql`: schema, RLS, storage bucket, `update_listing` RPC (the only way to mutate a listing's status, gated on `edit_token` matching)
- `app/page.tsx`: list/filter/search view
- `app/post/page.tsx`: post form, returns the edit link on success
- `app/listing/[id]/page.tsx`: public detail view
- `app/listing/edit/page.tsx`: token-gated resolve flow
- `ios/project.yml`: XcodeGen spec; regenerate the `.xcodeproj` with `xcodegen generate` after changing this or adding new Swift files
- `ios/Sighting/SupabaseClient.swift`: reads `SUPABASE_URL`/`SUPABASE_ANON_KEY` from process environment (set via Xcode scheme, not a plist)
- `lib/AuthBar.tsx`: header auth status widget; `app/login`, `app/register`, `app/forgot-password`, `app/reset-password`, Supabase Auth pages. Posting still works anonymously (user_id is null); logged-in posts get `user_id` set and can be edited without the edit_token.
- `ios/Sighting/AuthView.swift`: iOS/macOS auth (single target, `supportedDestinations: [iOS, macOS]`) — email/password, Apple, Google (`homeward://` redirect scheme), password reset, account deletion via the shared spark `delete-account` Edge Function

## Conventions
- No server-side API routes, both clients (web, iOS) talk to Supabase directly.
- Listing mutations always go through the `update_listing` RPC, never a direct table update, since RLS blocks direct updates by design (token check lives in the function).
- This repo's Next.js version (16.2.9) has breaking changes from training-data Next.js, check `node_modules/next/dist/docs/` before assuming an API exists.
