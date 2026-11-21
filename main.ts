// OSTRA LUME — a travel poster for a city of pearl towers that stands in
// the sea at low tide and is an island again by morning. Painted in one
// file from raw pixels: a moonlit teal night, a huge low moon, a spiral
// pearl lighthouse with a sweeping beam, smaller towers, and the whole
// city doubled in the wet sand and tide pools below.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const OW = 768;
const OH = 1024;
const sea = new Uint8Array(OW * OH * 3);

let orand_state = 9021025;
function orand() {
  orand_state = (Math.imul(orand_state, 1664525) + 1013904223) >>> 0;
  return orand_state / 4294967296;
}
function oc(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function omix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function opaint(x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= OW || y >= OH) return;
  const i = (y * OW + x) * 3;
  sea[i] = sea[i] * (1 - a) + c[0] * a;
  sea[i + 1] = sea[i + 1] * (1 - a) + c[1] * a;
  sea[i + 2] = sea[i + 2] * (1 - a) + c[2] * a;
}
function oget(x, y) {
  const i = (y * OW + x) * 3;
  return [sea[i], sea[i + 1], sea[i + 2]];
}
function osky(stops) {
  for (let y = 0; y < OH; y++) {
    let s = 0;
    while (s < stops.length - 2 && y > stops[s + 1][0]) s++;
    const c = omix(stops[s][1], stops[s + 1][1], Math.min(1, Math.max(0, (y - stops[s][0]) / (stops[s + 1][0] - stops[s][0]))));
    for (let x = 0; x < OW; x++) {
      const i = (y * OW + x) * 3;
      sea[i] = c[0]; sea[i + 1] = c[1]; sea[i + 2] = c[2];
    }
  }
}
function oorb(cx, cy, r, c, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) opaint(x, y, c, a);
  }
}
function ooval(cx, cy, rx, ry, c, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const t = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) opaint(x, y, c, a);
  }
}
function osoft(cx, cy, rx, ry, c, a) {
  for (let k = 6; k >= 1; k--) ooval(cx, cy, (rx * k) / 6, (ry * k) / 6, c, a / 3.4);
}
function opoly(pts, c, a) {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  for (let y = Math.floor(lo); y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) opaint(x, y, c, a);
  }
}
function oline(x0, y0, x1, y1, w, c, a) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / (w * 0.3)));
  for (let i = 0; i <= n; i++) oorb(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w / 2, c, a);
}
function orect(x, y, w, h, c, a) {
  for (let j = Math.floor(y); j < y + h; j++)
    for (let i = Math.floor(x); i < x + w; i++) opaint(i, j, c, a);
}

// Stroke letters on a 4x6 grid, pearl-white for a moonlit poster.
const OFONT = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1.1, 4.1], [2.9, 4.1]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [3.7, 1], [2.6, 2.1], [0, 2.1]], [[0, 2.1], [2.9, 2.1], [3.9, 3.6], [2.9, 6], [0, 6]]],
  C: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 4.6]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.4, 0], [4, 1.9], [4, 4.1], [2.4, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3.1, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3.1, 3]]],
  G: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 5.9], [4, 3.7], [2.5, 3.7]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.6, 0], [3.4, 0]], [[0.6, 6], [3.4, 6]]],
  J: [[[4, 0], [4, 4.5], [3.1, 5.8], [1.3, 6], [0.3, 4.9]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0.7, 3.1]], [[1.3, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.4], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]]],
  Q: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]], [[2.7, 4.3], [4.3, 6.3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]], [[2.1, 2.5], [4, 6]]],
  S: [[[4, 0.9], [2.7, 0], [0.9, 0.6], [0.5, 1.9], [2, 2.9], [3.4, 3.7], [3.6, 5], [2.4, 6], [0.3, 5.3]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.3], [0.8, 5.6], [2, 6], [3.2, 5.6], [4, 4.3], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [0.8, 6], [2, 2.7], [3.2, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 2.8], [4, 0]], [[2, 2.8], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  " ": [],
};
function oname(text, cx, y, size, c, a, track) {
  const s = size / 6;
  const w = Math.max(2.4, size * 0.17);
  let x = cx - (text.length * 5 * s + (text.length - 1) * track * s) / 2;
  for (const ch of text.toUpperCase()) {
    for (const st of OFONT[ch] || [])
      for (let i = 0; i + 1 < st.length; i++)
        oline(x + st[i][0] * s, y + st[i][1] * s, x + st[i + 1][0] * s, y + st[i + 1][1] * s, w, c, a);
    x += 5 * s + track * s;
  }
}

// ---- The scene: low tide under a rising moon ----
const TIDE = 668; // the waterline the city stands on
osky([
  [0, oc("#06121f")],
  [240, oc("#0a2438")],
  [460, oc("#11405a")],
  [TIDE, oc("#17607c")],
  [800, oc("#0d3247")],
  [1024, oc("#081c2c")],
]);

// Stars, sparse and small in the upper dark.
for (let i = 0; i < 200; i++) {
  const x = orand() * OW;
  const y = Math.pow(orand(), 1.6) * 430;
  oorb(x, y, orand() > 0.9 ? 1.9 : 1.1, oc("#dff6ff"), 0.3 + orand() * 0.55);
}

// The moon: huge, low, pearl-pale, with soft maria.
const MOONX = 540, MOONY = 300, MOONR = 128;
osoft(MOONX, MOONY, MOONR * 1.6, MOONR * 1.6, oc("#bfe3ea"), 0.35);
oorb(MOONX, MOONY, MOONR, oc("#eef7ee"), 1);
oorb(MOONX - 40, MOONY - 30, 22, oc("#d9e6da"), 0.7);
oorb(MOONX + 30, MOONY + 44, 16, oc("#d9e6da"), 0.7);
oorb(MOONX + 52, MOONY - 52, 12, oc("#dde8dd"), 0.7);
oorb(MOONX - 8, MOONY + 8, 9, oc("#dde8dd"), 0.6);
// Moon glitter path on the water, drawn later over the wet sand.

// A pearl tower: tapering shell spire with a ringed crown and windows.
function tower(cx, baseY, h, wdt, main, shade) {
  opoly([[cx - wdt, baseY], [cx - wdt * 0.34, baseY - h], [cx + wdt * 0.34, baseY - h], [cx + wdt, baseY]], main, 1);
  opoly([[cx + wdt * 0.1, baseY], [cx + wdt * 0.2, baseY - h], [cx + wdt * 0.34, baseY - h], [cx + wdt, baseY]], shade, 0.55);
  // spiral seam winding up the shell
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const y = baseY - h * t;
    const half = wdt * (1 - t * 0.66);
    const x = cx + Math.sin(t * 9.5) * half * 0.7;
    oorb(x, y, 2, shade, 0.5);
  }
  // crown ring and finial
  ooval(cx, baseY - h, wdt * 0.52, wdt * 0.2, main, 1);
  oorb(cx, baseY - h - wdt * 0.3, wdt * 0.13, oc("#ffd98a"), 1);
  // windows in a rising line
  const n = Math.floor(h / 44);
  for (let i = 0; i < n; i++) {
    const wy = baseY - 26 - i * 40;
    if (orand() > 0.25) oorb(cx + (orand() - 0.5) * wdt * 0.5, wy, 3.6, oc("#ffd98a"), 0.95);
  }
}

// The lighthouse at centre: taller, banded pearl and teal, its lamp
// sweeping one long beam out over the water.
const LX = 356, LTOP = 208;
tower(LX, TIDE, TIDE - LTOP, 56, oc("#e8e2d2"), oc("#b9c4bb"));
// lamp room
orect(LX - 17, LTOP - 26, 34, 26, oc("#2b4a5a"), 1);
osoft(LX, LTOP - 14, 44, 30, oc("#ffd98a"), 0.85);
oorb(LX, LTOP - 14, 8, oc("#fff3d0"), 1);
// the beam: a long translucent wedge to the left, a shorter one right
opoly([[LX - 8, LTOP - 20], [LX - 8, LTOP - 6], [36, LTOP + 66], [36, LTOP + 10]], oc("#ffeec2"), 0.16);
opoly([[LX - 8, LTOP - 19], [LX - 8, LTOP - 7], [36, LTOP + 40], [36, LTOP + 22]], oc("#ffeec2"), 0.14);
opoly([[LX + 8, LTOP - 19], [LX + 8, LTOP - 7], [700, LTOP + 92], [700, LTOP + 52]], oc("#ffeec2"), 0.10);

// Flanking pearl towers, a little cluster of a city.
tower(196, TIDE, 300, 42, oc("#ddd5c2"), oc("#aeb8ad"));
tower(492, TIDE, 262, 38, oc("#e2dac6"), oc("#b3beb2"));
tower(120, TIDE, 196, 32, oc("#d5cdb6"), oc("#a5b1a2"));
tower(584, TIDE, 176, 30, oc("#dcd4c0"), oc("#abb7a9"));
tower(268, TIDE, 168, 28, oc("#d8d0ba"), oc("#a9b5a6"));
// Rocky causeway the city stands on.
opoly([[0, TIDE + 26], [150, TIDE - 6], [420, TIDE + 4], [640, TIDE - 8], [OW, TIDE + 20], [OW, TIDE + 44], [0, TIDE + 48]], oc("#0a2438"), 1);
for (let i = 0; i < 40; i++) oorb(orand() * OW, TIDE + 2 + orand() * 34, 2 + orand() * 4, oc("#17607c"), 0.5);

// ---- The reflection: mirror the city band into the wet sand below ----
// Copy rows above the waterline downward with a ripple offset and a
// deep teal veil, so towers and moon double in the tide pools.
for (let dy = 0; dy < OH - TIDE - 50; dy++) {
  const sy = TIDE - 8 - Math.floor(dy * 0.62);
  if (sy < 0) break;
  const ripple = Math.round(Math.sin(dy * 0.24) * 3 + Math.sin(dy * 0.061) * 2);
  const fadeA = Math.max(0, 0.52 - dy / (OH - TIDE) * 0.4);
  for (let x = 0; x < OW; x++) {
    const sx = Math.min(OW - 1, Math.max(0, x + ripple));
    const c = oget(sx, sy);
    opaint(x, TIDE + 44 + dy, c, fadeA * 0.5);
  }
}
// Tide pool glints and the moon's glitter path.
for (let i = 0; i < 170; i++) {
  const y = TIDE + 52 + orand() * (OH - TIDE - 70);
  const spread = 30 + (y - TIDE) * 0.36;
  const x = MOONX + (orand() - 0.5) * spread * 2;
  oline(x, y, x + 8 + orand() * 22, y, 2, oc("#eef7ee"), 0.30);
}
for (let i = 0; i < 60; i++) {
  const x = orand() * OW, y = TIDE + 52 + orand() * (OH - TIDE - 80);
  oline(x, y, x + 6 + orand() * 16, y, 1.7, oc("#8fd0d8"), 0.22);
}
// Wet sand sheen bands between the pools.
for (const by of [760, 836, 918]) ooval(OW / 2, by, OW * 0.52, 10, oc("#17607c"), 0.25);

// The name across the top dark, pearl-white with a deep shadow.
oname("OSTRA", OW / 2 + 3, 52, 84, oc("#020a12"), 0.6, 0.55);
oname("OSTRA", OW / 2, 48, 84, oc("#f4fbf2"), 1, 0.55);
oname("LUME", OW / 2, 148, 52, oc("#bfe3ea"), 0.95, 1.1);

// ---- PNG: None-filter rows (filter 0), plain and sturdy ----
const OTAB = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  OTAB[n] = c >>> 0;
}
function ocrc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = OTAB[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function ochunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(ocrc(body));
  return Buffer.concat([len, body, sum]);
}
function oencode() {
  const stride = OW * 3;
  const raw = Buffer.alloc((stride + 1) * OH);
  for (let y = 0; y < OH; y++) {
    const row = y * (stride + 1);
    raw[row] = 0; // no filter: the wet gradients compress well enough
    raw.set(sea.subarray(y * stride, (y + 1) * stride), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(OW, 0);
  ihdr.writeUInt32BE(OH, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ochunk("IHDR", ihdr),
    ochunk("IDAT", deflateSync(raw, { level: 9 })),
    ochunk("IEND", Buffer.alloc(0)),
  ]);
}
const odest = process.env.ENTRY_OUT || "/output/entry.png";
try { mkdirSync(odest.slice(0, odest.lastIndexOf("/")), { recursive: true }); } catch { /* provided */ }
writeFileSync(odest, oencode());
console.log("OSTRA LUME poster written to", odest);
