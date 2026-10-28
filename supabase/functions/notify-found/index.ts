// Emails the listing owner when someone marks their pet found.
// Called by the client right after resolve_listing() succeeds (see app/board/page.tsx).
// ponytail: plain fetch against Resend's REST endpoint, same as sparkjar's mail.js —
// no SDK, one POST.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { listingId } = await req.json();
  if (!listingId) return new Response("missing listingId", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: listing } = await supabase
    .from("listings_data")
    .select("pet_name, species, contact_email")
    .eq("id", listingId)
    .single();

  if (!listing?.contact_email) return new Response("ok", { status: 200 });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return new Response("no RESEND_API_KEY", { status: 200 });

  const name = listing.pet_name || listing.species;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Sighting <noreply@sighting.jaybulb.com>",
      to: listing.contact_email,
      subject: `${name} was marked found`,
      text: `Good news — someone marked your listing for ${name} as found on Sighting.`,
    }),
  });

  return new Response("ok", { status: 200 });
});
