# Architecture

Sighting is a lost and found pet board. Post lost or found pets with photos, search by location, and mark listings resolved when a pet is found. Built as a web app (Next.js on Vercel) and native iOS/macOS (SwiftUI), plus Kotlin Multiplatform (Android, desktop) and CLI (Swift). All frontends share one Supabase backend.

## How it runs

Web app: `app/layout.tsx` wraps the Next.js app with auth state. `app/page.tsx` (the landing) displays a wall of recent posts behind a scrim, then features and install links. Clicking a post or searching routes to `app/board/page.tsx`, which filters listings by type (lost/found) and search query. `app/post/page.tsx` accepts a photo and details (pet name, species, color, location, reward, etc), posts anonymously or as a signed-in user, and returns an edit link. `app/listing/page.tsx` shows the detail view: photo, map location, contact options. `app/listing/edit/page.tsx` lets the listing creator or any signed-in user mark the post resolved; on resolve, `supabase/functions/notify-found/index.ts` emails the owner if they provided one.

Auth is optional: posts are public and editable via a UUID `edit_token` link (Craigslist-style). Signing in (email/password, Apple, or Google) links new posts to `user_id` for later lookup. Password reset, account deletion, and OAuth sign-in all go through Supabase Auth pages.

iOS/macOS app: one SwiftUI target targeting both via `supportedDestinations`. `ListingsView.swift` is the board (filter by type, search, mark resolved). `PostListingView.swift` is the post form. `ListingDetailView.swift` shows detail. `AuthView.swift` handles email/password, Apple/Google sign-in via redirect scheme (`homeward://`), and password reset. `ListingStore.swift` holds listings in memory and syncs to Supabase; edit tokens are cached in UserDefaults.

KMP: common Listing data model; platform-specific UI in Compose mirroring the web and iOS flows.

CLI (TUI): reads listings from Supabase PostgREST directly, outputs as cards.

## Files

| File | What it owns |
|---|---|
| `app/layout.tsx` | Root layout: metadata, font imports, WebMCP registration, share button |
| `app/page.tsx` | Landing: hero wall of recent posts (intersection observer for reveal animation), features, install |
| `app/board/page.tsx` | Listings board: filter by lost/found, search by name/location, mark resolved, link to detail |
| `app/listing/page.tsx` | Listing detail: photo, map, full metadata (species, sex, reward, etc), contact link, mark resolved button |
| `app/listing/edit/page.tsx` | Token-gated resolve: confirm and mark resolved, triggers email notification |
| `app/login/page.tsx` | Email/password sign-in |
| `app/register/page.tsx` | Email/password account creation |
| `app/forgot-password/page.tsx` | Password reset request |
| `app/reset-password/page.tsx` | Password reset form (from email link) |
| `app/post/page.tsx` | Post form: photo upload, pet details (name, species, color, sex, reward, location, description), anonymous or signed-in, returns edit link |
| `lib/supabase.ts` | Supabase client init, Listing type definition |
| `lib/AuthBar.tsx` | Header auth status: current user email or sign-in link |
| `lib/OAuthButtons.tsx` | OAuth button group: Apple, Google, GitHub |
| `lib/webmcp.tsx` | WebMCP tool registration for agents to search listings and resolve posts |
| `app/globals.css` | Global CSS: imports portfolio tokens and Tailwind, theme variables |
| `app/landing.css` | Landing page styles: hero wall, features cards, accent colors |
| `public/sw.js` | Service worker: network-first for pages, cache-first for hashed assets |
| `ios/Sighting/SightingApp.swift` | SwiftUI app entry: window group, commands (share app link) |
| `ios/Sighting/AuthView.swift` | Auth sheet: email/password, Apple/Google OAuth (with SHA256 nonce), password reset, account deletion |
| `ios/Sighting/ListingsView.swift` | Board: lazy list of listings, filter by type/resolved status, search, mark resolved, detail navigation |
| `ios/Sighting/PostListingView.swift` | Post form: photo picker, pet details, submit |
| `ios/Sighting/ListingDetailView.swift` | Detail: photo, all metadata, location badge, mark resolved button |
| `ios/Sighting/ListingStore.swift` | Observable state: listings array, loading/error flags, per-device edit token cache (UserDefaults), Supabase API calls |
| `ios/Sighting/Listing.swift` | Listing and NewListing structs, Codable, ListingType (lost/found), ListingStatus (active/resolved) |
| `ios/Sighting/SupabaseClient.swift` | Supabase client singleton: anon key baked in (public by design, RLS-guarded) |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/homeward/Listing.kt` | Serializable Listing data model, mirrored from iOS |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/homeward/AuthClient.kt` | Ktor HTTP client for Supabase Auth (sign-up, sign-in, token refresh) |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/homeward/ListingsClient.kt` | Ktor HTTP client for Supabase PostgREST (read-only listings list) |
| `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/homeward/BoardScreen.kt` | Compose board: listings list, filter, search, detail navigation |
| `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/homeward/AuthBar.kt` | Compose auth widget: sign-in/sign-up form or current user |
| `kmp/composeApp/src/androidMain/` | Android entry point, MainActivity opens BoardScreen |
| `kmp/composeApp/src/desktopMain/` | Desktop entry point, Compose window with min size |
| `supabase/migrations/` | Schema: listings table with RLS, edit_token column (public in listings_data table but hidden from listings view), types (listing_type, listing_status), functions (update_listing, resolve_listing, create_listing) |
| `supabase/functions/notify-found/index.ts` | Edge Function: called on resolve, emails the listing owner via Resend if email_address was provided |
| `tui/main.swift` | CLI: fetches listings from Supabase PostgREST, renders as text cards |
| `scripts/set-resend-key.sh` | One-time setup: sets the Resend API key for the notify-found function |
| `next.config.ts` | Static export (no server), Tailwind CSS import |
| `postcss.config.mjs` | PostCSS + Tailwind |
| `eslint.config.mjs` | Next.js ESLint config |

## Auth and tokens

Supabase Auth handles email/password, Apple OAuth, and Google OAuth. Users are optional: posts can be made anonymously and edited via a UUID `edit_token` link (like Craigslist). Signed-in posts set `user_id` and can be edited without the token. Edit tokens are cached per-device in iOS UserDefaults and in KMP's shared storage. Password reset links go through Supabase's email flow. Account deletion calls a shared `delete-account` Edge Function in the `spark` Supabase project (Sighting shares that project to avoid free-tier limits).

## Storage and RLS

One Supabase project shared with Sparkjar (both on free tier; limit is maxed). Listings table (`listings_data`) holds all posts; a view `listings` hides the `edit_token` and `user_id` columns for the public API. RLS policies:
- `listings` (public view): all rows readable by anyone
- `listings_data` (hidden): update gated on token match or user_id match via `update_listing` RPC; `create_listing` RPC handles insert for authenticated or anonymous users
- `resolve_listing` RPC: any signed-in user can call it; marks a listing resolved and triggers the email function

Photos are uploaded to Supabase Storage and referenced by URL in the listing record.

## Gotchas

- Edit tokens are UUIDs, not slugs. They cannot be guessed, so anonymous posts are secure.
- The `edit_token` column is not readable from the public `listings` view; direct table access via PostgREST returns 0 rows even if you're the owner, to prevent listing owners from accidentally discovering other owners' tokens.
- Supabase Auth sends password reset emails directly. Configure a custom email template in the dashboard to match the app's branding.
- iOS and macOS share one target; both entitlements files are needed if signing for real devices, or a build will fail with missing Mac profiles.
