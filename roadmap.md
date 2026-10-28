# sighting roadmap

## Cloudflare migration + rename, DONE 2026-08-17

Live on Cloudflare Pages project `sighting` (`homeward-5bq.pages.dev`), serving
both `homeward.heyitsmejosh.com` and `pets.heyitsmejosh.com`. The old `pets.`
URL was kept so existing links don't break. Vercel project deleted.

Renamed from `missing-pets` to Sighting across the web app, the iOS sources
(`ios/Sighting/`, `SightingApp.swift`) and `ios/project.yml`.

How it got here:
- Static export (`output: "export"`) works with no adapter because every page is
  `"use client"` against Supabase, there is nothing to render server-side.
- `/listing/[id]` became `/listing?id=`; a dynamic segment can't static-export
  without `generateStaticParams`, and listing ids aren't known at build time.
- The build needs `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` in `.env.local`.
  Vercel's env API returned empty values (token lacks decrypt), but both are
  `NEXT_PUBLIC_*` and therefore compiled into the browser bundle, recovered
  from the deployed JS. Not a leak: the anon key ships to every visitor and is
  guarded by RLS.

## Left

- iOS target: FIXED 2026-08-23. It had never compiled since the rename, the
  target had no Info.plist and none was generated, so code signing failed.
  `GENERATE_INFOPLIST_FILE: YES` plus display-name/launch-screen keys in
  `ios/project.yml`; bundle id moved to `com.nulljosh.homeward` (no ASC record
  exists, so nothing to break). Builds clean against generic/iOS Simulator.
  Never run on a device or simulator, only compiled.
- `homeward.pages.dev` was taken, so the project is `homeward-5bq.pages.dev`.
  Cosmetic only, but note it when adding future DNS records.

## WebMCP + REST API rollout -- shipped 2026-08-27

Done. 5 tools through the existing `lib/supabase.ts` client: `search_listings`, `get_listing`, `whoami`, `post_listing`, and a gated `mark_listing_resolved`. Auth actions are deliberately not exposed.

See `docs/API.md` for the full tool table, linked from the README.

## iOS + Mac apps, DONE 2026-08-27

One XcodeGen target with `supportedDestinations: [iOS, macOS]`, so both platforms
ship from the same SwiftUI sources. Both build clean; iOS verified running in the
simulator against live Supabase (posted a test row via REST, saw it render, resolved
it through `update_listing`).

What was built:
- Supabase URL + anon key baked into `SupabaseClient.swift` (env override kept).
  They only existed as scheme env vars before, so an installed build talked to a
  placeholder host. The anon key is public by design and already ships in the web bundle.
- New `ListingStore` (@Observable): load, search, post, resolve, photo upload, error surface.
  Edit tokens from your own inserts are kept in UserDefaults, which is what enables the
  "Mark as resolved" button on your own listings, same model as the web edit link.
- `NavigationSplitView` so macOS gets a real two-pane window; free on iPhone.
- Search over name/species/color/notes/tag/location, lost-found search scopes, a filter
  menu with "show resolved", relative timestamps, photo thumbnails, tel:/mailto: contact links.
- Sandbox entitlements, `LSApplicationCategoryType`, `DEVELOPMENT_TEAM`, version 1.0 (1).

## Landing page, icon, OAuth, edit_token lockdown, 2026-08-31

- Landing page at `/`; the board moved to `/board`. Hero + three points + a
  recent-listings strip. `scripts/xplat-section.py` targets a static
  `landing/index.html`, so it does not apply to this Next app; the install
  points are written inline instead.
- App icon: `ios/Sighting/Assets.xcassets/AppIcon.appiconset`, rendered from
  `public/icon.svg` with rsvg-convert. iOS gets a square, alpha-free 1024
  (the SVG's own `rx="40"` is stripped so iOS doesn't double-mask the corners);
  macOS gets the full 16-1024 ladder. `ASSETCATALOG_COMPILER_APPICON_NAME` set
  in `project.yml`, without it macOS ships iconless. Both platforms build clean.
- OAuth: Apple / Google / GitHub buttons on login and register via
  `lib/OAuthButtons.tsx` (`signInWithOAuth`). All three providers were already
  enabled on the shared Supabase project; only the redirect allow-list needed
  sighting/pets/localhost added. iOS is still email + anonymous, native SIWA
  is the remaining piece.
- edit_token leak closed. `listings` is now a read-only definer view without
  the column; the table is `listings_data` with all grants revoked from anon
  and authenticated. Posting goes through `create_listing()`, which is the only
  thing that returns a token, and `listing_by_token()` backs the edit link.
  `update_listing()` now also accepts a signed-in owner instead of a token.
  Verified over REST: reads work, `edit_token` does not exist on the view, the
  base table is permission-denied, and direct insert/update/delete on the view
  are refused.

## Landing page + domain, 2026-08-31 (later)

The first landing page was the app's own chrome with a paragraph on top. Rebuilt
it in the house style the other landings use (numen, bookrank): a `hero-wall` of
notices drifting up and down behind a radial scrim, icon over a clamped headline,
feature grid, install-anywhere, closing. Styles in `app/landing.css` scoped under
`.lp` so they don't fight Tailwind; the wall is decorative sample text, while the
"on the board right now" strip under it is live data. Honours
`prefers-reduced-motion` and both colour schemes.

It stayed inside the Next app rather than becoming a static `landing/index.html`
at `/` with the app under `/app` like the other projects, that would mean a
`basePath` change and a two-directory deploy, and the app already owns `/`.

Domain: `homeward.heyitsmejosh.com` is canonical, `pets.` is the legacy alias.
Both were serving identical copies with nothing marking which is real. Pages
`_redirects` only matches on path, not host, so the 301 there does nothing (kept
as documentation); the actual consolidation is per-route `rel=canonical` from
`metadataBase` plus a one-line host check in the layout that sends `pets.` on to
`sighting.` A real edge 301 needs a Cloudflare Bulk Redirect, which the DNS-only
token can't create.

Also: the manifest advertised a green `#2f7d64` theme with the amber-on-dark
icon, and `start_url` pointed at `/`, so an installed app opened the pitch
instead of the board. Both fixed.

## Left
- [ ] No ASC record yet for `com.nulljosh.homeward`; nothing submitted.
- [ ] Native Sign in with Apple in the iOS/Mac app (web OAuth is done).
- [ ] The Mac icon is the same dark rounded-square art as iOS; a Mac-shaped
  icon would be better but is cosmetic.

## Native Windows/Linux/Android (started 2026-08-30)
- [ ] Signed release APK + a keystore, then a Play listing.
- [ ] Posting from the native apps (photo upload + edit-token round trip); it
      currently deep-links to the web form.
- [ ] CI run 33364105059 was still building the MSI/DEB/APK when the session
      ended (cold runners, first Gradle download). Check it, and note the
      workflow only uploads Actions artifacts, which need a login to download.
      For public download links it needs a release step and a
      `homeward-native-v*` tag.

## TUI pilot (2026-09-05)
- `sighting-tui` SwiftPM target (SwiftTUI). `swift build && ./.build/debug/sighting-tui` lists active listings via plain URLSession against Supabase PostgREST (anon key, RLS-guarded, public by design — no Supabase SDK dependency pulled in for one read). Needs a real TTY.

## Ingested 2026-10-22
- Reference, not a task: two photos of real flyers on poles, filed as proof of the problem Sighting solves (/Users/joshua/Documents/Code/notes/attachments/2026-10-22/sighting-1.png, /Users/joshua/Documents/Code/notes/attachments/2026-10-22/sighting-2.png). (1) "Trusted Tails", a family-owned pet service in Delta, Surrey, Langley and White Rock: pet check-in, pet waste management, dog walking, trustedtails.ca. A candidate for a local pet-services listing. (2) A taped, rain-soaked "MISSING - Cali" flyer: 1 yr old spayed female calico, escaped July 17 from the north side of Portage Park at 201A St (Langley), microchipped, no collar, call or text number on the flyer. Decision: proof that paper flyers fail (rain-soaked, taped up, number half gone). No new feature from it. Owner's phone number left off on purpose, see the PNG.

## /mobbin gap matrix (2026-10-28)
Compared against PawBoost, Petco Love Lost, Finding Rover, Nextdoor, Tractive, Fi, Rover and Petco (App Store sheets).
Skipped: GPS collars, pet sitting, shopping.

| Gap | Who has it | Size | Status |
|---|---|---|---|
| House UI: capsule controls, photo-first cards, Lost/Found pill, light and dark | PawBoost, Petco Love Lost | S | done 2026-10-28 (web) |
| Call and Share right on each card | PawBoost | S | done 2026-10-28 (web) |
| Species filter chips (built from the species people actually post; sex skipped, most posts leave it blank) | PawBoost, Finding Rover | S | done 0.2.0 (web) |
| Sort by newest or last seen (distance waits on the map row) | PawBoost | S | done 0.2.0 (web) |
| Reunited tab (resolved listings, happy endings) | PawBoost | S | done 0.2.0 (web) |
| Map on the listing detail (static OSM tiles, old posts geocoded from their text) | PawBoost, Nextdoor | S | done 0.3.0 (web) |
| New posts save lat/lng (geocoded on post) | PawBoost | S | web done 0.3.0; jaybulb-api 7cff238 needs a deploy to store them |
| Map view of the board | PawBoost, Nextdoor | M | open |
| Step-by-step post flow with photo first | PawBoost, Petco Love Lost | M | open |
| Alerts for new lost pets near you | PawBoost, Petco Love Lost, Nextdoor | L | open |
| Printable poster from a listing | PawBoost | M | done 2026-10-28 (web) |
| Photos on old listings point at a dead storage URL; board now falls back to a paw | - | S | open |
| New name: Sighting, after Homeward and Maera | - | S | done 2026-10-28 |
