# Sighting, project notes

Lost/found pet board: Next.js static web app + SwiftUI iOS/macOS app sharing one backend. Auth is optional everywhere: posts are public and editable via a UUID `edit_token` link generated at post time whether or not you're signed in; signing in (email/password, Apple, or Google) just sets `user_id` on new posts so they can be edited without the token.

Live at sighting.jaybulb.com (Cloudflare Pages project `homeward`; old hosts homeward. and pets.jaybulb.com still serve). Deploy: `npm run build && env -u CLOUDFLARE_API_TOKEN npx wrangler pages deploy out --project-name homeward --branch main`. Backend is the shared `jaybulb-api` Worker (D1); `lib/spark-client.js` mirrors the old Supabase client API, and the listing RPCs (`create_listing`, `resolve_listing`, `update_listing`, `listing_by_token`) live in `jaybulb-api/src/index.js`. A backend change needs its own `wrangler deploy` from that repo.

## Key files
- `lib/spark.ts`: API client + `Listing` type, shared by all pages
- `lib/geo.ts`, `lib/MiniMap.tsx`: OpenStreetMap geocoding and the static tile map on listings
- `app/page.tsx`: landing; `app/board/page.tsx`: list, filters, Reunited tab
- `app/post/page.tsx`: post form, returns the edit link on success
- `app/listing/page.tsx`: public detail view (`?id=`), map, print poster
- `app/listing/edit/page.tsx`: token-gated resolve flow
- `ios/project.yml`: XcodeGen spec; regenerate the `.xcodeproj` with `xcodegen generate` after changing this or adding new Swift files
- `ios/Sighting/API.swift`: jaybulb-api client with no SDK (session in the Keychain, email and Apple sign-in, tolerant date decoding for old Postgres-style rows); `ListingStore.swift` makes the listing calls
- `lib/AuthBar.tsx`: header auth status widget; `app/login`, `app/register`, `app/forgot-password`, `app/reset-password`, Supabase Auth pages. Posting still works anonymously (user_id is null); logged-in posts get `user_id` set and can be edited without the edit_token.
- `ios/Sighting/AuthView.swift`: iOS/macOS auth (single target, `supportedDestinations: [iOS, macOS]`): email and password, Apple (bundle id must be in jaybulb-api `APPLE_AUDIENCES`), password reset, account deletion. Google sign-in is web only for now. URL scheme stays `homeward`

## Conventions
- No server-side API routes; both clients (web, iOS) talk to jaybulb-api directly.
- Listing mutations always go through the `update_listing` RPC, never a direct table update, since RLS blocks direct updates by design (token check lives in the function).
- This repo's Next.js version (16.2.9) has breaking changes from training-data Next.js, check `node_modules/next/dist/docs/` before assuming an API exists.
