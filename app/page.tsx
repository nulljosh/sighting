"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { spark, Listing } from "@/lib/spark";
import AuthBar from "@/lib/AuthBar";
import "./landing.css";

// The house layout Hermes set (cyllene/landing): sticky nav, giant headline over the live board, a full-bleed
// band of cells, the board itself, platforms, and a footer band of Sighting's own things cut like an engraving.

// One card per real listing, the way the board shows it: photo, lost or found, name, where. Cards swap to the next
// listing every few seconds; with fewer listings than cards, the wall shrinks so nothing shows twice.
type Card = { type: string; what: string; where: string; photo: string | null; when: string };

// Shown only until the board answers, or if it is empty: the real neighbourhood cases the board was seeded with.
const FALLBACK: Card[] = [
  { type: "lost", what: "Oakley, siamese", where: "203 St & 54A Ave, Langley", photo: null, when: "" },
  { type: "lost", what: "Cali, calico", where: "Portage Park, Langley", photo: null, when: "" },
  { type: "lost", what: "grey cat", where: "Langley", photo: null, when: "" },
];

const ago = (iso: string) => {
  const h = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

function card(l: Listing): Card {
  const what = l.pet_name ? `${l.pet_name}, ${l.species}` : [l.color, l.species].filter(Boolean).join(" ");
  return { type: l.status === "resolved" ? "home" : l.type, what, where: l.last_seen_location, photo: l.photo_url, when: ago(l.created_at) };
}

const PAW = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="9" r="2.2"/><circle cx="10" cy="5.5" r="2.2"/><circle cx="14" cy="5.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M12 11c-3 0-6 4-6 6.5 0 1.6 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.9 3-2.5C18 15 15 11 12 11z"/></svg>';

// The demo behind the hero: the board itself, blended under the copy. Strangers' text, so textContent only.
function HeroWall({ cards }: { cards: Card[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wall = ref.current;
    if (!wall || !cards.length) return;
    wall.replaceChildren();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const want = innerWidth <= 560 ? 4 : innerWidth <= 900 ? 6 : 8;
    const n = Math.min(want, cards.length);
    const timers: number[] = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement("article");
      el.className = "hc";
      wall.appendChild(el);
      let k = i;
      const fill = () => {
        const c = cards[k % cards.length];
        k += n;
        el.replaceChildren();
        if (c.photo) {
          const img = document.createElement("img");
          img.src = c.photo; img.alt = ""; img.decoding = "async";
          img.onerror = () => { const d = document.createElement("div"); d.className = "hc-ph"; d.innerHTML = PAW; img.replaceWith(d); };
          el.appendChild(img);
        } else { const d = document.createElement("div"); d.className = "hc-ph"; d.innerHTML = PAW; el.appendChild(d); }
        const meta = document.createElement("div"); meta.className = "hc-m";
        const tag = document.createElement("i"); tag.className = c.type; tag.textContent = c.type;
        const name = document.createElement("b"); name.textContent = c.what;
        const where = document.createElement("span"); where.textContent = [c.where, c.when].filter(Boolean).join(" · ");
        meta.append(tag, name, where); el.appendChild(meta);
      };
      fill();
      if (!still && cards.length > n) {
        const swap = () => { el.classList.add("out"); timers.push(window.setTimeout(() => { fill(); el.classList.remove("out"); }, 400)); };
        timers.push(window.setInterval(swap, 5200 + i * 700));
      }
    }
    return () => timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  }, [cards]);

  return <div className="hero-wall" ref={ref} aria-hidden="true" />;
}

const CELLS: [string, string, string][] = [
  ["Post", "No account needed", "Post in under a minute when every minute counts. Nothing to sign up for."],
  ["Edit link", "Only you can close it", "You get a private link nobody else has. Change the listing or mark them home from it."],
  ["Search", "A board, not a feed", "Filter lost from found, search by name, species, colour, tag or chip. Nothing scrolls away."],
  ["Map", "Where they were seen", "Every sighting is a pin, so a neighbour two streets over sees it first."],
  ["Poster", "Print it for the pole", "Each listing prints as a poster: the photo, your phone number and the link back to the page."],
  ["Reunited", "Home is the point", "Closed listings move to Reunited, so the board shows what is still out there."],
];

export default function Landing() {
  const [recent, setRecent] = useState<Listing[]>([]);
  const [cards, setCards] = useState<Card[]>(FALLBACK);

  useEffect(() => {
    spark
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        const rows = (data as Listing[]) ?? [];
        // Test rows stay on the board for QA, never on the landing.
        const real = rows.filter((l) => !/\btest\b/i.test(`${l.pet_name ?? ""} ${l.last_seen_location}`));
        setRecent(real.filter((l) => l.status === "active").slice(0, 5));
        // one card per pet (the board can hold two posts for the same one), photos first
        const seen = new Set<string>();
        const uniq = real.map(card).filter((c) => !seen.has(c.what.toLowerCase()) && seen.add(c.what.toLowerCase()));
        if (uniq.length) setCards(uniq.sort((a, b) => Number(!!b.photo) - Number(!!a.photo)));
      });
  }, []);

  // Parallax: the board drifts at 0.45, the copy lifts at 0.2 and fades. Off under reduced motion.
  useEffect(() => {
    const bg = document.querySelector<HTMLElement>(".lp .hero-bg"), copy = document.querySelector<HTMLElement>(".lp .hero-copy");
    if (!bg || !copy || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const on = () => {
      if (t) return;
      t = requestAnimationFrame(() => {
        t = 0;
        const y = scrollY, h = innerHeight;
        if (y > h * 1.2) return;
        bg.style.setProperty("--py", `${y * 0.45}px`);
        copy.style.transform = `translate3d(0, ${y * 0.2}px, 0)`;
        copy.style.opacity = String(Math.max(0, 1 - y / (h * 0.7)));
      });
    };
    addEventListener("scroll", on, { passive: true });
    return () => { removeEventListener("scroll", on); cancelAnimationFrame(t); };
  }, []);

  // Fade sections up as they scroll in; everything is visible without JS or with reduced motion.
  useEffect(() => {
    const items = [...document.querySelectorAll(".lp .reveal")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((e) => e.classList.add("in"));
      return;
    }
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [recent.length]);

  return (
    <div className="lp" id="top">
      <header className="nav" aria-label="Site">
        <nav className="nav-links" aria-label="Main">
          <Link href="/board">Board</Link>
          <a href="#how">How it works</a>
          <a href="#get">Apps</a>
        </nav>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a className="nav-brand" href="#top" aria-label="Sighting home"><img src="/icon.svg" alt="" width={28} height={28} /><span>Sighting</span></a>
        <div className="nav-end">
          <span className="nav-auth"><AuthBar /></span>
          <Link className="btn btn-solid" href="/post">Post</Link>
        </div>
      </header>

      <main>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true"><HeroWall cards={cards} /></div>
        <div className="wrap center hero-copy">
          <p className="label">Lost and found pets</p>
          <h1>Bring them home.</h1>
          <p className="lead">
            A plain public board for lost and found pets. Post in under a minute with no account, and keep a
            private link to close the listing the moment they turn up.
          </p>
          <div className="cta">
            <Link className="btn btn-solid" href="/post">Post a lost or found pet</Link>
            <Link className="btn btn-ghost" href="/board">Browse the board</Link>
          </div>
          <p className="fine">No account. No ads. Free.</p>
        </div>
      </section>

      <section className="band" id="how">
        <div className="band-copy reveal">
          <p className="label">How it works</p>
          <h2>A lost pet doesn&apos;t have time for a signup form</h2>
          <p>Everything on the board is public on purpose, so neighbours, shelters and vets can find it, and so can a search engine.</p>
        </div>
        <div className="cells">
          {CELLS.map(([label, title, body]) => (
            <article className="cell reveal" key={label}><p className="label">{label}</p><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="sec">
          <div className="wrap center reveal">
            <p className="label">Live</p>
            <h2>On the board right now</h2>
          </div>
          <ul className="recent reveal">
            {recent.map((l) => (
              <li key={l.id}>
                <Link href={`/listing?id=${l.id}`}>
                  <span className={`tag ${l.type}`}>{l.type}</span>
                  <b>{l.pet_name || l.species}</b>
                  <span className="meta">{l.species}{l.color ? `, ${l.color}` : ""}</span>
                  <span className="where">{l.last_seen_location}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="center more reveal"><Link href="/board">See the whole board</Link></p>
        </section>
      )}

      <section className="sec plats" id="get">
        <div className="wrap center reveal">
          <p className="label">Everywhere a neighbour is</p>
          <h2>Web, iPhone, Mac, Android</h2>
        </div>
        <div className="prods wrap">
          <div className="prod reveal"><p className="label">Web</p><h3>Nothing to install</h3><p>The whole board works in any modern browser.</p><Link href="/board">Open the board</Link></div>
          <div className="prod reveal"><p className="label">iPhone and Mac</p><h3>Native apps</h3><p>Built from the same sources, with a two pane window on the Mac. Not on the App Store yet.</p></div>
          <div className="prod reveal"><p className="label">Android, Windows, Linux</p><h3>A real app</h3><p>One Kotlin codebase built into an APK, an MSI and a DEB.</p><a href="https://github.com/nulljosh/sighting/releases/latest" target="_blank" rel="noopener">Download from GitHub</a></div>
        </div>
      </section>

      </main>

      <footer className="foot">
        <div className="foot-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="foot-brand"><img src="/icon.svg" alt="" width={40} height={40} /><b>Sighting</b><p>Bring them home.</p></div>
          <nav className="foot-cols" aria-label="Footer">
            <div><p className="label">Sighting</p><Link href="/board">Board</Link><Link href="/post">Post a pet</Link><a href="#how">How it works</a></div>
            <div><p className="label">Source</p><a href="https://github.com/nulljosh/sighting">GitHub</a><a href="https://github.com/nulljosh/sighting/releases">Releases</a></div>
            <div><p className="label">More</p><a href="mailto:trommatic@icloud.com?subject=Sighting">Feedback</a><a href="/privacy.html">Privacy</a><a href="https://jaybulb.com">More apps</a><a href="#top">Back to top</a></div>
          </nav>
        </div>
        <div className="word-band" aria-hidden="true"><canvas className="word-canvas" /></div>
        <p className="legal">&copy; 2026 Joshua Trommel &middot; MIT License</p>
      </footer>
      <Script src="/footer-band.js" strategy="afterInteractive" />
    </div>
  );
}
