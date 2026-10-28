"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { spark, Listing } from "@/lib/spark";

function ListingDetailInner() {
  const id = useSearchParams().get("id");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!id) return;
    spark
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setListing(data as Listing));
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
      <Link href="/board">&larr; Back to the board</Link>
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, margin: "16px 0 8px" }}>
        {listing.type === "lost" ? "Lost" : "Found"}: {listing.pet_name || listing.species}
      </h1>
      {listing.status === "resolved" ? (
        <p style={{ color: "var(--found-bg)", fontWeight: 600 }}>Resolved</p>
      ) : (
        loggedIn && <button onClick={markFound} className="btn-solid">Mark found</button>
      )}
      {listing.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.photo_url} alt={listing.pet_name ?? listing.species} style={{ borderRadius: 28, width: "100%", height: "auto", marginTop: 16 }} />
      )}
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
