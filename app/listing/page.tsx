"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { spark, Listing } from "@/lib/spark";
import { geocode } from "@/lib/geo";
import MiniMap from "@/lib/MiniMap";

function ListingDetailInner() {
  const id = useSearchParams().get("id");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    spark
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data }) => {
        const l = data as Listing;
        setListing(l);
        // Older posts never saved coordinates, so look the place up from its text.
        setSpot(l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : await geocode(l.last_seen_location));
      });
    spark.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
  }, [id]);

  async function markFound() {
    if (!id) return;
    const { data } = await spark.rpc("resolve_listing", { p_id: id }).single();
    if (!data) return;
    setListing(data as Listing);
    spark.functions.invoke("notify-found", { body: { listingId: id } });
  }

  if (!listing) {
    return <div className="shell narrow">Loading...</div>;
  }

  return (
    <div className="shell narrow">
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Link href="/board">&larr; Back to the board</Link>
        <button onClick={() => window.print()}>Print poster</button>
      </div>

      {/* The printed page is a pole poster: big word, big photo, big phone number. */}
      <div className="poster" aria-hidden="true">
        <p className="poster-word">{listing.type === "lost" ? "Lost" : "Found"} {listing.species}</p>
        {listing.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo_url} alt="" />
        )}
        {!listing.photo_url && (
          <svg className="poster-paw" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="9" r="2.2" /><circle cx="10" cy="5.5" r="2.2" /><circle cx="14" cy="5.5" r="2.2" /><circle cx="18" cy="9" r="2.2" /><path d="M12 11c-3 0-6 4-6 6.5 0 1.6 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.9 3-2.5C18 15 15 11 12 11z" /></svg>
        )}
        <p className="poster-ask">Have you seen {listing.type === "lost" ? "me" : "my family"}?</p>
        <div>
        <p className="poster-name">{listing.pet_name || [listing.color, listing.species].filter(Boolean).join(" ")}</p>
        <p className="poster-line">{[listing.color, listing.sex].filter(Boolean).join(", ")}</p>
        <p className="poster-line">Last seen: {listing.last_seen_location}{listing.last_seen_at ? `, ${listing.last_seen_at}` : ""}</p>
        {listing.reward && <p className="poster-reward">Reward {listing.reward}</p>}
        </div>
        <div>
        {listing.contact_phone && <p className="poster-phone">{listing.contact_phone}</p>}
        <p className="poster-url">sighting.jaybulb.com/listing?id={listing.id}</p>
        </div>
      </div>
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, margin: "16px 0 8px" }}>
        {listing.type === "lost" ? "Lost" : "Found"}: {listing.pet_name || listing.species}
      </h1>
      {listing.status === "resolved" ? (
        <p style={{ color: "var(--found-bg)", fontWeight: 600 }}>Reunited</p>
      ) : (
        loggedIn && <button onClick={markFound} className="btn-solid">Mark reunited</button>
      )}
      {listing.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.photo_url} alt={listing.pet_name ?? listing.species} style={{ borderRadius: 28, width: "100%", height: "auto", marginTop: 16 }} />
      )}
      {spot && <MiniMap pins={[{ ...spot, label: listing.last_seen_location, kind: listing.type }]} href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=16/${spot.lat}/${spot.lng}`} />}
      <dl className="facts">
        <dt>Species</dt><dd>{listing.species}</dd>
        <dt>Color</dt><dd>{listing.color || "-"}</dd>
        <dt>Tag or chip</dt><dd>{listing.tag_number || "-"}</dd>
        <dt>Sex</dt><dd>{listing.sex || "-"}</dd>
        <dt>Reward</dt><dd>{listing.reward || "-"}</dd>
        <dt>Last seen</dt><dd>{listing.last_seen_location}{listing.last_seen_at ? ` (${listing.last_seen_at})` : ""}</dd>
        <dt>Notes</dt><dd>{listing.description || "-"}</dd>
        <dt>Contact</dt>
        <dd>
          {listing.contact_phone && <div><a href={`tel:${listing.contact_phone}`}>{listing.contact_phone}</a></div>}
          {listing.contact_email && <div><a href={`mailto:${listing.contact_email}`}>{listing.contact_email}</a></div>}
          {!listing.contact_phone && !listing.contact_email && "-"}
        </dd>
      </dl>
    </div>
  );
}

// useSearchParams needs a Suspense boundary to prerender at build time.
export default function ListingDetail() {
  return (
    <Suspense fallback={<div className="shell narrow">Loading...</div>}>
      <ListingDetailInner />
    </Suspense>
  );
}
