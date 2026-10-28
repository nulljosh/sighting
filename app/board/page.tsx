"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { spark, Listing } from "@/lib/spark";
import AuthBar from "@/lib/AuthBar";

// Shown when a listing has no photo, or its photo fails to load.
const PAW = '<svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="9" r="2.2"/><circle cx="10" cy="5.5" r="2.2"/><circle cx="14" cy="5.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M12 11c-3 0-6 4-6 6.5 0 1.6 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.9 3-2.5C18 15 15 11 12 11z"/></svg>';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");
  const [query, setQuery] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    spark
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setListings((data as Listing[]) ?? []));
    spark.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = spark.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function markFound(id: string) {
    const { data } = await spark.rpc("resolve_listing", { p_id: id }).single();
    if (!data) return;
    setListings((prev) => prev.filter((l) => l.id !== id));
    spark.functions.invoke("notify-found", { body: { listingId: id } });
  }

  async function share(l: Listing) {
    const url = `${location.origin}/listing?id=${l.id}`;
    const title = `${l.type === "lost" ? "Lost" : "Found"}: ${l.pet_name || l.species}`;
    if (navigator.share) await navigator.share({ title, url }).catch(() => {});
    else await navigator.clipboard?.writeText(url).catch(() => {});
  }

  const filtered = listings.filter((l) => {
    if (filter !== "all" && l.type !== filter) return false;
    if (!query) return true;
    const haystack = `${l.pet_name ?? ""} ${l.species} ${l.color ?? ""} ${l.last_seen_location}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="shell">
      <header className="nav">
        <Link href="/" className="brand"><img src="/icon.svg" alt="" width={32} height={32} />Sighting</Link>
        <div className="end">
          <AuthBar />
          <Link href="/post" className="btn-solid" style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 24px", borderRadius: 999, fontWeight: 600, color: "var(--btn-ink)" }}>Post a pet</Link>
        </div>
      </header>

      <div className="chips">
        {(["all", "lost", "found"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, species, place"
          aria-label="Search listings"
        />
      </div>

      <ul className="cards">
        {filtered.map((l) => (
          <li key={l.id} className="pet">
            <Link href={`/listing?id=${l.id}`}>
              {l.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ph" src={l.photo_url} alt={l.pet_name ?? l.species} loading="lazy" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("div"), { className: "ph", innerHTML: PAW })); }} />
              ) : (
                <div className="ph" dangerouslySetInnerHTML={{ __html: PAW }} />
              )}
              <div className="body">
                <span className="name">{l.pet_name || l.species}</span>
                <span className="sub">{[l.species, l.color].filter(Boolean).join(", ")}</span>
                <span className="sub">{l.last_seen_location}</span>
              </div>
            </Link>
            <span className={`tag ${l.type}`}>{l.type}</span>
            <div className="actions">
              {l.contact_phone && <a href={`tel:${l.contact_phone}`}>Call</a>}
              <button onClick={() => share(l)}>Share</button>
              {loggedIn && <button onClick={() => markFound(l.id)}>Mark found</button>}
            </div>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty">No listings yet.</li>}
      </ul>
    </div>
  );
}
