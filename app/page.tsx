"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { spark, Listing } from "@/lib/spark";
import AuthBar from "@/lib/AuthBar";
import "./landing.css";

// The house layout Hermes set (cyllene/landing): sticky nav, giant headline over the live board, a full-bleed
// band of cells, the board itself, platforms, and a footer band of Sighting's own things cut like an engraving.

type Notice = [string, string, string];

// Shown only until the board answers, or if it is empty. The first three are the real neighbourhood cases
// the board was seeded with.
const FALLBACK: Notice[] = [
  ["lost", "Oakley, siamese", "203 St & 54A Ave, Langley"],
  ["lost", "Cali, calico", "Portage Park, Langley"],
  ["lost", "grey cat", "Langley"],
];

function notice(l: Listing): Notice {
  const what = l.pet_name ? `${l.pet_name}, ${l.species}` : [l.color, l.species].filter(Boolean).join(" ");
  return [l.status === "resolved" ? "home" : l.type, what, l.last_seen_location];
}

// The demo behind the hero: the board's own notices drifting up and down, faded under the copy.
function HeroWall({ notices }: { notices: Notice[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wall = ref.current;
    if (!wall || !notices.length) return;
    wall.replaceChildren();
    const cols = Math.max(3, Math.min(7, Math.ceil(window.innerWidth / 220)));
    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = `wall-col ${c % 2 ? "down" : "up"}`;
      col.style.setProperty("--dur", `${70 + c * 11}s`);
      const slice: Notice[] = [];
      for (let i = 0; i < 8; i++) slice.push(notices[(c * 5 + i * 3) % notices.length]);
      for (const [type, what, where] of [...slice, ...slice]) { // doubled, so the loop is seamless
        const el = document.createElement("span");
        const tag = document.createElement("i");
        tag.className = type;
        tag.textContent = type;
        const name = document.createElement("b");
        name.textContent = what;
        const place = document.createElement("em");
        place.textContent = where;
        el.append(tag, name, place);
        col.appendChild(el);
      }
      wall.appendChild(col);
    }
  }, [notices]);

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
  const [notices, setNotices] = useState<Notice[]>(FALLBACK);

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
        if (real.length) setNotices(real.map(notice));
      });
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

      <section className="hero">
        <HeroWall notices={notices} />
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

      <footer className="foot">
        <div className="foot-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="foot-brand"><img src="/icon.svg" alt="" width={40} height={40} /><b>Sighting</b><p>Bring them home.</p></div>
          <nav className="foot-cols" aria-label="Footer">
            <div><p className="label">Sighting</p><Link href="/board">Board</Link><Link href="/post">Post a pet</Link><a href="#how">How it works</a></div>
            <div><p className="label">Source</p><a href="https://github.com/nulljosh/sighting">GitHub</a><a href="https://github.com/nulljosh/sighting/releases">Releases</a></div>
            <div><p className="label">More</p><a href="mailto:trommatic@icloud.com?subject=Sighting">Feedback</a><a href="https://jaybulb.com">More apps</a><a href="#top">Back to top</a></div>
          </nav>
        </div>
        <div className="word-band" aria-hidden="true"><canvas className="word-canvas" /></div>
        <p className="legal">&copy; 2026 Joshua Trommel &middot; MIT License</p>
      </footer>
      <Script src="/footer-band.js" strategy="afterInteractive" />
    </div>
  );
}
