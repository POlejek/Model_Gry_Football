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

// What a board shows: 'brand' (logo and name), 'logo', 'name' (the school's name) or 'text' (own text).
// The frame around the pitch may also use 'alternate': logo boards and name boards in turn.
export const BOARD_CONTENTS = [
  ['alternate', 'Na przemian logo i nazwa'],
  ['brand', 'Logo z nazwą'],
  ['logo', 'Samo logo'],
  ['name', 'Nazwa szkółki'],
  ['text', 'Własny tekst'],
];
export const DEFAULT_BOARD_STYLE = { content: 'alternate', text: '', bg: RED, fg: '#ffffff' };

// The school shown on boards placed on the pitch (set by the editor and by picture rendering).
let brand = { club: null, logo: null };
export function setBoardBrand(club, logo = logoImage(club?.logo)) { brand = { club, logo }; }

function fitText(ctx, text, maxW, h) {
  let size = Math.round(h * 0.5);
  ctx.font = `bold ${size}px Arial, sans-serif`;
  while (size > 6 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = `bold ${size}px Arial, sans-serif`;
  }
}

function drawLogo(ctx, logo, cx, w, h) {
  const ratio = (logo.naturalWidth || logo.width || 1) / (logo.naturalHeight || logo.height || 1); // keeps proportions
  const lh = Math.min(h - 6, (w - 6) / ratio);
  ctx.drawImage(logo, cx - (lh * ratio) / 2, -lh / 2, lh * ratio, lh);
}

// One board of length w and height h centred on the origin.
export function drawPanel(ctx, { w, h, content = 'brand', text = '', bg = RED, fg = '#ffffff', logo = null, name = '' }) {
  const label = ((content === 'text' ? text : name) || (content === 'text' ? 'BANDA' : 'SZKÓŁKA')).toUpperCase();
  const kind = (content === 'logo' || content === 'brand') && !logo ? 'name' : content;
  ctx.fillStyle = bg;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (kind === 'logo') {
    drawLogo(ctx, logo, 0, w, h);
    return;
  }
  let left = -w / 2;
  if (kind === 'brand') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(left + 2, -h / 2 + 2, h - 4, h - 4);
    drawLogo(ctx, logo, left + h / 2, h - 2, h - 2);
    left += h;
  }
  const textW = w / 2 - left;
  fitText(ctx, label, textW - 10, h);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + textW / 2, 1);
}

// A board placed on the pitch like a cone: { x, y, rotation, scale, length, content, text, color (bg), fg }.
export const BOARD_ITEM_H = 26;
export function drawBoardItem(ctx, item, selected) {
  const s = item.scale || 1;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation || 0);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  drawPanel(ctx, {
    w: (item.length || 150) * s, h: BOARD_ITEM_H * s, content: item.content || 'brand', text: item.text,
    bg: item.color || RED, fg: item.fg || '#ffffff', logo: brand.logo, name: (brand.club?.name || '').trim(),
  });
  ctx.restore();
}

// Draws the frame for a w × h pitch with the canvas origin at the frame's top-left corner.
export function drawBoards(ctx, { w, h, b, club, logo = logoImage(club?.logo), style = DEFAULT_BOARD_STYLE }) {
  if (!b) return;
  const name = (club?.name || '').trim();
  const look = { ...DEFAULT_BOARD_STYLE, ...(style || {}) };
  const alternate = look.content === 'alternate';
  const panels = alternate
    ? boardPanels(w, h, b, { logo: Boolean(logo), name: Boolean(name) || !logo })
    : boardPanels(w, h, b, { logo: false });
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
    const panel = alternate
      ? (p.kind === 'logo' ? { content: 'logo', bg: '#ffffff' } : { content: 'name', bg: look.bg, fg: look.fg })
      : { content: look.content, text: look.text, bg: look.bg, fg: look.fg };
    drawPanel(ctx, { w: p.w, h: p.h, logo, name, ...panel });
    ctx.restore();
  });
  ctx.restore();
}
