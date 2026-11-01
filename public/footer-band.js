// Footer band: Sighting's things in a row (paw, collar tag, lost poster, magnifier, map pin, bone, the house they come
// home to), cut like a line engraving in plain 2D canvas. Faint rules run across the band; inside the glyphs they
// thicken, and thicken again on the edge facing away from the light, so the glyphs look cut into the page.
// The renderer is Cyllene's (cyllene/landing/footer-band.js); the glyphs are Sighting's own. Drawn once per size and theme.
(function () {
  var band = document.querySelector('.word-band'), canvas = band && band.querySelector('canvas');
  if (!canvas) return;

  // Each glyph is drawn white on a 100 unit square.
  function pad(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); }
  var GLYPHS = [
    function (c) { // paw
      pad(c, 22, 44, 9, 12); pad(c, 40, 26, 9, 13); pad(c, 60, 26, 9, 13); pad(c, 78, 44, 9, 12);
      c.beginPath(); c.moveTo(50, 48); c.bezierCurveTo(28, 48, 20, 76, 30, 84); c.bezierCurveTo(38, 90, 44, 84, 50, 84);
      c.bezierCurveTo(56, 84, 62, 90, 70, 84); c.bezierCurveTo(80, 76, 72, 48, 50, 48); c.fill();
    },
    function (c) { // collar tag: a ring and a bone shaped tag with a hole
      c.lineWidth = 6; c.beginPath(); c.arc(50, 22, 9, 0, 7); c.stroke();
      c.beginPath(); c.roundRect(26, 34, 48, 56, 22); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(50, 44, 4, 0, 7); c.fill();
      c.fillRect(36, 60, 28, 5); c.fillRect(40, 70, 20, 5); c.globalCompositeOperation = 'source-over';
    },
    function (c) { // lost poster pinned up
      c.save(); c.translate(50, 52); c.rotate(-0.05);
      c.fillRect(-30, -36, 60, 76);
      c.globalCompositeOperation = 'destination-out';
      c.fillRect(-20, -26, 40, 8); c.beginPath(); c.arc(0, 4, 13, 0, 7); c.fill(); c.fillRect(-20, 24, 40, 5);
      c.globalCompositeOperation = 'source-over'; c.restore();
      c.beginPath(); c.arc(50, 14, 6, 0, 7); c.fill();
    },
    function (c) { // magnifier
      c.lineWidth = 9; c.beginPath(); c.arc(42, 42, 22, 0, 7); c.stroke();
      c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(59, 59); c.lineTo(82, 82); c.stroke();
    },
    function (c) { // map pin
      c.beginPath(); c.moveTo(50, 92); c.bezierCurveTo(30, 66, 22, 54, 22, 40); c.arc(50, 40, 28, Math.PI, 0); c.bezierCurveTo(78, 54, 70, 66, 50, 92); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(50, 40, 11, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
    },
    function (c) { // bone
      c.save(); c.translate(50, 52); c.rotate(-0.5);
      c.fillRect(-26, -8, 52, 16);
      [[-30, -9], [-30, 9], [30, -9], [30, 9]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 11, 0, 7); c.fill(); });
      c.restore();
    },
    function (c) { // home
      c.beginPath(); c.moveTo(50, 12); c.lineTo(90, 48); c.lineTo(80, 48); c.lineTo(80, 88); c.lineTo(20, 88); c.lineTo(20, 48); c.lineTo(10, 48); c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.roundRect(41, 62, 18, 26, [9, 9, 0, 0]); c.fill(); c.globalCompositeOperation = 'source-over';
    }
  ];
  // Lays the glyphs out evenly across a w by h 2D context, in the given colour: one row, or two on a narrow band.
  function grid(w, h) {
    var n = GLYPHS.length, rows = w < h * 3 ? 2 : 1, per = Math.ceil(n / rows);
    return { rows: rows, per: per, cell: Math.min(h / rows * 0.86, w / per) };
  }
  function paint(c, w, h, colour) {
    var g = grid(w, h), gap = (w - g.cell * g.per) / g.per, rowH = h / g.rows;
    GLYPHS.forEach(function (draw, i) {
      var col = i % g.per, row = Math.floor(i / g.per);
      c.save(); c.translate(gap / 2 + col * (g.cell + gap), row * rowH + (rowH - g.cell) / 2 + rowH * 0.04); c.scale(g.cell / 100, g.cell / 100);
      c.fillStyle = c.strokeStyle = colour; draw(c); c.restore();
    });
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  function layer(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Horizontal rules `t` px thick, one every `pitch` px, kept only where `mask` is drawn (everywhere when null).
  function rules(w, h, pitch, t, colour, mask) {
    var c = layer(w, h), x = c.getContext('2d');
    x.fillStyle = colour;
    for (var y = 0; y < h; y += pitch) x.fillRect(0, Math.round(y + (pitch - t) / 2), w, Math.max(1, Math.round(t)));
    if (mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0); }
    return c;
  }
  var drawnW = 0;
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    drawnW = w; canvas.width = w; canvas.height = h;
    var colour = getComputedStyle(band).color, pitch = Math.min(5 * dpr, Math.max(3 * dpr, grid(w, h).cell / 22)), s = Math.max(2, h * 0.014);
    var glyphs = layer(w, h); paint(glyphs.getContext('2d'), w, h, '#fff');
    // the shadow side: glyph pixels whose neighbour down and right is outside the glyph (light from the top left)
    var shade = layer(w, h), sc = shade.getContext('2d');
    sc.drawImage(glyphs, 0, 0); sc.globalCompositeOperation = 'destination-out'; sc.drawImage(glyphs, -s, -s);
    ctx.globalAlpha = 0.28; ctx.drawImage(rules(w, h, pitch, dpr * 0.75, colour, null), 0, 0);
    ctx.globalAlpha = 1; ctx.drawImage(rules(w, h, pitch, pitch * 0.32, colour, glyphs), 0, 0);
    ctx.drawImage(rules(w, h, pitch, pitch * 0.6, colour, shade), 0, 0);
    // fade out toward the legal line
    var g = ctx.createLinearGradient(0, h * 0.88, 0, h);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  band.classList.add('live');
  draw();
  // iOS fires resize as the toolbar slides; only a width change needs a redraw
  window.addEventListener('resize', function () { if (Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) !== drawnW) draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
