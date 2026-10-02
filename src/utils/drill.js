// Pure drill model helpers for the training editor (no React, no DOM) — unit-tested in drill.test.js.

// ── Pitch ────────────────────────────────────────────────────────
export const FULL_W = 700;

export const FULL_H = 1080;

export const CROP_H = { full: 1080, half: 560, third: 387 };

// Drills saved before the pitch option existed were vertical; new drills start horizontal (fits laptop screens).
export const LEGACY_PITCH = { type: 'full', orientation: 'vertical', width: 30, length: 40 };

export function getPitchSize(p) {
  let w, h;
  if (p.type === 'custom') {
    const s = 1000 / Math.max(p.width, p.length);
    w = Math.round(p.width * s) + 40;
    h = Math.round(p.length * s) + 40;
  } else {
    w = FULL_W;
    h = CROP_H[p.type] || FULL_H;
  }
  return p.orientation === 'horizontal' ? { w: h, h: w } : { w, h };
}

// ── Geometry ─────────────────────────────────────────────────────
export const TWO_PI = Math.PI * 2;

export const normAngle = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function transformObj(kind, o, fn, dRot = 0) {
  if (kind === 'items') {
    const [x, y] = fn(o.x, o.y);
    const keepUpright = o.type === 'text' || o.type === 'step';
    return { ...o, x, y, rotation: dRot && !keepUpright ? normAngle((o.rotation || 0) + dRot) : o.rotation };
  }
  if (kind === 'lines') {
    const [sx, sy] = fn(o.startX, o.startY);
    const [ex, ey] = fn(o.endX, o.endY);
    const n = { ...o, startX: sx, startY: sy, endX: ex, endY: ey };
    if (o.controlX !== undefined) [n.controlX, n.controlY] = fn(o.controlX, o.controlY);
    return n;
  }
  if (o.type === 'rectangle') {
    const [x1, y1] = fn(o.x, o.y);
    const [x2, y2] = fn(o.x + o.width, o.y + o.height);
    return { ...o, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  }
  if (o.type === 'circle') {
    const [cx, cy] = fn(o.centerX, o.centerY);
    return { ...o, centerX: cx, centerY: cy };
  }
  return { ...o, points: o.points.map(p => { const [x, y] = fn(p.x, p.y); return { x, y }; }) };
}

export const translateObj = (kind, o, dx, dy) => transformObj(kind, o, (x, y) => [x + dx, y + dy]);

export function transformFrame(f, fn, dRot) {
  return {
    items: f.items.map(o => transformObj('items', o, fn, dRot)),
    lines: f.lines.map(o => transformObj('lines', o, fn)),
    zones: f.zones.map(o => transformObj('zones', o, fn)),
  };
}

// Keeps content where it is if it fits; otherwise shifts it inside or scales it down to fit.
export function fitFramesTo(frames, w, h, margin = 30) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  frames.forEach(f => {
    f.items.forEach(i => add(i.x, i.y));
    f.lines.forEach(l => { add(l.startX, l.startY); add(l.endX, l.endY); });
    f.zones.forEach(z => { const b = zoneBBox(z); add(b[0], b[1]); add(b[2], b[3]); });
  });
  if (x0 === Infinity) return frames;
  if (x0 >= margin && y0 >= margin && x1 <= w - margin && y1 <= h - margin) return frames;
  const bw = x1 - x0, bh = y1 - y0;
  const s = Math.min(1, (w - 2 * margin) / (bw || 1), (h - 2 * margin) / (bh || 1));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const halfW = (bw * s) / 2, halfH = (bh * s) / 2;
  const ncx = clamp(cx, margin + halfW, w - margin - halfW);
  const ncy = clamp(cy, margin + halfH, h - margin - halfH);
  const fn = (x, y) => [ncx + (x - cx) * s, ncy + (y - cy) * s];
  return frames.map(f => transformFrame(f, fn, 0));
}

export function zoneBBox(z) {
  if (z.type === 'rectangle') return [Math.min(z.x, z.x + z.width), Math.min(z.y, z.y + z.height), Math.max(z.x, z.x + z.width), Math.max(z.y, z.y + z.height)];
  if (z.type === 'circle') return [z.centerX - z.radius, z.centerY - z.radius, z.centerX + z.radius, z.centerY + z.radius];
  const xs = z.points.map(p => p.x), ys = z.points.map(p => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function objectsInRect(frame, r) {
  const x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1);
  const y0 = Math.min(r.y0, r.y1), y1 = Math.max(r.y0, r.y1);
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  return [
    ...frame.items.filter(i => inside(i.x, i.y)),
    ...frame.lines.filter(l => inside(l.startX, l.startY) && inside(l.endX, l.endY)),
    ...frame.zones.filter(z => { const b = zoneBBox(z); return inside(b[0], b[1]) && inside(b[2], b[3]); }),
  ].map(o => o.id);
}

export function findObj(frame, id) {
  for (const kind of ['items', 'lines', 'zones']) {
    const obj = frame[kind].find(o => o.id === id);
    if (obj) return { kind, obj };
  }
  return null;
}

// ── Animation ────────────────────────────────────────────────────
export function lerpObj(a, b, p) {
  const out = { ...(p < 0.5 ? a : b) };
  for (const k of Object.keys(a)) {
    if (k === 'id' || typeof a[k] !== 'number' || typeof b[k] !== 'number') continue;
    if (k === 'rotation') {
      const d = normAngle(b[k] - a[k] + Math.PI) - Math.PI;
      out[k] = a[k] + d * p;
    } else {
      out[k] = a[k] + (b[k] - a[k]) * p;
    }
  }
  if (Array.isArray(a.points) && Array.isArray(b.points) && a.points.length === b.points.length) {
    out.points = a.points.map((pt, j) => ({ x: pt.x + (b.points[j].x - pt.x) * p, y: pt.y + (b.points[j].y - pt.y) * p }));
  }
  return out;
}

export function interpolateFrames(frames, t) {
  const i = Math.min(Math.floor(t), frames.length - 1);
  const raw = t - i;
  if (i >= frames.length - 1 || raw <= 0) return frames[i];
  const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
  const a = frames[i], b = frames[i + 1];
  const mix = (kind) => {
    const bMap = new Map(b[kind].map(o => [o.id, o]));
    const aIds = new Set(a[kind].map(o => o.id));
    const out = a[kind].map(o => bMap.has(o.id) ? lerpObj(o, bMap.get(o.id), p) : { ...o, _alpha: 1 - p });
    b[kind].forEach(o => { if (!aIds.has(o.id)) out.push({ ...o, _alpha: p }); });
    return out;
  };
  return { items: mix('items'), lines: mix('lines'), zones: mix('zones') };
}

export const TYPE_LABELS = {
  player: 'Zawodnik', goal: 'Bramka', 'mini-goal': 'Mini-bramka', cone: 'Stożek', disc: 'Talerzyk',
  pole: 'Tyczka', hurdle: 'Płotek', hoop: 'Obręcz', ladder: 'Drabinka', mannequin: 'Manekin',
  ball: 'Piłka', text: 'Tekst', step: 'Krok', coach: 'Trener',
};

export const DEFAULT_META = {
  category: '', duration: '', players: '', area: '',
  objective: '', organization: '', description: '', coachingPoints: '', variations: '',
  phases: [], // keys of game-model phases from the tactics editor, e.g. 'Atak-Budowanie'
};

export const META_FIELDS = [
  ['objective', 'Cel', 'Czego uczy ćwiczenie?'],
  ['organization', 'Organizacja', 'Ustawienie, podział na grupy, rotacje…'],
  ['description', 'Przebieg', 'Jak przebiega ćwiczenie, zasady…'],
  ['coachingPoints', 'Punkty trenerskie', 'Na co zwracać uwagę…'],
  ['variations', 'Warianty / progresje', 'Utrudnienia, ułatwienia…'],
];

export const emptyFrame = () => ({ items: [], lines: [], zones: [] });

export const isEmptyScene = (frames) => frames.length === 1 && !frames[0].items.length && !frames[0].lines.length && !frames[0].zones.length;

// Everything that "Zapisz" persists; compared to detect unsaved changes.
export const drillSignature = ({ frames, pitch, teamAColor, teamBColor, meta, name }) =>
  JSON.stringify([makeSceneKey(frames, pitch, teamAColor, teamBColor), meta, (name || '').trim()]);

export const makeSceneKey = (frames, pitch, a, b) => JSON.stringify({ frames, pitch, a, b });

// ASCII only: browsers may drop a download name containing diacritics and save as "download"
export const PL_MAP = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

export const safeFileName = (name) => (name.trim() || 'cwiczenie')
  .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => {
    const lower = PL_MAP[ch.toLowerCase()];
    return ch === ch.toLowerCase() ? lower : lower.toUpperCase();
  })
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'cwiczenie';

export function normalizeDrill(d = {}) {
  const rawFrames = Array.isArray(d.frames) && d.frames.length
    ? d.frames
    : [{ items: d.items || [], lines: d.lines || [], zones: d.zones || [] }];
  let maxId = 0;
  rawFrames.forEach(f => ['items', 'lines', 'zones'].forEach(k => (f[k] || []).forEach(o => {
    if (typeof o.id === 'number') maxId = Math.max(maxId, o.id);
  })));
  const frames = rawFrames.map(f => ({
    items: (f.items || []).filter(i => TYPE_LABELS[i.type]).map(i => (
      i.type === 'player' && i.label == null ? { ...i, label: String(i.number ?? '') } : i
    )),
    lines: (f.lines || []).map(o => (typeof o.id === 'number' ? o : { ...o, id: ++maxId })),
    zones: (f.zones || []).map(o => (typeof o.id === 'number' ? o : { ...o, id: ++maxId })),
  }));
  return {
    frames,
    pitch: { ...LEGACY_PITCH, ...(d.pitch || {}) },
    meta: { ...DEFAULT_META, ...(d.meta || {}) },
    teamAColor: d.teamAColor || '#1d4ed8',
    teamBColor: d.teamBColor || '#dc2626',
    nextId: maxId + 1,
  };
}

export const DRILL_FORMAT = 'model-gry-training-drill';

export const LIBRARY_FORMAT = 'model-gry-training-library';

export function toLibraryEntry(d, fallbackName) {
  if (!d || !(Array.isArray(d.frames) || Array.isArray(d.items))) return null;
  const n = normalizeDrill(d);
  const now = new Date().toISOString();
  return {
    id: typeof d.id === 'string' ? d.id : null,
    name: String(d.name || fallbackName || 'Ćwiczenie').trim(),
    createdAt: d.createdAt || now,
    updatedAt: d.updatedAt || now,
    version: 2,
    frames: n.frames, pitch: n.pitch, meta: n.meta, teamAColor: n.teamAColor, teamBColor: n.teamBColor,
  };
}

// Accepts a single-drill file or a whole-library file; returns library entries.
export function parseDrillFile(data, fileName) {
  const base = fileName.replace(/\.json$/i, '');
  if (data?.format === LIBRARY_FORMAT && Array.isArray(data.drills)) {
    return data.drills.map(d => toLibraryEntry(d, base)).filter(Boolean);
  }
  if (data?.format === DRILL_FORMAT) {
    const entry = toLibraryEntry(data, base);
    return entry ? [entry] : [];
  }
  return [];
}

export function wrapText(ctx, text, maxWidth) {
  const out = [];
  String(text).split('\n').forEach(par => {
    let line = '';
    par.split(/\s+/).forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; }
      else line = test;
    });
    out.push(line);
  });
  return out;
}

export function equipmentSummary(frames) {
  const byType = {};
  frames.forEach(f => f.items.forEach(i => {
    if (['player', 'text', 'step', 'coach'].includes(i.type)) return;
    (byType[i.type] ||= new Set()).add(i.id);
  }));
  return Object.entries(byType).map(([t, ids]) => `${TYPE_LABELS[t]} ×${ids.size}`).join(', ');
}
