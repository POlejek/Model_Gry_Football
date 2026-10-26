// Advertising boards with the school's logo and name, drawn as a frame around the drill's pitch.
// The frame lies outside the pitch's own coordinates, so drills keep their positions with or without it.

export const BOARD = 34; // thickness of the frame, in pitch pixels
const PANEL = 150; // preferred length of one board
const GAP = 3;
const DARK = '#1f2a30';
const RED = '#e30613';

export const hasBrand = (club) => Boolean(club && ((club.logo || '').trim() || (club.name || '').trim()));

// Frame thickness for this pitch: boards only when the drill asks for them and the school has a logo or a name.
export const boardSize = (pitch, club) => (pitch?.boards && hasBrand(club) ? BOARD : 0);

// Boards along the four sides of a w × h pitch framed by `b` (frame coordinates, pitch starts at b, b).
// Each board: { x, y, w, h, rotation, kind } — x/y is its centre, w its length, h its height;
// rotation turns it to read along the side; kind alternates 'logo' / 'name' (only the available one).
export function boardPanels(w, h, b, { logo = true, name = true } = {}) {
  if (!b || (!logo && !name)) return [];
  const W = w + 2 * b, H = h + 2 * b;
  const sides = [
    { from: [b, b / 2], len: w, dir: [1, 0], rotation: 0 }, // top
    { from: [W - b / 2, b], len: h, dir: [0, 1], rotation: Math.PI / 2 }, // right
    { from: [W - b, H - b / 2], len: w, dir: [-1, 0], rotation: 0 }, // bottom
    { from: [b / 2, H - b], len: h, dir: [0, -1], rotation: -Math.PI / 2 }, // left
  ];
  const panels = [];
  sides.forEach(s => {
    const n = Math.max(1, Math.round(s.len / PANEL));
    const step = s.len / n;
    for (let i = 0; i < n; i++) {
      const t = step * (i + 0.5);
      const kind = !logo ? 'name' : !name ? 'logo' : panels.length % 2 ? 'name' : 'logo';
      panels.push({ x: s.from[0] + s.dir[0] * t, y: s.from[1] + s.dir[1] * t, w: step - GAP, h: b - 2 * GAP, rotation: s.rotation, kind });
    }
  });
  return panels;
}

// Logo pictures by data URL. The first request starts loading and returns null; `onLoad` runs once
// the picture is ready so the caller can draw again.
const logoCache = new Map();
export function logoImage(src, onLoad) {
  if (!src || typeof Image === 'undefined') return null;
  let entry = logoCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, ready: false, waiting: new Set() };
    img.onload = () => { entry.ready = true; entry.waiting.forEach(fn => fn()); entry.waiting.clear(); };
    img.src = src;
    logoCache.set(src, entry);
  }
  if (entry.ready) return entry.img;
  if (onLoad) entry.waiting.add(onLoad);
  return null;
}

// Draws the frame for a w × h pitch with the canvas origin at the frame's top-left corner.
export function drawBoards(ctx, { w, h, b, club, logo = logoImage(club?.logo) }) {
  if (!b) return;
  const name = (club?.name || '').trim();
  const panels = boardPanels(w, h, b, { logo: Boolean(logo), name: Boolean(name) || !logo });
  ctx.save();
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, w + 2 * b, b);
  ctx.fillRect(0, h + b, w + 2 * b, b);
  ctx.fillRect(0, b, b, h);
  ctx.fillRect(w + b, b, b, h);
  panels.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.kind === 'logo') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      // keeps the logo's proportions
      const ratio = (logo.naturalWidth || logo.width || 1) / (logo.naturalHeight || logo.height || 1);
      const lh = Math.min(p.h - 6, (p.w - 8) / ratio);
      ctx.drawImage(logo, -(lh * ratio) / 2, -lh / 2, lh * ratio, lh);
    } else {
      ctx.fillStyle = RED;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      const text = (name || 'SZKÓŁKA').toUpperCase();
      let size = Math.round(p.h * 0.5);
      ctx.font = `bold ${size}px Arial, sans-serif`;
      while (size > 7 && ctx.measureText(text).width > p.w - 10) {
        size -= 1;
        ctx.font = `bold ${size}px Arial, sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 1);
    }
    ctx.restore();
  });
  ctx.restore();
}
