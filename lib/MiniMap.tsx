// Static map from OpenStreetMap tiles: plain images, so no iframe, no WebGL, no map library.
// Zoom is the closest that fits every pin in a ~280x200 box (a phone-width card); a 5x3 tile grid around the
// centre covers any card up to 1024px wide.
const T = 256;

export type Pin = { lat: number; lng: number; href?: string; label: string; kind?: string };

function project(lat: number, lng: number, z: number) {
  const n = 2 ** z * T, r = (lat * Math.PI) / 180;
  return [((lng + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
}

function fit(pins: Pin[]) {
  for (let z = 15; z > 3; z--) {
    const p = pins.map((q) => project(q.lat, q.lng, z));
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    if (Math.max(...xs) - Math.min(...xs) <= 280 && Math.max(...ys) - Math.min(...ys) <= 200) return z;
  }
  return 3;
}

export default function MiniMap({ pins, href }: { pins: Pin[]; href?: string }) {
  const z = fit(pins);
  const pts = pins.map((p) => project(p.lat, p.lng, z));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const gx = (Math.floor(cx / T) - 2) * T, gy = (Math.floor(cy / T) - 1) * T;
  const tiles = [];
  for (let ty = gy / T; ty < gy / T + 3; ty++)
    for (let tx = gx / T; tx < gx / T + 5; tx++)
      tiles.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${tx},${ty}`} src={`https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`} alt="" width={T} height={T}
          style={{ left: tx * T - gx, top: ty * T - gy }} />,
      );
  const grid = (
    <div className="grid" style={{ left: `calc(50% - ${cx - gx}px)`, top: `calc(50% - ${cy - gy}px)` }}>
      {tiles}
      {pins.map((p, i) => {
        const style = { left: pts[i][0] - gx, top: pts[i][1] - gy };
        const cls = `pin ${p.kind ?? ""}`;
        return p.href
          ? <a key={i} className={cls} style={style} href={p.href} title={p.label} aria-label={p.label} />
          : <span key={i} className={cls} style={style} />;
      })}
    </div>
  );
  const credit = <span className="credit">© OpenStreetMap</span>;
  // One pin: the whole map opens OpenStreetMap. Several: each pin is its own link.
  return href ? (
    <a className="minimap no-print" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Map of ${pins[0].label}, opens OpenStreetMap`}>{grid}{credit}</a>
  ) : (
    <div className="minimap tall no-print">{grid}{credit}</div>
  );
}
