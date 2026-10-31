// The mascot: a hand-painted saffron admission slip. Gouache body with wet edges and paper grain,
// brushed ink outline that boils on twos, ink-line limbs, a cream face label and an APAAR-ID stripe.
// Brush stroke model adapted from the Lemo-Opuscar watercolour engine (MIT).
import { clamp, lerp, mulberry, vnoise } from '/core/lib.js';

export const SAFF = '#F37021', SAFF_D = '#C2410C', SAFF_L = '#F8A15E', CREAM = '#FFF4E3', INK = '#1B2A41', NAVY = '#12387A';
const _rgb = {};
const rgb = h => _rgb[h] || (_rgb[h] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(3)})`; };

// ---------- paper grain, generated once (seeded) ----------
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d'), im = c.createImageData(256, 256), R = mulberry(7);
  for (let i = 0; i < 256 * 256; i++) {
    const x = i % 256, y = (i / 256) | 0;
    const fib = vnoise(x * .09 + y * .013) * .5 + vnoise(y * .21 + 40) * .25;        // long paper fibres
    const v = 200 + (R() * 40 + fib * 30) | 0;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
  }
  c.putImageData(im, 0, 0); GRAIN = cv; return cv;
}

// ---------- brush stroke (centreline + width profile + dry-brush bristles) ----------
function stroke(R, pts, w, prof = 'brush', rough = .25, nb = 0) {
  const n = pts.length, ws = [], nx = [], ny = [], sd = R() * 1000;
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    const f = prof === 'even' ? Math.min(1, s / .08 + .45) * Math.min(1, (1 - s) / .1 + .45) : Math.min(1, s / .12 + .35) * Math.pow(1 - s * .8, .55);
    ws.push(Math.max(.4, w * f * (1 + rough * (vnoise(sd + i * .8) * 2 - 1))));
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    nx.push(-dy / L); ny.push(dx / L);
  }
  const br = []; for (let j = 0; j < nb; j++) br.push({ off: (R() - .5) * .9, bw: Math.max(.6, w / nb * (.6 + R() * .7)), a: .3 + R() * .5, dash: [10 + R() * 40, 1 + R() * 4, 10 + R() * 40, 2 + R() * 3] });
  return { pts, ws, nx, ny, br };
}
function drawStroke(c, s, col, a = .92) {
  const P = s.pts, n = P.length;
  c.beginPath();
  for (let i = 0; i < n; i++) { const h = s.ws[i] / 2, x = P[i][0] + s.nx[i] * h, y = P[i][1] + s.ny[i] * h; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  for (let i = n - 1; i >= 0; i--) { const h = s.ws[i] / 2; c.lineTo(P[i][0] - s.nx[i] * h, P[i][1] - s.ny[i] * h); }
  c.closePath(); c.fillStyle = rgba(col, a); c.fill();
  if (s.br.length) {
    c.lineCap = 'round';
    for (const b of s.br) { c.beginPath(); for (let i = 0; i < n; i++) { const h = s.ws[i] * b.off, x = P[i][0] + s.nx[i] * h, y = P[i][1] + s.ny[i] * h; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.setLineDash(b.dash); c.lineWidth = b.bw; c.strokeStyle = rgba(col, a * b.a); c.stroke(); }
    c.setLineDash([]);
  }
}
const quad = (x0, y0, cx, cy, x1, y1, n = 10) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); } return o; };

// a hand-cut rounded outline: points around a rounded rectangle with a folded corner, jittered
function slipOutline(R, w, h, fold, jit) {
  const pts = [], r = w * .14, N = 64;
  // walk the perimeter clockwise starting top-left; the top-right corner is cut for the fold
  const path = [[-w / 2 + r, -h], [w / 2 - fold, -h], [w / 2, -h + fold], [w / 2, -r], [w / 2 - r * .3, 0], [-w / 2 + r * .3, 0], [-w / 2, -r], [-w / 2, -h + r]];
  for (let k = 0; k < path.length; k++) {
    const a = path[k], b = path[(k + 1) % path.length], seg = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (w + h) * N));
    for (let i = 0; i < seg; i++) { const t = i / seg; pts.push([lerp(a[0], b[0], t) + (R() - .5) * jit, lerp(a[1], b[1], t) + (R() - .5) * jit]); }
  }
  return pts;
}
const poly = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };

/**
 * Paint the mascot with its feet at (x, y) in screen pixels.
 * o: { s: scale (1 = 64 px wide body), t: time (s), flip, sq (+squash/-stretch), rot, eyes: n|l|r|u|d|wide|happy|shut|blink|worry,
 *      arms: down|up|wave|point|hold, legs: stand|walkA|walkB|tuck|sit, look: [-1..1] horizontal gaze, op, smudge (0..1), small }
 */
export function paint(c, x, y, o = {}) {
  const s = o.s ?? 1, t = o.t ?? 0, op = o.op ?? 1; if (op <= 0 || s <= 0) return;
  const boil = Math.floor(t * 15);                                    // redraw the line on twos (30 fps)
  const R = mulberry(9001 + boil * 13 + (o.seed || 0));
  const W = 64, H = 78, FOLD = 18, sq = o.sq || 0;
  const legH = o.legs === 'sit' ? 4 : o.legs === 'tuck' ? 8 : 16;
  c.save(); c.globalAlpha = op;
  c.translate(x, y);
  // contact shadow
  if (o.shadow !== false && o.legs !== 'tuck') { c.fillStyle = 'rgba(18,40,90,.16)'; c.beginPath(); c.ellipse(0, 1, 34 * s * (1 + sq * .5), 6 * s, 0, 0, Math.PI * 2); c.fill(); }
  c.scale(s * (o.flip ? -1 : 1) * (1 + sq * .55), s * (1 - sq));
  if (o.rot) c.rotate(o.rot);
  const by = -legH;                                                   // body bottom sits on the legs

  // ---- legs: two ink strokes with rounded nubs
  const legs = o.legs || 'stand', step = legs === 'walkA' ? 1 : legs === 'walkB' ? -1 : 0;
  for (const side of [-1, 1]) {
    const lx = side * 13, k = step * side * 7;
    const foot = legs === 'tuck' ? [lx + side * 3, by + 6] : legs === 'sit' ? [lx + side * 14, 0] : [lx + k, 0];
    drawStroke(c, stroke(R, quad(lx, by, lx + k * .3 + side * 2, (by + foot[1]) / 2, foot[0], foot[1], 6), 4.2, 'even', .2), INK, .95);
    c.fillStyle = INK; c.beginPath(); c.ellipse(foot[0] + side * 2.5, foot[1] - 1.2, 5, 3, 0, 0, Math.PI * 2); c.fill();
  }

  c.save(); c.translate(0, by);
  // ---- body wash: bleed, body, pooled rim, grain, dry-brush highlight
  const jit = 1.1, out = slipOutline(R, W, H, FOLD, jit);
  const bleed = out.map(p => [p[0] * 1.045 + (R() - .5) * 3, p[1] * 1.03 + (R() - .5) * 2]);
  poly(c, bleed); c.fillStyle = rgba(SAFF_L, .32); c.fill();
  poly(c, out); c.fillStyle = rgba(SAFF, .94); c.fill();
  const g = c.createRadialGradient(-10, -H * .62, 4, 0, -H * .45, W * .9);        // pigment pools darker towards the edges
  g.addColorStop(0, rgba(SAFF_L, .35)); g.addColorStop(.6, rgba(SAFF, 0)); g.addColorStop(1, rgba(SAFF_D, .55));
  c.fillStyle = g; c.fill();
  c.save(); poly(c, out); c.clip();
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = op * .55;
  c.drawImage(grain(), -W, -H - 8, 256 * .55, 256 * .55);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = op;
  for (let i = 0; i < 3; i++) { const yy = -H * (.78 - i * .09) + (R() - .5) * 3;
    drawStroke(c, stroke(R, quad(-W * .42, yy, -W * .1, yy - 4, W * .22, yy + 2, 8), 5 + R() * 3, 'brush', .4, 3), CREAM, .16); }
  if (o.smudge) { c.fillStyle = rgba(SAFF_D, .55 * o.smudge); for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse((R() - .5) * W * .8, -R() * H, 4 + R() * 12, 2 + R() * 6, R() * 3, 0, Math.PI * 2); c.fill(); } }
  c.restore();
  // rim of pooled pigment
  poly(c, out); c.lineWidth = 2.2; c.strokeStyle = rgba(SAFF_D, .45); c.stroke();
  // folded corner: cream underside with a soft shade
  const fx = W / 2, fy = -H;
  c.beginPath(); c.moveTo(fx - FOLD + (R() - .5), fy + (R() - .5)); c.lineTo(fx - FOLD + 1.5, fy + FOLD - 1); c.lineTo(fx + (R() - .5), fy + FOLD + (R() - .5)); c.closePath();
  c.fillStyle = rgba(CREAM, .97); c.fill(); c.strokeStyle = rgba(SAFF_D, .35); c.lineWidth = 1.4; c.stroke();

  // ---- face label (cream patch) and eyes
  const fw = 40, fh = 25, fyy = -H * .69;
  const lab = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; lab.push([Math.cos(a) * (fw / 2) * (1 + (R() - .5) * .06), fyy + Math.sin(a) * (fh / 2) * (1 + (R() - .5) * .08)]); }
  // squircle-ish: push points towards the corners
  const labS = lab.map(([px, py]) => { const dx = px / (fw / 2), dy = (py - fyy) / (fh / 2), k = 1 / Math.pow(Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4), .25); return [px * Math.min(1.35, k) * .96, fyy + (py - fyy) * Math.min(1.35, k) * .94]; });
  poly(c, labS); c.fillStyle = rgba(CREAM, .96); c.fill();
  c.strokeStyle = rgba(SAFF_D, .3); c.lineWidth = 1.2; c.stroke();
  const look = clamp(o.look ?? ({ l: -1, r: 1 }[o.eyes] || 0), -1, 1), lookY = { u: -1, d: 1 }[o.eyes] || 0;
  const ex = 8.5, ey = fyy + lookY * 2.2, gx = look * 3.2;
  c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round';
  const eyes = o.eyes || 'n';
  for (const side of [-1, 1]) {
    const cx = side * ex + gx;
    if (eyes === 'blink' || eyes === 'shut') { drawStroke(c, stroke(R, quad(cx - 4, ey, cx, ey + (eyes === 'shut' ? 1.6 : .5), cx + 4, ey, 5), 2.2, 'even', .2), INK); }
    else if (eyes === 'happy') { drawStroke(c, stroke(R, quad(cx - 4.2, ey + 1.5, cx, ey - 3.5, cx + 4.2, ey + 1.5, 6), 2.4, 'even', .2), INK); }
    else {
      const r = eyes === 'wide' ? 4.4 : 3.3;
      c.beginPath(); c.ellipse(cx + (R() - .5) * .4, ey + (R() - .5) * .4, r, r * 1.18, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(cx - r * .35, ey - r * .45, r * .32, 0, Math.PI * 2); c.fill(); c.fillStyle = INK;
      if (eyes === 'worry') drawStroke(c, stroke(R, quad(cx - 4, ey - 7 - side * 1.8, cx, ey - 8, cx + 4, ey - 7 + side * 1.8, 4), 1.8, 'even', .2), INK);
    }
  }
  // mouth: a small brush stroke
  const my = fyy + 8.2;
  if (eyes === 'happy' || o.mouth === 'smile') drawStroke(c, stroke(R, quad(-4, my - 1, 0 + gx * .5, my + 3, 4, my - 1, 6), 1.9, 'even', .25), INK);
  else if (eyes === 'wide' || o.mouth === 'o') { c.beginPath(); c.ellipse(gx * .5, my + .5, 2.2, 2.6, 0, 0, Math.PI * 2); c.fill(); }
  else if (eyes === 'worry') drawStroke(c, stroke(R, quad(-3.5, my + 1.5, 0, my - 1, 3.5, my + 1.5, 5), 1.7, 'even', .25), INK);
  else drawStroke(c, stroke(R, quad(-3, my, gx * .4, my + 1.4, 3, my, 5), 1.7, 'even', .25), INK);

  // ---- APAAR-ID stripe: three painted navy dashes
  for (let i = 0; i < 3; i++) { const sx = -18 + i * 13, sy = -H * .32 + (R() - .5) * 1.5;
    drawStroke(c, stroke(R, quad(sx, sy, sx + 4, sy - .6, sx + 9, sy + .4, 5), 3.4, 'even', .3), NAVY, .85); }
  for (let i = 0; i < 2; i++) { const sy = -H * .19 + i * 5.5; drawStroke(c, stroke(R, quad(-18, sy, 0, sy + (R() - .5), 18 - i * 10, sy, 6), 1.6, 'even', .35), SAFF_D, .55); }

  // ---- brushed ink outline (boils on twos)
  const ol = out.concat([out[0]]).map(p => [p[0] + (R() - .5) * .8, p[1] + (R() - .5) * .8]);
  const chunks = 4, per = Math.ceil(ol.length / chunks);
  for (let k = 0; k < chunks; k++) { const pts = ol.slice(k * per, Math.min(ol.length, (k + 1) * per + 2)); if (pts.length > 2) drawStroke(c, stroke(R, pts, 2.8, 'brush', .22), INK, .9); }
  drawStroke(c, stroke(R, quad(fx - FOLD + .5, fy + .5, fx - FOLD + 2, fy + FOLD * .6, fx - .5, fy + FOLD, 5), 1.8, 'even', .3), INK, .75);

  // ---- arms (ink strokes from the body sides)
  const arms = o.arms || 'down', wave = Math.sin(t * 14) * .5;
  const shoulder = -H * .44;
  const A = { down: [[-1, 10, 22], [1, 10, 22]], up: [[-1, -14, -22], [1, -14, -22]], wave: [[-1, 10, 22], [1, -10 + wave * 8, -24]],
    point: [[-1, 10, 22], [1, 30, -6]], hold: [[-1, 14, -2], [1, 14, -2]], cheer: [[-1, -18, -18], [1, -18, -18]] }[arms] || [[-1, 10, 22], [1, 10, 22]];
  for (const [side, dx, dy] of A) {
    const sx = side * (W / 2 - 2), ex2 = sx + side * Math.abs(dx) + (arms === 'point' && side > 0 ? 0 : 0), ey2 = shoulder + dy;
    drawStroke(c, stroke(R, quad(sx, shoulder, sx + side * Math.abs(dx) * .6, shoulder + dy * .2, ex2, ey2, 6), 3.8, 'even', .2), INK, .95);
    c.fillStyle = INK; c.beginPath(); c.arc(ex2, ey2, 3.2, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  c.restore();
}

/** Height of the mascot (feet to top of body) at scale s, for placing props above its head. */
export const HEIGHT = s => (78 + 16) * s;

// ---------- painted props: tick, cross, sparkle, dots, seal pulse ----------
export function tick(c, x, y, s, op = 1, t = 0) {
  const R = mulberry(41 + Math.floor(t * 15)); c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(s, s);
  drawStroke(c, stroke(R, quad(-10, 0, -4, 6, -2, 9, 5).concat(quad(-2, 9, 6, -6, 14, -14, 8)), 5, 'brush', .3), '#0F6E5C'); c.restore();
}
export function cross(c, x, y, s, op = 1, t = 0) {
  const R = mulberry(43 + Math.floor(t * 15)); c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(s, s);
  drawStroke(c, stroke(R, quad(-9, -9, 0, 0, 9, 9, 6), 5, 'brush', .3), '#B42318');
  drawStroke(c, stroke(R, quad(9, -9, 0, 0, -9, 9, 6), 5, 'brush', .3), '#B42318'); c.restore();
}
export function sparkle(c, x, y, s, op = 1, col = SAFF) {
  c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 3 : 11; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore();
}
export function dots(c, x, y, s, n, op = 1) {
  c.save(); c.globalAlpha = op; c.fillStyle = INK; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x + i * 11 * s, y, 3.2 * s, 0, Math.PI * 2); c.fill(); } c.restore();
}
export function bang(c, x, y, s, op = 1, t = 0) {
  const R = mulberry(47 + Math.floor(t * 15)); c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(s, s);
  drawStroke(c, stroke(R, quad(0, -16, 1, -8, 0, 0, 5), 5.5, 'brush', .3), SAFF_D); c.fillStyle = SAFF_D; c.beginPath(); c.arc(0, 7, 3.2, 0, Math.PI * 2); c.fill(); c.restore();
}
/** A loose painted ring pulse (used for the signature moment; deliberately not an emblem or seal). */
export function ringPulse(c, x, y, r, op, t = 0, col = SAFF) {
  const R = mulberry(53 + Math.floor(t * 15)); const pts = [];
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([x + Math.cos(a) * r * (1 + (R() - .5) * .03), y + Math.sin(a) * r * (1 + (R() - .5) * .03)]); }
  c.save(); c.globalAlpha = op; drawStroke(c, stroke(R, pts, 5, 'even', .4, 2), col, .8); c.restore();
}
/** Paint a free brush line (used by the painted scenes). */
export function brushLine(c, pts, w, col, a = .9, seed = 1, nb = 0) { drawStroke(c, stroke(mulberry(seed), pts, w, 'brush', .3, nb), col, a); }
export { quad, stroke, drawStroke };
