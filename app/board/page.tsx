"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { spark, Listing } from "@/lib/spark";
import AuthBar from "@/lib/AuthBar";
import MiniMap from "@/lib/MiniMap";
import { geocodeAll } from "@/lib/geo";

// Shown when a listing has no photo, or its photo fails to load.
const PAW = '<svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="9" r="2.2"/><circle cx="10" cy="5.5" r="2.2"/><circle cx="14" cy="5.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M12 11c-3 0-6 4-6 6.5 0 1.6 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.9 3-2.5C18 15 15 11 12 11z"/></svg>';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<"all" | "lost" | "found" | "reunited">("all");
  const [species, setSpecies] = useState("");
  const [sort, setSort] = useState<"new" | "seen">("new");
  const [showMap, setShowMap] = useState(false);
  const [spots, setSpots] = useState<Record<string, { lat: number; lng: number }>>({});
  const [query, setQuery] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    spark
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setListings((data as Listing[]) ?? []));
    spark.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = spark.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showMap) return;
    const places = [...new Set(listings.filter((l) => l.lat == null).map((l) => l.last_seen_location))];
    geocodeAll(places, (place, spot) => setSpots((s) => ({ ...s, [place]: spot })));
  }, [showMap, listings]);

  async function markFound(id: string) {
    const { data } = await spark.rpc("resolve_listing", { p_id: id }).single();
    if (!data) return;
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "resolved" } : l)));
    spark.functions.invoke("notify-found", { body: { listingId: id } });
  }

  async function share(l: Listing) {
    const url = `https://sighting.jaybulb.com/listing?id=${l.id}`;
    const title = `${l.type === "lost" ? "Lost" : "Found"}: ${l.pet_name || l.species}`;
    if (navigator.share) await navigator.share({ title, url }).catch(() => {});
    else await navigator.clipboard?.writeText(url).catch(() => {});
  }

  const kind = (l: Listing) => l.species.trim().toLowerCase();
  const kinds = [...new Set(listings.map(kind).filter(Boolean))].sort();
  const seen = (l: Listing) => Date.parse(l.last_seen_at ?? l.created_at) || 0;

  const filtered = listings.filter((l) => {
    if ((tab === "reunited") !== (l.status === "resolved")) return false;
    if ((tab === "lost" || tab === "found") && l.type !== tab) return false;
    if (species && kind(l) !== species) return false;
    if (!query) return true;
    const haystack = `${l.pet_name ?? ""} ${l.species} ${l.color ?? ""} ${l.last_seen_location}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  if (sort === "seen") filtered.sort((a, b) => seen(b) - seen(a));
  const pins = filtered.flatMap((l) => {
    const spot = l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : spots[l.last_seen_location];
    return spot ? [{ ...spot, href: `/listing?id=${l.id}`, label: `${l.pet_name || l.species}, ${l.last_seen_location}`, kind: l.status === "resolved" ? "reunited" : l.type }] : [];
  });
  // ponytail: one bad lookup would zoom the map out to the whole planet, so keep pins within
  // a couple hundred km of the median one. Fine for a local board; a city picker replaces it.
  const mid = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
  const mlat = mid(pins.map((p) => p.lat)), mlng = mid(pins.map((p) => p.lng));
  const near = pins.filter((p) => Math.abs(p.lat - mlat) < 2 && Math.abs(p.lng - mlng) < 3);

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
        {(["all", "lost", "found", "reunited"] as const).map((f) => (
          <button key={f} onClick={() => setTab(f)} aria-pressed={tab === f}>
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

      <div className="chips">
        {kinds.length > 1 && ["", ...kinds].map((k) => (
          <button key={k || "any"} onClick={() => setSpecies(k)} aria-pressed={species === k}>
            {k ? k[0].toUpperCase() + k.slice(1) : "Any pet"}
          </button>
        ))}
        <button onClick={() => setShowMap(!showMap)} aria-pressed={showMap} style={{ marginLeft: "auto" }}>Map</button>
        <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "seen")} aria-label="Sort listings">
          <option value="new">Newest posts</option>
          <option value="seen">Last seen</option>
        </select>
      </div>

      {showMap && (near.length ? <MiniMap pins={near} /> : <p className="empty">Finding places on the map...</p>)}

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
            {l.status === "resolved" ? <span className="tag reunited">reunited</span> : <span className={`tag ${l.type}`}>{l.type}</span>}
            <div className="actions">
              {l.status === "active" && l.contact_phone && <a href={`tel:${l.contact_phone}`}>Call</a>}
              <button onClick={() => share(l)}>Share</button>
              {loggedIn && l.status === "active" && <button onClick={() => markFound(l.id)}>Mark reunited</button>}
            </div>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty">{tab === "reunited" ? "No reunions yet." : query || species ? "Nothing matches." : "No listings yet."}</li>}
      </ul>
    </div>
  );
}
