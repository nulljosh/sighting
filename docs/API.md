# Sighting API

Sighting has no HTTP API of its own. It's a static export (`output: "export"` in `next.config.ts`) — every page is `"use client"` and there are no route handlers. All reads and writes go directly from the browser to Supabase, using the client in `lib/supabase.ts`:

- table `listings`
- storage bucket `pet-photos`
- RPC `update_listing` (used to mark a listing resolved)

## WebMCP

`lib/webmcp.tsx` mounts a `<WebMCP />` component once, in `app/layout.tsx`, registering tools via `document.modelContext.registerTool` for MCP-aware browsers/agents. Tools call the same Supabase client the app's pages use — there's no separate tool backend and no duplicated queries.

Auth actions (log in, register, password reset, sign out) are deliberately **not** exposed as tools — credentials must not pass through a tool call.

### Read-only

| Tool | Description |
|---|---|
| `search_listings` | Search active listings, optionally filtered by `type` (lost/found), `species`, or `area` (last-seen location). |
| `get_listing` | Get a single listing by `id`. |
| `whoami` | Get the current Supabase auth user, or report signed out. |

### Reversible writes

| Tool | Description |
|---|---|
| `post_listing` | Post a new lost/found listing (text fields only — no photo upload). Returns the listing plus its private edit link. |

### Requires human confirmation

| Tool | Description |
|---|---|
| `mark_listing_resolved` | Marks a listing resolved given its `id` and edit `token`, retiring it from the active board. `requiresConfirmation: true` — this is a real, hard-to-undo change to someone's lost-pet post. |
