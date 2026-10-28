// Static map from OpenStreetMap tiles: plain images, so no iframe, no WebGL, no map library.
// A 5x3 tile grid around the pin's tile covers any card up to 1024px wide.
const Z = 15, T = 256;

export default function MiniMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const n = 2 ** Z, r = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(x), ty = Math.floor(y);
  const px = (x - tx + 2) * T, py = (y - ty + 1) * T; // pin inside the grid
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -2; dx <= 2; dx++)
      tiles.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${dx},${dy}`} src={`https://tile.openstreetmap.org/${Z}/${tx + dx}/${ty + dy}.png`} alt="" width={T} height={T}
          style={{ left: (dx + 2) * T, top: (dy + 1) * T }} />,
      );
  return (
    <a className="minimap no-print" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
      target="_blank" rel="noopener noreferrer" aria-label={`Map of ${label}, opens OpenStreetMap`}>
      <div className="grid" style={{ left: `calc(50% - ${px}px)`, top: `calc(50% - ${py}px)` }}>{tiles}</div>
      <span className="pin" />
      <span className="credit">© OpenStreetMap</span>
    </a>
  );
}
