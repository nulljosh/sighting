"use client";

// WebMCP tool registration for sighting. Mounted once in app/layout.tsx.
//
// ponytail: page state here lives entirely in per-page useState hooks (no
// context/store), so tools go through the existing spark-api client in
// lib/spark.ts instead — the app's real data layer, not a duplicate of it.

import { useEffect } from "react";
import { spark, Listing } from "@/lib/spark";

type ToolHandle = { unregister?: () => void };

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        execute: (args: Record<string, unknown>) => Promise<unknown>;
      }) => ToolHandle;
    };
  }
}

export default function WebMCP() {
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const registerTool = document.modelContext.registerTool.bind(document.modelContext);

    const handles: (ToolHandle | undefined)[] = [];

    // ---- read-only ----

    handles.push(
      registerTool({
        name: "search_listings",
        description: "Search active lost/found pet listings, optionally filtered by status, species, or area.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["lost", "found"],
              description: "Filter to only lost or only found listings.",
            },
            species: {
              type: "string",
              description: "Filter by species (e.g. cat, dog). Case-insensitive partial match.",
            },
            area: {
              type: "string",
              description: "Filter by last-seen location. Case-insensitive partial match.",
            },
          },
        },
        execute: async (args) => {
          try {
            let query = spark.from("listings").select("*").eq("status", "active");
            if (args.type === "lost" || args.type === "found") {
              query = query.eq("type", args.type);
            }
            if (typeof args.species === "string" && args.species) {
              query = query.ilike("species", `%${args.species}%`);
            }
            if (typeof args.area === "string" && args.area) {
              query = query.ilike("last_seen_location", `%${args.area}%`);
            }
            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) return { error: error.message };
            return { listings: (data as Listing[]) ?? [] };
          } catch (e) {
            return { error: e instanceof Error ? e.message : "search failed" };
          }
        },
      })
    );

    handles.push(
      registerTool({
        name: "get_listing",
        description: "Get a single listing by its id.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The listing's id." },
          },
          required: ["id"],
        },
        execute: async (args) => {
          try {
            const { data, error } = await spark
              .from("listings")
              .select("*")
              .eq("id", args.id)
              .single();
            if (error) return { error: error.message };
            return { listing: data as Listing };
          } catch (e) {
            return { error: e instanceof Error ? e.message : "lookup failed" };
          }
        },
      })
    );

    handles.push(
      registerTool({
        name: "whoami",
        description: "Get the currently signed-in user, or report signed out.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          try {
            const { data, error } = await spark.auth.getSession();
            if (error) return { error: error.message };
            if (!data.session) return { signedIn: false };
            return { signedIn: true, email: data.session.user.email, id: data.session.user.id };
          } catch (e) {
            return { error: e instanceof Error ? e.message : "whoami failed" };
          }
        },
      })
    );

    // ---- reversible writes ----

    handles.push(
      registerTool({
        name: "post_listing",
        description:
          "Post a new lost or found pet listing. Text-only — does not upload a photo. Returns the listing's private edit link, needed later to mark it resolved.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["lost", "found"], description: "Whether the pet was lost or found." },
            pet_name: { type: "string", description: "The pet's name, if known." },
            species: { type: "string", description: "Species, e.g. cat, dog." },
            color: { type: "string", description: "Color / short description." },
            description: { type: "string", description: "Notes: temperament, identifying marks, etc." },
            tag_number: { type: "string", description: "Ear tattoo / tag / chip number." },
            last_seen_location: { type: "string", description: "Where the pet was last seen." },
            contact_phone: { type: "string", description: "Contact phone number." },
            contact_email: { type: "string", description: "Contact email address." },
            reward: { type: "string", description: "Reward offered, e.g. \"$1000\"." },
            sex: { type: "string", enum: ["male", "female"], description: "Sex, if known." },
            last_seen_at: { type: "string", description: "Date last seen, YYYY-MM-DD." },
          },
          required: ["type", "species", "last_seen_location"],
        },
        execute: async (args) => {
          try {
            const { data, error } = await spark
              .rpc("create_listing", {
                type: args.type,
                pet_name: args.pet_name ?? null,
                species: args.species,
                color: args.color ?? null,
                description: args.description ?? null,
                tag_number: args.tag_number ?? null,
                last_seen_location: args.last_seen_location,
                contact_phone: args.contact_phone ?? null,
                contact_email: args.contact_email ?? null,
                reward: args.reward ?? null,
                sex: args.sex ?? null,
                last_seen_at: args.last_seen_at ?? null,
                photo_url: null,
              })
              .single();
            if (error) return { error: error.message };
            return {
              listing: data as Listing,
              edit_url: `${window.location.origin}/listing/edit?token=${(data as Listing).edit_token}`,
            };
          } catch (e) {
            return { error: e instanceof Error ? e.message : "post failed" };
          }
        },
      })
    );

    // ---- requires human confirmation ----

    handles.push(
      registerTool({
        name: "mark_listing_resolved",
        description:
          "Mark a listing as resolved, retiring it from the active board. This is a real change to someone's lost-pet post and cannot be undone through this tool — requires the listing's private edit token.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The listing's id." },
            token: { type: "string", description: "The listing's private edit token." },
          },
          required: ["id", "token"],
          requiresConfirmation: true,
        },
        execute: async (args) => {
          try {
            const { error } = await spark.rpc("update_listing", {
              p_id: args.id,
              p_token: args.token,
              p_status: "resolved",
            });
            if (error) return { error: error.message };
            return { resolved: true };
          } catch (e) {
            return { error: e instanceof Error ? e.message : "resolve failed" };
          }
        },
      })
    );

    return () => {
      for (const h of handles) {
        try {
          h?.unregister?.();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return null;
}
