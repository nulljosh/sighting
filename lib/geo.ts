// ponytail: free OpenStreetMap geocoder, one lookup per post or listing view. Their policy
// allows light use; move to a keyed geocoder if traffic grows.
async function lookup(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
    const [hit] = await r.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

// People write places loosely ("North side of Portage Park, Langley BC (street not given)").
// Drop the bracketed asides, then try the whole thing and each broader tail: "Langley BC".
export async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const parts = q.replace(/\(.*?\)/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.join(" ").split(/\s+/).length < 2) return null; // "unknown" is not a place
  for (let i = 0; i < parts.length; i++) {
    if (i) await new Promise((r) => setTimeout(r, 1100)); // Nominatim allows one request a second
    const hit = await lookup(parts.slice(i).join(", "));
    if (hit) return hit;
  }
  return null;
}

// Board map: look up places with no saved coordinates, one per second (Nominatim's limit),
// remembered on this device so each place is fetched once.
const KEY = "sighting:geo2";
export async function geocodeAll(places: string[], onHit: (place: string, spot: { lat: number; lng: number }) => void) {
  let cache: Record<string, { lat: number; lng: number } | null> = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
  for (const place of places) {
    if (!(place in cache)) {
      cache[place] = await geocode(place);
      try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
      await new Promise((r) => setTimeout(r, 1100));
    }
    const spot = cache[place];
    if (spot) onHit(place, spot);
  }
}
