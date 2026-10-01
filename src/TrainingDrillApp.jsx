import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { drawField, drawLine, drawZone } from './utils/draw.js';
import {
  isPointNearLine, isPointNearControlPoint, isPointNearLineEnd,
  isPointInZone, isPointNearPolygonVertex,
} from './utils/geometry.js';

// ── Pitch ────────────────────────────────────────────────────────
const FULL_W = 700;
const FULL_H = 1080;
const CROP_H = { full: 1080, half: 560, third: 387 };
const DEFAULT_PITCH = { type: 'full', orientation: 'vertical', width: 30, length: 40 };
const PITCH_TYPES = [
  { id: 'full',   label: 'Całe' },
  { id: 'half',   label: 'Połowa' },
  { id: 'third',  label: 'Tercja' },
  { id: 'custom', label: 'Własne' },
];

function getPitchSize(p) {
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

function renderPitchCanvas(p) {
  const { w, h } = getPitchSize(p);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  const horizontal = p.orientation === 'horizontal';

  if (p.type === 'custom') {
    ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c4a76e'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = '#a8916a'; ctx.font = '600 13px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${horizontal ? p.length : p.width} m`, w / 2, 10);
    ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${horizontal ? p.width : p.length} m`, 0, 0);
    ctx.restore();
    return out;
  }

  const full = document.createElement('canvas');
  full.width = FULL_W; full.height = FULL_H;
  drawField(full.getContext('2d'), '11v11');
  if (horizontal) {
    // portrait top (goal) ends up on the right
    ctx.translate(w, 0); ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(full, 0, 0);
  return out;
}

// ── Geometry ─────────────────────────────────────────────────────
const TWO_PI = Math.PI * 2;
const normAngle = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let measureContext = null;
const measureCtx = () => (measureContext ||= document.createElement('canvas').getContext('2d'));
const textFont = (item) => `bold ${Math.round(18 * (item.scale || 1))}px Outfit, Arial, sans-serif`;

const BOUNDS = {
  player: [18, 18], goal: [45, 28], 'mini-goal': [23, 14], cone: [10, 18], disc: [8, 8],
  pole: [6, 22], hurdle: [22, 6], hoop: [15, 15], ladder: [13, 60], mannequin: [8, 20],
  ball: [10, 10], step: [12, 12],
};

function getItemBounds(item) {
  const s = item.scale || 1;
  if (item.type === 'text') {
    const ctx = measureCtx();
    ctx.font = textFont(item);
    const w = ctx.measureText(item.text || ' ').width;
    return { hw: Math.max(10, w / 2 + 4), hh: Math.max(10, 13 * s) };
  }
  const [hw, hh] = BOUNDS[item.type] || [18, 18];
  return { hw: Math.max(10, hw * s), hh: Math.max(10, hh * s) };
}

function hitItem(x, y, item) {
  const r = item.rotation || 0;
  const dx = x - item.x, dy = y - item.y;
  const lx = dx * Math.cos(r) + dy * Math.sin(r);
  const ly = -dx * Math.sin(r) + dy * Math.cos(r);
  const { hw, hh } = getItemBounds(item);
  return Math.abs(lx) <= hw + 4 && Math.abs(ly) <= hh + 4;
}

function handlePos(item) {
  const r = item.rotation || 0;
  const d = getItemBounds(item).hh + 18;
  return { x: item.x + Math.sin(r) * d, y: item.y - Math.cos(r) * d };
}

const isNearHandle = (x, y, item) => {
  const p = handlePos(item);
  return Math.hypot(x - p.x, y - p.y) < 14;
};

function transformObj(kind, o, fn, dRot = 0) {
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

const translateObj = (kind, o, dx, dy) => transformObj(kind, o, (x, y) => [x + dx, y + dy]);

function transformFrame(f, fn, dRot) {
  return {
    items: f.items.map(o => transformObj('items', o, fn, dRot)),
    lines: f.lines.map(o => transformObj('lines', o, fn)),
    zones: f.zones.map(o => transformObj('zones', o, fn)),
  };
}

// Keeps content where it is if it fits; otherwise shifts it inside or scales it down to fit.
function fitFramesTo(frames, w, h, margin = 30) {
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

function zoneBBox(z) {
  if (z.type === 'rectangle') return [Math.min(z.x, z.x + z.width), Math.min(z.y, z.y + z.height), Math.max(z.x, z.x + z.width), Math.max(z.y, z.y + z.height)];
  if (z.type === 'circle') return [z.centerX - z.radius, z.centerY - z.radius, z.centerX + z.radius, z.centerY + z.radius];
  const xs = z.points.map(p => p.x), ys = z.points.map(p => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function objectsInRect(frame, r) {
  const x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1);
  const y0 = Math.min(r.y0, r.y1), y1 = Math.max(r.y0, r.y1);
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  return [
    ...frame.items.filter(i => inside(i.x, i.y)),
    ...frame.lines.filter(l => inside(l.startX, l.startY) && inside(l.endX, l.endY)),
    ...frame.zones.filter(z => { const b = zoneBBox(z); return inside(b[0], b[1]) && inside(b[2], b[3]); }),
  ].map(o => o.id);
}

function findObj(frame, id) {
  for (const kind of ['items', 'lines', 'zones']) {
    const obj = frame[kind].find(o => o.id === id);
    if (obj) return { kind, obj };
  }
  return null;
}

// ── Animation ────────────────────────────────────────────────────
function lerpObj(a, b, p) {
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

function interpolateFrames(frames, t) {
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

// ── Item draw functions ──────────────────────────────────────────
const glow = (ctx, selected) => { if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; } };

function drawGoal(ctx, item, selected) {
  const { x, y, rotation = 0, scale = 1, color = '#ffffff' } = item;
  const w = 90 * scale, h = 16 * scale, depth = 20 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.save(); ctx.globalAlpha *= 0.1; ctx.fillStyle = color;
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, -h / 2 - depth);
  ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.moveTo(-w / 2, -h / 2 - depth); ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.stroke(); ctx.restore();
}

function drawCone(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#f97316' } = item;
  const r = 10 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -r * 1.8); ctx.lineTo(-r, r * 0.6); ctx.lineTo(r, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.globalAlpha *= 0.75;
  ctx.beginPath(); ctx.ellipse(0, r * 0.6, r, r * 0.35, 0, 0, TWO_PI); ctx.fill(); ctx.restore();
  ctx.restore();
}

function drawDisc(ctx, item, selected) {
  const { x, y, scale = 1, color = '#f59e0b' } = item;
  const r = 7 * scale;
  ctx.save(); ctx.translate(x, y); glow(ctx, selected);
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#f5f5f5';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TWO_PI); ctx.fill();
  ctx.restore();
}

function drawPole(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#ef4444' } = item;
  const h = 36 * scale, r = 4 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.strokeStyle = color; ctx.lineWidth = r; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(0, -h / 2 + r * 2); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(0, -h / 2, r * 1.6, 0, TWO_PI); ctx.fill();
  ctx.restore();
}

function drawHurdle(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#2563eb' } = item;
  const w = 40 * scale, f = 6 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, 2.5 * scale);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -f); ctx.lineTo(-w / 2, f);
  ctx.moveTo(w / 2, -f); ctx.lineTo(w / 2, f);
  ctx.stroke(); ctx.restore();
}

function drawHoop(ctx, item, selected) {
  const { x, y, scale = 1, color = '#a855f7' } = item;
  ctx.save(); ctx.translate(x, y); glow(ctx, selected);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath(); ctx.arc(0, 0, 14 * scale, 0, TWO_PI); ctx.stroke();
  ctx.restore();
}

function drawLadder(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#ca8a04' } = item;
  const w = 24 * scale, h = 120 * scale, rungs = 8;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, 2.5 * scale);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2);
  ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
  for (let i = 0; i <= rungs; i++) {
    const yy = -h / 2 + (i * h) / rungs;
    ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy);
  }
  ctx.stroke(); ctx.restore();
}

function drawMannequin(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#facc15' } = item;
  const w = 14 * scale, h = 40 * scale, headR = 6 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); glow(ctx, selected);
  ctx.fillStyle = color; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 + headR * 2.2, w, h - headR * 2.2, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h / 2 + headR, headR, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, item, selected) {
  const { x, y, scale = 1, color = '#ffffff' } = item;
  const r = 10 * scale;
  ctx.save(); ctx.translate(x, y); glow(ctx, selected);
  ctx.fillStyle = color; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, TWO_PI); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TWO_PI - Math.PI / 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.18, 0, TWO_PI); ctx.fill();
  }
  ctx.restore();
}

function drawPlayerItem(ctx, item, selected) {
  const { x, y, scale = 1, color = '#1d4ed8', label = '1', rotation = 0 } = item;
  const r = 18 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(-r * 1.3, -r * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 1.3, -r * 0.8); ctx.stroke();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; ctx.strokeStyle = selected ? '#60a5fa' : '#ffffff'; ctx.lineWidth = selected ? 2.5 : 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.stroke();
  ctx.rotate(-rotation);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(9, Math.round(r * 0.7))}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(label), 0, 0);
  ctx.restore();
}

function drawStep(ctx, item, selected) {
  const { x, y, scale = 1, color = '#111827', label = '1' } = item;
  const r = 12 * scale;
  ctx.save(); ctx.translate(x, y); glow(ctx, selected);
  ctx.fillStyle = color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(r * 1.1)}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(label), 0, 1);
  ctx.restore();
}

function drawText(ctx, item, selected) {
  const { x, y, rotation = 0, color = '#111827', text = '' } = item;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.font = textFont(item); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = selected ? '#bfdbfe' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawItem(ctx, item, selected) {
  switch (item.type) {
    case 'goal':      drawGoal(ctx, item, selected); break;
    case 'mini-goal': drawGoal(ctx, { ...item, scale: (item.scale || 1) * 0.5 }, selected); break;
    case 'cone':      drawCone(ctx, item, selected); break;
    case 'disc':      drawDisc(ctx, item, selected); break;
    case 'pole':      drawPole(ctx, item, selected); break;
    case 'hurdle':    drawHurdle(ctx, item, selected); break;
    case 'hoop':      drawHoop(ctx, item, selected); break;
    case 'ladder':    drawLadder(ctx, item, selected); break;
    case 'mannequin': drawMannequin(ctx, item, selected); break;
    case 'ball':      drawBall(ctx, item, selected); break;
    case 'player':    drawPlayerItem(ctx, item, selected); break;
    case 'step':      drawStep(ctx, item, selected); break;
    case 'text':      drawText(ctx, item, selected); break;
  }
}

function drawRotationHandle(ctx, item) {
  const p = handlePos(item);
  ctx.save();
  ctx.strokeStyle = 'rgba(96,165,250,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(item.x, item.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3b82f6'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawSelectionBox(ctx, item) {
  const { hw, hh } = getItemBounds(item);
  ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation || 0);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
  ctx.strokeRect(-hw - 4, -hh - 4, (hw + 4) * 2, (hh + 4) * 2);
  ctx.restore();
}

function withAlpha(ctx, alpha, fn) {
  if (alpha == null) { fn(); return; }
  ctx.save(); ctx.globalAlpha = alpha; fn(); ctx.restore();
}

function renderScene(ctx, { pitchImg, frame, prevFrame = null, selectedIds = [], w, h }) {
  const sel = new Set(selectedIds);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(pitchImg, 0, 0, w, h);

  frame.zones.forEach(z => withAlpha(ctx, z._alpha, () => drawZone(ctx, z, sel.has(z.id))));

  if (prevFrame) {
    const prev = new Map(prevFrame.items.map(i => [i.id, i]));
    ctx.save();
    ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.globalAlpha = 0.55;
    frame.items.forEach(i => {
      const p = prev.get(i.id);
      if (!p || Math.hypot(p.x - i.x, p.y - i.y) < 4) return;
      ctx.strokeStyle = i.color || '#334155'; ctx.fillStyle = i.color || '#334155';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(i.x, i.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TWO_PI); ctx.fill();
    });
    ctx.restore();
  }

  frame.lines.forEach(l => withAlpha(ctx, l._alpha, () => drawLine(ctx, l, sel.has(l.id))));
  frame.items.forEach(i => withAlpha(ctx, i._alpha, () => drawItem(ctx, i, sel.has(i.id))));

  if (sel.size > 1) frame.items.forEach(i => { if (sel.has(i.id)) drawSelectionBox(ctx, i); });
  if (sel.size === 1) {
    const only = frame.items.find(i => sel.has(i.id));
    if (only) drawRotationHandle(ctx, only);
  }
}

// ── Constants ────────────────────────────────────────────────────
const EQUIPMENT_GROUPS = [
  { title: 'Zawodnicy', items: [
    { type: 'player', label: 'Zawodnik A', team: 'A', icon: '🔵' },
    { type: 'player', label: 'Zawodnik B', team: 'B', icon: '🔴' },
  ] },
  { title: 'Sprzęt', items: [
    { type: 'goal',      label: 'Bramka',      icon: '🥅', color: '#ffffff' },
    { type: 'mini-goal', label: 'Mini-bramka', icon: '🥅', color: '#ffffff' },
    { type: 'cone',      label: 'Stożek',      icon: '🔶', color: '#f97316' },
    { type: 'disc',      label: 'Talerzyk',    icon: '🟠', color: '#f59e0b' },
    { type: 'pole',      label: 'Tyczka',      icon: '📍', color: '#ef4444' },
    { type: 'hurdle',    label: 'Płotek',      icon: '🚧', color: '#2563eb' },
    { type: 'hoop',      label: 'Obręcz',      icon: '⭕', color: '#a855f7' },
    { type: 'ladder',    label: 'Drabinka',    icon: '🪜', color: '#ca8a04' },
    { type: 'mannequin', label: 'Manekin',     icon: '🟡', color: '#facc15' },
    { type: 'ball',      label: 'Piłka',       icon: '⚽', color: '#ffffff' },
  ] },
  { title: 'Opis', items: [
    { type: 'text', label: 'Tekst',            icon: '🔤', color: '#111827' },
    { type: 'step', label: 'Krok (①②③)',       icon: '①', color: '#111827' },
  ] },
];

const TYPE_LABELS = {
  player: 'Zawodnik', goal: 'Bramka', 'mini-goal': 'Mini-bramka', cone: 'Stożek', disc: 'Talerzyk',
  pole: 'Tyczka', hurdle: 'Płotek', hoop: 'Obręcz', ladder: 'Drabinka', mannequin: 'Manekin',
  ball: 'Piłka', text: 'Tekst', step: 'Krok',
};

const quickColorPalette = [
  { name: 'Niebieski', color: '#1F77B4' }, { name: 'Zielony', color: '#2CA02C' },
  { name: 'Turkusowy', color: '#17BECF' }, { name: 'Granatowy', color: '#003F5C' },
  { name: 'Czerwony', color: '#D62728' }, { name: 'Pomarańczowy', color: '#FF7F0E' },
  { name: 'Żółty', color: '#BCBD22' }, { name: 'Różowy', color: '#E377C2' },
  { name: 'Brązowy', color: '#8C564B' }, { name: 'Czarny', color: '#000000' },
  { name: 'Biały', color: '#FFFFFF' },
];

const LINE_TYPES = [
  ['arrow-solid', 'Prosta ciągła z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['arrow-dashed', 'Przerywana z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['arrow-wavy', 'Falowana z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 C8 5,12 17,16 11 C20 5,24 17,28 11 C30 8,31 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['double-arrow-solid', 'Podwójna z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="9" x2="32" y2="9" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="13" x2="32" y2="13" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  null,
  ['line-dashed', 'Przerywana bez grotów', <svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/></svg>],
  ['line-solid', 'Ciągła bez grotów', <svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2"/></svg>],
  null,
  ['curve-arrow-solid', 'Krzywa ciągła z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-arrow-dashed', 'Krzywa przerywana z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-arrow-wavy', 'Krzywa falowana z grotem', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 C9 3,13 13,18 7 C22 2,26 15,30 10 C31 9,31.5 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-line', 'Krzywa bez grotów', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 36 11" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
];

const CATEGORIES = ['Rozgrzewka', 'Technika', 'Rondo', 'Gra pozycyjna', 'Małe gry', 'Finalizacja', 'Motoryka', 'Gra', 'Inne'];

const DEFAULT_META = {
  category: '', duration: '', players: '', area: '',
  objective: '', organization: '', description: '', coachingPoints: '', variations: '',
};

const META_FIELDS = [
  ['objective', 'Cel', 'Czego uczy ćwiczenie?'],
  ['organization', 'Organizacja', 'Ustawienie, podział na grupy, rotacje…'],
  ['description', 'Przebieg', 'Jak przebiega ćwiczenie, zasady…'],
  ['coachingPoints', 'Punkty trenerskie', 'Na co zwracać uwagę…'],
  ['variations', 'Warianty / progresje', 'Utrudnienia, ułatwienia…'],
];

const emptyFrame = () => ({ items: [], lines: [], zones: [] });
const DRAFT_KEY = 'trainingDrillDraft';
const makeSceneKey = (frames, pitch, a, b) => JSON.stringify({ frames, pitch, a, b });
// ASCII only: browsers may drop a download name containing diacritics and save as "download"
const PL_MAP = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const safeFileName = (name) => (name.trim() || 'cwiczenie')
  .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => {
    const lower = PL_MAP[ch.toLowerCase()];
    return ch === ch.toLowerCase() ? lower : lower.toUpperCase();
  })
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'cwiczenie';

function normalizeDrill(d = {}) {
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
    pitch: { ...DEFAULT_PITCH, ...(d.pitch || {}) },
    meta: { ...DEFAULT_META, ...(d.meta || {}) },
    teamAColor: d.teamAColor || '#1d4ed8',
    teamBColor: d.teamBColor || '#dc2626',
    nextId: maxId + 1,
  };
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (d) return { ...normalizeDrill(d), name: d.name || '', drillId: d.drillId || null };
  } catch { /* ignore corrupt draft */ }
  return { ...normalizeDrill(), name: '', drillId: null };
}

const DRILL_FORMAT = 'model-gry-training-drill';
const LIBRARY_FORMAT = 'model-gry-training-library';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const downloadJson = (data, fileName) =>
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fileName);

// Built synchronously (not via async toBlob) so the click stays inside the user gesture and the
// browser keeps the file name; a blob URL avoids Chrome's size limit on data-URL downloads.
function downloadCanvas(canvas, fileName) {
  const bin = atob(canvas.toDataURL('image/png').split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  downloadBlob(new Blob([bytes], { type: 'image/png' }), fileName);
}

function toLibraryEntry(d, fallbackName) {
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
function parseDrillFile(data, fileName) {
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

function wrapText(ctx, text, maxWidth) {
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

function equipmentSummary(frames) {
  const byType = {};
  frames.forEach(f => f.items.forEach(i => {
    if (['player', 'text', 'step'].includes(i.type)) return;
    (byType[i.type] ||= new Set()).add(i.id);
  }));
  return Object.entries(byType).map(([t, ids]) => `${TYPE_LABELS[t]} ×${ids.size}`).join(', ');
}

// ── Small UI pieces ──────────────────────────────────────────────
function ColorQuickPicker({ value, onChange, isOpen, onToggle, title }) {
  const inputRef = useRef(null);
  return (
    <div className="flex items-center gap-1.5 relative" onClick={e => e.stopPropagation()}>
      <span className="text-sm text-slate-400">Kolor:</span>
      <input ref={inputRef} type="color" value={value} onChange={e => onChange(e.target.value)} className="hidden" />
      <button onClick={onToggle} title={title}
        className="w-7 h-7 rounded border-2 border-white/20 hover:border-white/40 transition-all"
        style={{ backgroundColor: value }} />
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-1.5 flex gap-1 shadow-xl z-50">
          {quickColorPalette.map(c => (
            <button key={c.color} onClick={() => { onChange(c.color); onToggle(); }}
              className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all"
              style={{ backgroundColor: c.color }} title={c.name} />
          ))}
          <button onClick={() => inputRef.current?.click()}
            className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
            RGB
          </button>
        </div>
      )}
    </div>
  );
}

const btn = 'px-2 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed';
const dangerBtn = 'flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all';
const sectionTitle = 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';

// ── Main component ───────────────────────────────────────────────
export default function TrainingDrillApp() {
  const [initial] = useState(loadDraft);

  const canvasRef = useRef(null);
  const canvasBoxRef = useRef(null);
  const lastTapRef = useRef(0);
  const importInputRef = useRef(null);
  const nextIdRef = useRef(initial.nextId);
  const clipboardRef = useRef([]);
  const histRef = useRef(null);
  if (!histRef.current) {
    histRef.current = { stack: [makeSceneKey(initial.frames, initial.pitch, initial.teamAColor, initial.teamBColor)], index: 0 };
  }
  const keyHandlerRef = useRef(null);

  // Scene
  const [frames, setFrames] = useState(initial.frames);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [pitch, setPitch] = useState(initial.pitch);
  const [meta, setMeta] = useState(initial.meta);
  const [teamAColor, setTeamAColor] = useState(initial.teamAColor);
  const [teamBColor, setTeamBColor] = useState(initial.teamBColor);

  // Selection / interaction
  const [selectedIds, setSelectedIds] = useState([]);
  const [drag, setDrag] = useState(null);
  const [colorPicker, setColorPicker] = useState(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  const [, setHistTick] = useState(0);

  // Drawing
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState('line');
  const [lineType, setLineType] = useState('arrow-solid');
  const [lineColor, setLineColor] = useState('#000000');
  const [currentLine, setCurrentLine] = useState(null);
  const [zoneType, setZoneType] = useState('rectangle');
  const [zoneColor, setZoneColor] = useState('#ff0000');
  const [zoneOpacity, setZoneOpacity] = useState(0.3);
  const [currentZone, setCurrentZone] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [openColorPalette, setOpenColorPalette] = useState(null);

  // Animation
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [draggedFrameIdx, setDraggedFrameIdx] = useState(null);
  const [dragOverFrameIdx, setDragOverFrameIdx] = useState(null);

  // Library
  const [drillName, setDrillName] = useState(initial.name);
  const [currentDrillId, setCurrentDrillId] = useState(initial.drillId);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [libraryMsg, setLibraryMsg] = useState(null);
  const [savedDrills, setSavedDrills] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trainingDrillLibrary')) || []; }
    catch { return []; }
  });

  const frame = frames[currentFrame] || frames[0];
  const pitchSize = useMemo(() => getPitchSize(pitch), [pitch]);
  const pitchImg = useMemo(() => renderPitchCanvas(pitch), [pitch]);
  const sceneKey = useMemo(() => makeSceneKey(frames, pitch, teamAColor, teamBColor), [frames, pitch, teamAColor, teamBColor]);
  const displayFrame = isPlaying ? interpolateFrames(frames, playhead) : frame;
  const single = selectedIds.length === 1 ? findObj(frame, selectedIds[0]) : null;
  const newId = () => nextIdRef.current++;

  // ── Frame updates ────────────────────────────────────────────────
  // scope: 'current' | 'from' (current and following frames) | 'all'
  const updateFrames = (scope, fn) => setFrames(fs => fs.map((f, i) => {
    const hit = scope === 'all' || (scope === 'from' ? i >= currentFrame : i === currentFrame);
    return hit ? fn(f) : f;
  }));
  const updateKind = (scope, kind, fn) => updateFrames(scope, f => ({ ...f, [kind]: fn(f[kind]) }));
  const patchObj = (scope, kind, id, patch) => updateKind(scope, kind, list => list.map(o => (o.id === id ? { ...o, ...patch } : o)));

  const clearInteraction = () => {
    setSelectedIds([]); setDrag(null); setColorPicker(null);
    setCurrentLine(null); setCurrentZone(null); setPolygonPoints([]);
  };

  // ── History (undo / redo) + draft autosave ───────────────────────
  const commitHistory = (key) => {
    const h = histRef.current;
    if (h.stack[h.index] === key) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(key);
    if (h.stack.length > 100) h.stack.shift();
    h.index = h.stack.length - 1;
    setHistTick(t => t + 1);
  };

  // record the pre-change state synchronously so undo never depends on the debounce
  const checkpoint = () => commitHistory(sceneKey);

  useEffect(() => {
    if (drag || isPlaying) return;
    const t = setTimeout(() => commitHistory(sceneKey), 250);
    return () => clearTimeout(t);
  }, [sceneKey, drag, isPlaying]);

  const draftRef = useRef(null);
  draftRef.current = { name: drillName, drillId: currentDrillId, frames, pitch, meta, teamAColor, teamBColor };
  const saveDraft = () => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draftRef.current)); }
    catch { /* storage full: draft is best-effort */ }
  };

  useEffect(() => {
    const t = setTimeout(saveDraft, 500);
    return () => clearTimeout(t);
  }, [frames, pitch, meta, teamAColor, teamBColor, drillName, currentDrillId]);

  // flush on tab switch (unmount) and page close, which the debounce would miss
  useEffect(() => {
    window.addEventListener('pagehide', saveDraft);
    return () => { window.removeEventListener('pagehide', saveDraft); saveDraft(); };
  }, []);

  const applyScene = (key) => {
    const s = JSON.parse(key);
    setFrames(s.frames); setPitch(s.pitch); setTeamAColor(s.a); setTeamBColor(s.b);
    setCurrentFrame(cf => Math.min(cf, s.frames.length - 1));
    clearInteraction();
  };

  const undo = () => {
    commitHistory(sceneKey);
    const h = histRef.current;
    if (h.index <= 0) return;
    h.index--;
    applyScene(h.stack[h.index]);
    setHistTick(t => t + 1);
  };

  const redo = () => {
    const h = histRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    applyScene(h.stack[h.index]);
    setHistTick(t => t + 1);
  };

  const canUndo = histRef.current.index > 0 || (histRef.current.index >= 0 && histRef.current.stack[histRef.current.index] !== sceneKey);
  const canRedo = histRef.current.index < histRef.current.stack.length - 1;

  // ── Canvas sizing ────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBoxSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const displayScale = boxSize.w > 0 ? Math.min(boxSize.w / pitchSize.w, boxSize.h / pitchSize.h) : 0;

  // ── Render ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prevFrame = !isPlaying && showPaths && currentFrame > 0 ? frames[currentFrame - 1] : null;
    renderScene(ctx, {
      pitchImg, frame: displayFrame, prevFrame,
      selectedIds: isPlaying ? [] : selectedIds, w: pitchSize.w, h: pitchSize.h,
    });

    if (currentZone) drawZone(ctx, currentZone, false);
    if (currentLine) drawLine(ctx, currentLine, false);

    if (polygonPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = zoneColor; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      polygonPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
      polygonPoints.forEach((p, i) => {
        ctx.fillStyle = i === 0 && polygonPoints.length >= 3 ? '#00ff00' : zoneColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TWO_PI); ctx.fill();
      });
      ctx.restore();
    }

    if (drag?.type === 'marquee') {
      ctx.save();
      ctx.fillStyle = 'rgba(59,130,246,0.08)'; ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
      const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  });

  // ── Animation playback ───────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    let raf;
    let last = performance.now();
    const end = frames.length - 1;
    const step = (now) => {
      const dt = now - last;
      last = now;
      setPlayhead(ph => {
        const n = ph + (dt * speed) / 1000;
        if (n < end) return n;
        return loop ? 0 : end;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, speed, loop, frames.length]);

  useEffect(() => {
    if (isPlaying && !loop && playhead >= frames.length - 1) {
      setIsPlaying(false);
      setCurrentFrame(frames.length - 1);
    }
  }, [isPlaying, loop, playhead, frames.length]);

  const play = () => {
    if (frames.length < 2) return;
    clearInteraction();
    setIsDrawingMode(false);
    setPlayhead(currentFrame < frames.length - 1 ? currentFrame : 0);
    setIsPlaying(true);
  };

  const stop = () => {
    setIsPlaying(false);
    setCurrentFrame(Math.min(Math.round(playhead), frames.length - 1));
  };

  const goToFrame = (i) => {
    if (isPlaying) setIsPlaying(false);
    clearInteraction();
    setCurrentFrame(i);
  };

  const addFrame = () => {
    checkpoint();
    const copy = JSON.parse(JSON.stringify(frame));
    setFrames(fs => [...fs.slice(0, currentFrame + 1), copy, ...fs.slice(currentFrame + 1)]);
    clearInteraction();
    setCurrentFrame(currentFrame + 1);
  };

  const deleteFrame = () => {
    checkpoint();
    if (frames.length <= 1) return;
    setFrames(fs => fs.filter((_, i) => i !== currentFrame));
    clearInteraction();
    setCurrentFrame(Math.max(0, Math.min(currentFrame, frames.length - 2)));
  };

  const reorderFrames = (from, to) => {
    if (from === to) return;
    checkpoint();
    setFrames(fs => {
      const next = [...fs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setCurrentFrame(cf => {
      if (cf === from) return to;
      if (from < cf && to >= cf) return cf - 1;
      if (from > cf && to <= cf) return cf + 1;
      return cf;
    });
  };

  // ── Pitch ────────────────────────────────────────────────────────
  const changePitch = (patch) => {
    checkpoint();
    const next = { ...pitch, ...patch };
    next.width = clamp(Number(next.width) || 5, 5, 120);
    next.length = clamp(Number(next.length) || 5, 5, 120);
    const oldSize = getPitchSize(pitch);
    const newSize = getPitchSize(next);
    let fs = frames;
    if (next.orientation !== pitch.orientation) {
      const toHorizontal = next.orientation === 'horizontal';
      const fn = toHorizontal ? (x, y) => [oldSize.h - y, x] : (x, y) => [y, oldSize.w - x];
      fs = fs.map(f => transformFrame(f, fn, toHorizontal ? Math.PI / 2 : -Math.PI / 2));
    }
    fs = fitFramesTo(fs, newSize.w, newSize.h);
    setPitch(next);
    setFrames(fs);
  };

  // ── Items ────────────────────────────────────────────────────────
  const nextLabel = (pred) => {
    let max = 0;
    frames.forEach(f => f.items.forEach(i => {
      if (!pred(i)) return;
      const n = parseInt(i.label, 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }));
    return String(max + 1);
  };

  const addItem = (eq) => {
    checkpoint();
    const id = newId();
    const item = {
      id, type: eq.type, scale: 1, rotation: 0,
      x: pitchSize.w / 2 + (Math.random() - 0.5) * 80,
      y: pitchSize.h / 2 + (Math.random() - 0.5) * 80,
      color: eq.type === 'player' ? (eq.team === 'A' ? teamAColor : teamBColor) : eq.color,
    };
    if (eq.type === 'player') { item.team = eq.team; item.label = nextLabel(i => i.type === 'player' && i.team === eq.team); }
    if (eq.type === 'step') item.label = nextLabel(i => i.type === 'step');
    if (eq.type === 'text') item.text = 'Tekst';
    updateKind('from', 'items', list => [...list, item]);
    setIsDrawingMode(false);
    clearInteraction();
    setSelectedIds([id]);
  };

  const deleteSelection = () => {
    if (!selectedIds.length) return;
    checkpoint();
    const ids = new Set(selectedIds);
    updateFrames('from', f => ({
      items: f.items.filter(o => !ids.has(o.id)),
      lines: f.lines.filter(o => !ids.has(o.id)),
      zones: f.zones.filter(o => !ids.has(o.id)),
    }));
    setSelectedIds([]);
    setColorPicker(null);
  };

  const selectionObjects = () => selectedIds.map(id => findObj(frame, id)).filter(Boolean);

  const pasteObjects = (entries) => {
    if (!entries.length) return [];
    checkpoint();
    const placed = entries.map(({ kind, obj }) => ({ kind, obj: { ...translateObj(kind, obj, 20, 20), id: newId() } }));
    const pick = (kind) => placed.filter(p => p.kind === kind).map(p => p.obj);
    updateFrames('current', f => ({ ...f, lines: [...f.lines, ...pick('lines')], zones: [...f.zones, ...pick('zones')] }));
    if (pick('items').length) updateKind('from', 'items', list => [...list, ...pick('items')]);
    setSelectedIds(placed.map(p => p.obj.id));
    return placed;
  };

  const copySelection = () => { clipboardRef.current = selectionObjects(); };
  const paste = () => { clipboardRef.current = pasteObjects(clipboardRef.current); };
  const duplicateSelection = () => { pasteObjects(selectionObjects()); };

  // ── Coords & hit tests ───────────────────────────────────────────
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e.changedTouches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
      screenX: src.clientX,
      screenY: src.clientY,
    };
  };

  const hitAny = (x, y) => {
    for (let i = frame.items.length - 1; i >= 0; i--) if (hitItem(x, y, frame.items[i])) return frame.items[i];
    for (let i = frame.lines.length - 1; i >= 0; i--) if (isPointNearLine(x, y, frame.lines[i])) return frame.lines[i];
    for (let i = frame.zones.length - 1; i >= 0; i--) if (isPointInZone(x, y, frame.zones[i])) return frame.zones[i];
    return null;
  };

  // ── Pointer handlers ─────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (isPlaying) return;
    checkpoint();
    const { x, y } = getCoords(e);
    setOpenColorPalette(null);

    if (isDrawingMode && drawingTool === 'line') {
      setCurrentLine({ id: 0, startX: x, startY: y, endX: x, endY: y, type: lineType, color: lineColor });
      return;
    }
    if (isDrawingMode && drawingTool === 'zone') {
      if (zoneType === 'polygon') {
        if (polygonPoints.length >= 3 && Math.hypot(x - polygonPoints[0].x, y - polygonPoints[0].y) < 12) {
          const zone = { id: newId(), type: 'polygon', points: polygonPoints, color: zoneColor, opacity: zoneOpacity };
          updateKind('current', 'zones', list => [...list, zone]);
          setPolygonPoints([]);
        } else {
          setPolygonPoints(prev => [...prev, { x, y }]);
        }
        return;
      }
      setCurrentZone(zoneType === 'rectangle'
        ? { type: 'rectangle', x, y, width: 0, height: 0, color: zoneColor, opacity: zoneOpacity }
        : { type: 'circle', centerX: x, centerY: y, radius: 0, color: zoneColor, opacity: zoneOpacity });
      return;
    }

    if (single?.kind === 'items' && isNearHandle(x, y, single.obj)) {
      setDrag({ type: 'rotate', id: single.obj.id });
      return;
    }
    if (single?.kind === 'lines') {
      const end = isPointNearLineEnd(x, y, single.obj);
      if (end) { setDrag({ type: 'line-end', id: single.obj.id, end }); return; }
      if (isPointNearControlPoint(x, y, single.obj)) { setDrag({ type: 'control', id: single.obj.id }); return; }
    }
    if (single?.kind === 'zones') {
      const vi = isPointNearPolygonVertex(x, y, single.obj);
      if (vi !== null) { setDrag({ type: 'vertex', id: single.obj.id, index: vi }); return; }
    }

    setColorPicker(null);
    const hit = hitAny(x, y);
    if (!hit) {
      if (!e.shiftKey) setSelectedIds([]);
      setDrag({ type: 'marquee', x0: x, y0: y, x1: x, y1: y, additive: e.shiftKey });
      return;
    }
    if (e.shiftKey) {
      setSelectedIds(ids => (ids.includes(hit.id) ? ids.filter(i => i !== hit.id) : [...ids, hit.id]));
      return;
    }
    const ids = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
    setSelectedIds(ids);
    const origin = {};
    ids.forEach(id => { const f = findObj(frame, id); if (f) origin[id] = f; });
    setDrag({ type: 'move', start: { x, y }, origin });
  };

  const handlePointerMove = (e) => {
    if (isPlaying) return;
    if (!currentLine && !currentZone && !drag) return;
    const { x, y } = getCoords(e);

    if (currentLine) { setCurrentLine(l => ({ ...l, endX: x, endY: y })); return; }
    if (currentZone) {
      setCurrentZone(z => (z.type === 'rectangle'
        ? { ...z, width: x - z.x, height: y - z.y }
        : { ...z, radius: Math.hypot(x - z.centerX, y - z.centerY) }));
      return;
    }

    switch (drag.type) {
      case 'rotate':
        updateKind('current', 'items', list => list.map(i => (
          i.id === drag.id ? { ...i, rotation: normAngle(Math.atan2(x - i.x, -(y - i.y))) } : i
        )));
        break;
      case 'line-end':
        patchObj('current', 'lines', drag.id, drag.end === 'start' ? { startX: x, startY: y } : { endX: x, endY: y });
        break;
      case 'control':
        patchObj('current', 'lines', drag.id, { controlX: x, controlY: y });
        break;
      case 'vertex':
        updateKind('current', 'zones', list => list.map(z => (
          z.id === drag.id ? { ...z, points: z.points.map((p, i) => (i === drag.index ? { x, y } : p)) } : z
        )));
        break;
      case 'move': {
        const dx = x - drag.start.x, dy = y - drag.start.y;
        const move = (kind) => (o) => {
          const orig = drag.origin[o.id];
          if (!orig) return o;
          const moved = translateObj(kind, orig.obj, dx, dy);
          return kind === 'items'
            ? { ...moved, x: clamp(moved.x, 0, pitchSize.w), y: clamp(moved.y, 0, pitchSize.h) }
            : moved;
        };
        updateFrames('current', f => ({
          items: f.items.map(move('items')), lines: f.lines.map(move('lines')), zones: f.zones.map(move('zones')),
        }));
        break;
      }
      case 'marquee':
        setDrag(d => ({ ...d, x1: x, y1: y }));
        break;
    }
  };

  const handlePointerUp = () => {
    if (currentLine) {
      if (Math.hypot(currentLine.endX - currentLine.startX, currentLine.endY - currentLine.startY) > 10) {
        const line = { ...currentLine, id: newId() };
        updateKind('current', 'lines', list => [...list, line]);
      }
      setCurrentLine(null);
      return;
    }
    if (currentZone) {
      const ok = currentZone.type === 'rectangle'
        ? Math.abs(currentZone.width) > 20 && Math.abs(currentZone.height) > 20
        : currentZone.radius > 10;
      if (ok) {
        const zone = transformObj('zones', { ...currentZone, id: newId() }, (x, y) => [x, y]);
        updateKind('current', 'zones', list => [...list, zone]);
      }
      setCurrentZone(null);
      return;
    }
    if (drag?.type === 'marquee') {
      const ids = objectsInRect(frame, drag);
      setSelectedIds(prev => (drag.additive ? [...new Set([...prev, ...ids])] : ids));
    }
    setDrag(null);
  };

  const handleDoubleClick = (e) => {
    if (isPlaying || isDrawingMode) return;
    const { x, y, screenX, screenY } = getCoords(e);
    const hit = frame.items.slice().reverse().find(i => hitItem(x, y, i));
    if (hit) { setSelectedIds([hit.id]); setColorPicker({ id: hit.id, screenX, screenY }); }
  };

  const handleTouchStart = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches.length === 1) {
      lastTapRef.current = 0;
      handleDoubleClick(e);
      return;
    }
    lastTapRef.current = now;
    handlePointerDown(e);
  };

  // ── Keyboard ─────────────────────────────────────────────────────
  keyHandlerRef.current = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (isPlaying) return;
    if (mod && k === 'c') { copySelection(); return; }
    if (mod && k === 'v') { e.preventDefault(); paste(); return; }
    if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (mod && k === 'a') {
      e.preventDefault();
      setSelectedIds([...frame.items, ...frame.lines, ...frame.zones].map(o => o.id));
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); return; }
    if (e.key === 'Escape') { clearInteraction(); setIsDrawingMode(false); setShowMeta(false); }
  };

  useEffect(() => {
    const handler = (e) => keyHandlerRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const close = () => setOpenColorPalette(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ── Export PNG / card ────────────────────────────────────────────
  const renderSceneCanvas = (scale = 2) => {
    const c = document.createElement('canvas');
    c.width = pitchSize.w * scale; c.height = pitchSize.h * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    renderScene(ctx, { pitchImg, frame, w: pitchSize.w, h: pitchSize.h });
    return c;
  };

  const frameSuffix = frames.length > 1 ? `_klatka${currentFrame + 1}` : '';

  const exportPng = () => downloadCanvas(renderSceneCanvas(), `${safeFileName(drillName)}${frameSuffix}.png`);

  const exportCard = () => {
    const S = 2, CW = 1000, PAD = 40, TEXT_W = CW - PAD * 2;
    const scene = renderSceneCanvas(S);
    const imgScale = Math.min(TEXT_W / pitchSize.w, 900 / pitchSize.h, 1.6);
    const imgW = pitchSize.w * imgScale, imgH = pitchSize.h * imgScale;

    const area = meta.area || (pitch.type === 'custom' ? `${pitch.width}×${pitch.length} m` : '');
    const info = [
      meta.category,
      meta.duration && `${meta.duration} min`,
      meta.players && `Zawodnicy: ${meta.players}`,
      area && `Pole: ${area}`,
    ].filter(Boolean).join('   ·   ');
    const sections = [
      ...META_FIELDS.map(([key, label]) => [label, meta[key]]),
      ['Sprzęt', equipmentSummary(frames)],
    ].filter(([, t]) => t && String(t).trim());

    const m = measureCtx();
    const BODY = '16px Arial, sans-serif';
    m.font = BODY;
    const wrapped = sections.map(([title, text]) => [title, wrapText(m, text, TEXT_W)]);
    const HEADER = info ? 96 : 72;
    const textH = wrapped.reduce((sum, [, lines]) => sum + 30 + lines.length * 22 + 14, 0);
    const CH = HEADER + imgH + 24 + textH + PAD;

    const c = document.createElement('canvas');
    c.width = CW * S; c.height = CH * S;
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, 0, CW, 6);

    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText(drillName.trim() || 'Ćwiczenie', PAD, 50);
    if (info) { ctx.fillStyle = '#475569'; ctx.font = '16px Arial, sans-serif'; ctx.fillText(info, PAD, 80); }

    ctx.drawImage(scene, (CW - imgW) / 2, HEADER, imgW, imgH);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.strokeRect((CW - imgW) / 2, HEADER, imgW, imgH);

    let y = HEADER + imgH + 24;
    wrapped.forEach(([title, lines]) => {
      y += 22;
      ctx.fillStyle = '#1d4ed8'; ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(title.toUpperCase(), PAD, y);
      y += 8;
      ctx.fillStyle = '#1e293b'; ctx.font = BODY;
      lines.forEach(line => { y += 22; ctx.fillText(line, PAD, y); });
      y += 14;
    });

    downloadCanvas(c, `${safeFileName(drillName)}_karta${frameSuffix}.png`);
  };

  // ── Library ──────────────────────────────────────────────────────
  const flashTimerRef = useRef(null);
  const flash = (text, tone = 'ok') => {
    setLibraryMsg({ text, tone });
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setLibraryMsg(null), 5000);
  };

  const persistLibrary = (list) => {
    try {
      localStorage.setItem('trainingDrillLibrary', JSON.stringify(list));
    } catch {
      flash('Brak miejsca w pamięci przeglądarki', 'warn');
      return false;
    }
    setSavedDrills(list);
    return true;
  };

  const snapshot = () => ({ version: 2, frames, pitch, meta, teamAColor, teamBColor });

  const applyDrill = (d) => {
    const n = normalizeDrill(d);
    setIsPlaying(false);
    setFrames(n.frames); setCurrentFrame(0); setPitch(n.pitch); setMeta(n.meta);
    setTeamAColor(n.teamAColor); setTeamBColor(n.teamBColor);
    nextIdRef.current = n.nextId;
    clearInteraction();
    histRef.current = { stack: [makeSceneKey(n.frames, n.pitch, n.teamAColor, n.teamBColor)], index: 0 };
    setHistTick(t => t + 1);
  };

  const saveDrill = (asNew = false) => {
    let name = drillName.trim() || `Ćwiczenie ${savedDrills.length + 1}`;
    if (asNew && savedDrills.some(d => d.id === currentDrillId && d.name === name)) name += ' (kopia)';
    const now = new Date().toISOString();
    if (currentDrillId && !asNew && savedDrills.some(d => d.id === currentDrillId)) {
      if (!persistLibrary(savedDrills.map(d => (d.id === currentDrillId ? { id: d.id, createdAt: d.createdAt, ...snapshot(), name, updatedAt: now } : d)))) return;
    } else {
      const id = `drill-${Date.now()}`;
      if (!persistLibrary([{ id, name, createdAt: now, updatedAt: now, ...snapshot() }, ...savedDrills])) return;
      setCurrentDrillId(id);
    }
    setDrillName(name);
    flash('Zapisano');
  };

  const loadDrill = (d) => {
    applyDrill(d);
    setCurrentDrillId(d.id);
    setDrillName(d.name);
    setShowLibrary(false);
  };

  const deleteDrill = (id) => {
    if (!window.confirm('Usunąć to ćwiczenie z biblioteki?')) return;
    persistLibrary(savedDrills.filter(d => d.id !== id));
    if (id === currentDrillId) setCurrentDrillId(null);
  };

  const hasContent = frames.length > 1 || frame.items.length || frame.lines.length || frame.zones.length;

  const newDrill = () => {
    if (hasContent && !window.confirm('Rozpocząć nowe ćwiczenie? Niezapisane zmiany zostaną utracone.')) return;
    applyDrill({});
    setCurrentDrillId(null);
    setDrillName('');
  };

  const exportDrill = () => {
    const data = { format: DRILL_FORMAT, name: drillName.trim() || 'cwiczenie', ...snapshot() };
    downloadJson(data, `${safeFileName(drillName)}.json`);
  };

  const exportLibrary = () => {
    if (!savedDrills.length) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(
      { format: LIBRARY_FORMAT, version: 2, exportedAt: new Date().toISOString(), drills: savedDrills },
      `biblioteka_cwiczen_${date}.json`,
    );
  };

  const importFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;

    const incoming = [];
    let badFiles = 0;
    await Promise.all(files.map(async (file) => {
      try {
        const drills = parseDrillFile(JSON.parse(await file.text()), file.name);
        if (!drills.length) throw new Error();
        incoming.push(...drills);
      } catch {
        badFiles++;
      }
    }));

    let skipped = 0;
    const added = [];
    incoming.forEach((d, i) => {
      const known = [...added, ...savedDrills];
      if (d.id && known.some(x => x.id === d.id && x.updatedAt === d.updatedAt)) { skipped++; return; }
      const idTaken = !d.id || known.some(x => x.id === d.id);
      added.push({ ...d, id: idTaken ? `drill-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}` : d.id });
    });
    const list = [...added, ...savedDrills];

    const parts = [`Zaimportowano: ${added.length}`];
    if (skipped) parts.push(`pominięte duplikaty: ${skipped}`);
    if (badFiles) parts.push(`błędne pliki: ${badFiles}`);
    if (added.length && !persistLibrary(list)) parts.push('brak miejsca w pamięci przeglądarki');
    flash(parts.join(' · '), badFiles ? 'warn' : 'ok');

    if (added.length === 1) loadDrill(added[0]);
    else if (added.length > 1) setShowLibrary(true);
  };

  const clearFrame = () => {
    checkpoint();
    if (!window.confirm('Wyczyścić bieżącą klatkę?')) return;
    updateFrames('current', () => emptyFrame());
    clearInteraction();
  };

  const colorPickerItem = colorPicker ? frame.items.find(i => i.id === colorPicker.id) : null;

  // ── UI ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden flex-col relative">

      {/* ── Drawing toolbar ── */}
      {isDrawingMode && (
        <div className="flex-shrink-0 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 px-4 py-2 overflow-x-auto relative z-40">
          <div className="min-w-max flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium">Narzędzie:</span>
              <button onClick={() => { setDrawingTool('line'); setCurrentZone(null); setPolygonPoints([]); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${drawingTool === 'line' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-slate-300'}`}>
                📏 Linie
              </button>
              <button onClick={() => { setDrawingTool('zone'); setCurrentLine(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${drawingTool === 'zone' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-slate-300'}`}>
                🔷 Strefy
              </button>
            </div>

            {drawingTool === 'line' && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-sm text-slate-400 font-medium mr-1">Typ:</span>
                {LINE_TYPES.map((t, idx) => {
                  if (!t) return <div key={idx} className="w-px h-7 bg-white/15 mx-1" />;
                  const [type, title, icon] = t;
                  return (
                    <button key={type} onClick={() => setLineType(type)} title={title}
                      className={`px-2 py-1.5 rounded transition-all ${lineType === type ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'}`}>
                      {icon}
                    </button>
                  );
                })}
                <div className="w-px h-7 bg-white/15 mx-1" />
                <ColorQuickPicker value={lineColor} onChange={setLineColor} title="Kolor linii"
                  isOpen={openColorPalette === 'line'}
                  onToggle={() => setOpenColorPalette(p => (p === 'line' ? null : 'line'))} />
              </div>
            )}

            {drawingTool === 'zone' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 font-medium">Typ:</span>
                {[
                  ['rectangle', 'Prostokąt', <svg width="40" height="22" viewBox="0 0 40 22"><rect x="4" y="3" width="32" height="16" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                  ['circle', 'Koło', <svg width="40" height="22" viewBox="0 0 40 22"><circle cx="20" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                  ['polygon', 'Wielokąt', <svg width="40" height="22" viewBox="0 0 40 22"><path d="M20 3 L35 9 L30 19 L10 19 L5 9 Z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                ].map(([type, title, icon]) => (
                  <button key={type} onClick={() => { setZoneType(type); setPolygonPoints([]); }} title={title}
                    className={`p-1.5 rounded-lg transition-all ${zoneType === type ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'}`}>
                    {icon}
                  </button>
                ))}
                <div className="w-px h-7 bg-white/15 mx-1" />
                <ColorQuickPicker value={zoneColor} onChange={setZoneColor} title="Kolor strefy"
                  isOpen={openColorPalette === 'zone'}
                  onToggle={() => setOpenColorPalette(p => (p === 'zone' ? null : 'zone'))} />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">Przezroczystość:</span>
                  <input type="range" min={0.05} max={1} step={0.05} value={zoneOpacity}
                    onChange={e => setZoneOpacity(parseFloat(e.target.value))} className="w-20" />
                  <span className="text-xs text-slate-400 w-8">{Math.round(zoneOpacity * 100)}%</span>
                </div>
                {zoneType === 'polygon' && (
                  <span className="text-xs text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                    💡 Klikaj punkty, zamknij klikając zielony punkt.
                    {polygonPoints.length > 0 && ` (${polygonPoints.length} pkt)`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Floating color picker (double click) ── */}
        {colorPicker && colorPickerItem && (
          <div className="fixed z-50 bg-slate-800 border border-white/20 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
            style={{ left: colorPicker.screenX, top: colorPicker.screenY, transform: 'translate(-50%,12px)', minWidth: 150 }}>
            <p className="text-xs font-semibold text-slate-300">Kolor elementu</p>
            <input type="color" value={colorPickerItem.color || '#ffffff'}
              onChange={e => patchObj('all', 'items', colorPicker.id, { color: e.target.value })}
              className="w-full h-9 rounded cursor-pointer border border-white/20 bg-transparent" />
            <button onClick={() => setColorPicker(null)}
              className="text-xs text-slate-400 hover:text-white py-1 hover:bg-white/10 rounded transition-all">
              Zamknij
            </button>
          </div>
        )}

        {/* ── Left panel ── */}
        <div className="w-56 flex-shrink-0 bg-slate-950/80 border-r border-white/10 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-white/10">
            <p className={sectionTitle}>Ćwiczenie</p>
            <input type="text" value={drillName} onChange={e => setDrillName(e.target.value)}
              placeholder="Nazwa ćwiczenia"
              className="w-full px-2 py-1 mb-2 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-slate-500" />
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => saveDrill(false)}
                className="px-2 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all">
                💾 Zapisz
              </button>
              <button onClick={() => saveDrill(true)} disabled={!currentDrillId} className={btn}>Zapisz jako…</button>
              <button onClick={() => setShowLibrary(s => !s)}
                className={showLibrary ? 'px-2 py-1.5 rounded text-xs bg-blue-600 text-white' : btn}>
                📂 Wczytaj ({savedDrills.length})
              </button>
              <button onClick={newDrill} className={btn}>＋ Nowe</button>
              <button onClick={() => setShowMeta(true)} className={`${btn} col-span-2`}>📝 Opis ćwiczenia</button>
              <button onClick={exportDrill} className={btn} title="Zapisz bieżące ćwiczenie do pliku .json">⬇ Eksport</button>
              <button onClick={() => importInputRef.current?.click()} className={btn}
                title="Wczytaj jeden lub wiele plików .json (ćwiczenia lub całe biblioteki)">
                ⬆ Import
              </button>
              <input ref={importInputRef} type="file" accept=".json,application/json" multiple onChange={importFiles} className="hidden" />
            </div>
            {libraryMsg && (
              <p className={`text-xs mt-2 ${libraryMsg.tone === 'warn' ? 'text-amber-300' : 'text-emerald-300'}`}>{libraryMsg.text}</p>
            )}

            {showLibrary && (
              <div className="mt-2 flex flex-col gap-1 max-h-60 overflow-y-auto">
                {savedDrills.length > 0 && (
                  <button onClick={exportLibrary} className={`${btn} mb-1`} title="Wszystkie ćwiczenia w jednym pliku .json">
                    ⬇ Eksportuj całą bibliotekę ({savedDrills.length})
                  </button>
                )}
                {savedDrills.length === 0 && <p className="text-xs text-slate-500">Brak zapisanych ćwiczeń.</p>}
                {savedDrills.map(d => (
                  <div key={d.id}
                    className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm ${d.id === currentDrillId ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'bg-white/5 hover:bg-white/10'}`}>
                    <button onClick={() => loadDrill(d)} className="flex-1 text-left min-w-0">
                      <p className="text-slate-200 truncate">{d.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {[d.meta?.category, new Date(d.updatedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    <button onClick={() => deleteDrill(d.id)} title="Usuń" className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-b border-white/10">
            <p className={sectionTitle}>Tryb</p>
            <div className="flex gap-1">
              <button onClick={() => { setIsDrawingMode(false); setCurrentLine(null); setCurrentZone(null); setPolygonPoints([]); }}
                className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all ${!isDrawingMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                ↖ Zaznacz
              </button>
              <button onClick={() => { if (isPlaying) stop(); setIsDrawingMode(true); setSelectedIds([]); }}
                className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all ${isDrawingMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                ✏️ Rysuj
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-white/10">
            <p className={sectionTitle}>Boisko</p>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {PITCH_TYPES.map(t => (
                <button key={t.id} onClick={() => changePitch({ type: t.id })}
                  className={`px-1 py-1.5 rounded text-[11px] transition-all ${pitch.type === t.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[['vertical', '↕ Pionowo'], ['horizontal', '↔ Poziomo']].map(([o, l]) => (
                <button key={o} onClick={() => changePitch({ orientation: o })}
                  className={`px-2 py-1.5 rounded text-xs transition-all ${pitch.orientation === o ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                  {l}
                </button>
              ))}
            </div>
            {pitch.type === 'custom' && (
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                {[['width', 'Szer.'], ['length', 'Dł.']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1">
                    {label}
                    <input key={`${key}-${pitch[key]}`} type="number" min={5} max={120} defaultValue={pitch[key]}
                      onBlur={e => changePitch({ [key]: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="w-12 px-1 py-0.5 bg-white/10 border border-white/20 rounded text-white" />
                  </label>
                ))}
                <span>m</span>
              </div>
            )}
          </div>

          <div className="p-3 border-b border-white/10">
            <p className={sectionTitle}>Kolory drużyn</p>
            <div className="flex flex-col gap-2">
              {[['A', teamAColor, setTeamAColor], ['B', teamBColor, setTeamBColor]].map(([team, color, setColor]) => (
                <div key={team} className="flex items-center gap-2">
                  <input type="color" value={color}
                    onChange={e => {
                      const c = e.target.value;
                      setColor(c);
                      updateKind('all', 'items', list => list.map(i => (i.type === 'player' && i.team === team ? { ...i, color: c } : i)));
                    }}
                    className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
                  <span className="text-sm text-slate-300">Drużyna {team}</span>
                </div>
              ))}
            </div>
          </div>

          {EQUIPMENT_GROUPS.map(group => (
            <div key={group.title} className="p-3 border-b border-white/10">
              <p className={sectionTitle}>{group.title}</p>
              <div className="flex flex-col gap-1">
                {group.items.map(eq => (
                  <button key={eq.label} onClick={() => addItem(eq)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-slate-200 bg-white/5 hover:bg-white/15 transition-all text-left active:scale-95">
                    <span className="text-base w-5 text-center">{eq.icon}</span>
                    <span>{eq.label}</span>
                    <Plus size={12} className="ml-auto text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Center: actions + canvas + timeline ── */}
        <div className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden min-w-0">
          <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto">
            <button onClick={undo} disabled={!canUndo} className={btn} title="Cofnij (Ctrl+Z)">↶ Cofnij</button>
            <button onClick={redo} disabled={!canRedo} className={btn} title="Ponów (Ctrl+Y)">↷ Ponów</button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={copySelection} disabled={!selectedIds.length} className={btn} title="Kopiuj (Ctrl+C)">Kopiuj</button>
            <button onClick={paste} disabled={isPlaying} className={btn} title="Wklej (Ctrl+V)">Wklej</button>
            <button onClick={duplicateSelection} disabled={!selectedIds.length} className={btn} title="Duplikuj (Ctrl+D)">⧉ Duplikuj</button>
            <button onClick={deleteSelection} disabled={!selectedIds.length} className={btn} title="Usuń (Delete)">🗑 Usuń</button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={exportPng} className={btn} title="Zapisz obraz boiska">🖼 PNG</button>
            <button onClick={exportCard} className={btn} title="Obraz z opisem ćwiczenia">📄 Karta PNG</button>
          </div>

          <div ref={canvasBoxRef} className="flex-1 min-h-0 m-4 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={pitchSize.w}
              height={pitchSize.h}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="rounded-2xl shadow-2xl"
              style={{
                display: 'block', touchAction: 'none',
                width: displayScale ? pitchSize.w * displayScale : undefined,
                height: displayScale ? pitchSize.h * displayScale : undefined,
                cursor: isDrawingMode ? 'crosshair' : 'default',
              }}
            />
          </div>

          {/* Timeline */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-slate-950/60 overflow-x-auto">
            <button onClick={isPlaying ? stop : play} disabled={frames.length < 2}
              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={frames.length < 2 ? 'Dodaj co najmniej 2 klatki' : ''}>
              {isPlaying ? '⏸ Stop' : '▶ Odtwórz'}
            </button>
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded text-xs text-white px-1 py-1">
              {[0.5, 1, 1.5, 2].map(s => <option key={s} value={s} className="bg-slate-800">{s}×</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
              <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> Pętla
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
              <input type="checkbox" checked={showPaths} onChange={e => setShowPaths(e.target.checked)} /> Ścieżki
            </label>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <span className="text-xs text-slate-400">Klatki:</span>
            {frames.map((_, i) => {
              const active = isPlaying ? Math.floor(playhead) === i : currentFrame === i;
              return (
                <button key={i}
                  draggable
                  onDragStart={() => setDraggedFrameIdx(i)}
                  onDragOver={e => { e.preventDefault(); setDragOverFrameIdx(i); }}
                  onDragLeave={() => setDragOverFrameIdx(null)}
                  onDrop={e => { e.preventDefault(); if (draggedFrameIdx !== null) reorderFrames(draggedFrameIdx, i); setDraggedFrameIdx(null); setDragOverFrameIdx(null); }}
                  onDragEnd={() => { setDraggedFrameIdx(null); setDragOverFrameIdx(null); }}
                  onClick={() => goToFrame(i)}
                  className={`w-8 h-8 rounded text-sm font-semibold transition-all cursor-grab active:cursor-grabbing ${
                    active ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  } ${dragOverFrameIdx === i && draggedFrameIdx !== i ? 'ring-2 ring-yellow-400' : ''} ${draggedFrameIdx === i ? 'opacity-40' : ''}`}>
                  {i + 1}
                </button>
              );
            })}
            <button onClick={addFrame} disabled={isPlaying} className={btn} title="Dodaj klatkę (kopia bieżącej)">＋ Klatka</button>
            <button onClick={deleteFrame} disabled={isPlaying || frames.length <= 1} className={btn} title="Usuń bieżącą klatkę">− Klatka</button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-52 flex-shrink-0 bg-slate-950/80 border-l border-white/10 flex flex-col p-3 gap-3 overflow-y-auto">
          <p className={sectionTitle}>Zaznaczony</p>

          {selectedIds.length > 1 ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-medium text-white">Zaznaczono: {selectedIds.length}</p>
                <p className="text-xs text-slate-400">Przeciągnij dowolny, aby przesunąć grupę</p>
              </div>
              <button onClick={duplicateSelection} className={`${btn} py-2 text-sm`}>⧉ Duplikuj grupę</button>
              <button onClick={deleteSelection} className={dangerBtn}><Trash2 size={14} /> Usuń zaznaczone</button>
            </div>
          ) : single?.kind === 'lines' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2"><p className="text-sm font-medium text-white">Linia</p></div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Typ</p>
                <select value={single.obj.type}
                  onChange={e => patchObj('all', 'lines', single.obj.id, { type: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded text-sm text-white px-1 py-1">
                  {LINE_TYPES.filter(Boolean).map(([type, title]) => <option key={type} value={type} className="bg-slate-800">{title}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={single.obj.color || '#000000'}
                  onChange={e => patchObj('all', 'lines', single.obj.id, { color: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>
              <button onClick={deleteSelection} className={dangerBtn}><Trash2 size={14} /> Usuń linię</button>
            </div>
          ) : single?.kind === 'zones' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2"><p className="text-sm font-medium text-white">Strefa</p></div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={single.obj.color || '#ff0000'}
                  onChange={e => patchObj('all', 'zones', single.obj.id, { color: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Przezroczystość</p>
                <input type="range" min={0.05} max={1} step={0.05} value={single.obj.opacity ?? 0.3}
                  onChange={e => patchObj('all', 'zones', single.obj.id, { opacity: parseFloat(e.target.value) })}
                  className="w-full" />
              </div>
              <button onClick={deleteSelection} className={dangerBtn}><Trash2 size={14} /> Usuń strefę</button>
            </div>
          ) : single?.kind === 'items' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-medium text-white">{TYPE_LABELS[single.obj.type]}</p>
                {single.obj.type === 'player' && <p className="text-xs text-slate-400">Drużyna {single.obj.team}</p>}
              </div>

              {(single.obj.type === 'player' || single.obj.type === 'step') && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">{single.obj.type === 'player' ? 'Numer / Imię' : 'Numer kroku'}</p>
                  <input type="text" value={single.obj.label ?? ''}
                    onChange={e => patchObj('all', 'items', single.obj.id, { label: e.target.value })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white"
                    placeholder={single.obj.type === 'player' ? 'np. 10 lub Jan' : 'np. 1'} />
                </div>
              )}

              {single.obj.type === 'text' && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tekst</p>
                  <input type="text" value={single.obj.text ?? ''}
                    onChange={e => patchObj('all', 'items', single.obj.id, { text: e.target.value })}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white" />
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={single.obj.color || '#ffffff'}
                  onChange={e => patchObj('all', 'items', single.obj.id, { color: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Rozmiar</p>
                <input type="range" min={0.4} max={2.5} step={0.05} value={single.obj.scale || 1}
                  onChange={e => patchObj('all', 'items', single.obj.id, { scale: parseFloat(e.target.value) })}
                  className="w-full" />
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Obrót&nbsp;
                  <span className="text-slate-500">{Math.round(((single.obj.rotation || 0) * 180) / Math.PI)}°</span>
                </p>
                <input type="range" min={0} max={TWO_PI} step={0.05} value={single.obj.rotation || 0}
                  onChange={e => patchObj('current', 'items', single.obj.id, { rotation: parseFloat(e.target.value) })}
                  className="w-full" />
                <p className="text-xs text-slate-500 mt-0.5">lub przeciągnij niebieską rączkę</p>
              </div>

              <button onClick={deleteSelection} className={dangerBtn}><Trash2 size={14} /> Usuń element</button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 leading-relaxed space-y-2">
              <p>Kliknij element, linię lub strefę.</p>
              <p>Przeciągnij po pustym polu, aby zaznaczyć kilka. <kbd className="bg-white/10 px-1 rounded">Shift</kbd>+klik dodaje do zaznaczenia.</p>
              <p>Dwuklik → zmień kolor. Niebieska rączka → obrót.</p>
              <p>Animacja: „＋ Klatka” kopiuje bieżące ustawienie — przesuń zawodników i odtwórz.</p>
              <div className="pt-1 space-y-0.5">
                {[['Ctrl+Z / Y', 'cofnij / ponów'], ['Ctrl+C / V', 'kopiuj / wklej'], ['Ctrl+D', 'duplikuj'], ['Ctrl+A', 'zaznacz wszystko'], ['Delete', 'usuń']].map(([k, d]) => (
                  <p key={k}><kbd className="bg-white/10 px-1 rounded">{k}</kbd> {d}</p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto border-t border-white/10 pt-3 flex flex-col gap-1">
            <p className="text-xs text-slate-400">
              Klatka {currentFrame + 1}/{frames.length} · Elementy: {frame.items.length} · Linie: {frame.lines.length} · Strefy: {frame.zones.length}
            </p>
            {(frame.items.length > 0 || frame.lines.length > 0 || frame.zones.length > 0) && (
              <button onClick={clearFrame}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-400 transition-all">
                <Trash2 size={12} /> Wyczyść klatkę
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Drill description modal ── */}
      {showMeta && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowMeta(false)}>
          <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 sticky top-0 bg-slate-900">
              <h2 className="text-lg font-semibold text-white">Opis ćwiczenia</h2>
              <button onClick={() => setShowMeta(false)} className="p-1 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs text-slate-400">Nazwa
                <input type="text" value={drillName} onChange={e => setDrillName(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white" />
              </label>
              <label className="text-xs text-slate-400">Kategoria
                <select value={meta.category} onChange={e => setMeta(m => ({ ...m, category: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white">
                  <option value="" className="bg-slate-800">—</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Czas (min)
                <input type="number" min={1} value={meta.duration} onChange={e => setMeta(m => ({ ...m, duration: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white" />
              </label>
              <label className="text-xs text-slate-400">Liczba zawodników
                <input type="text" value={meta.players} placeholder="np. 8 (4v4)" onChange={e => setMeta(m => ({ ...m, players: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-slate-500" />
              </label>
              <label className="text-xs text-slate-400">Wymiary pola
                <input type="text" value={meta.area}
                  placeholder={pitch.type === 'custom' ? `${pitch.width}×${pitch.length} m` : 'np. 30×20 m'}
                  onChange={e => setMeta(m => ({ ...m, area: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-slate-500" />
              </label>
              {META_FIELDS.map(([key, label, placeholder]) => (
                <label key={key} className="col-span-2 text-xs text-slate-400">{label}
                  <textarea value={meta[key]} rows={3} placeholder={placeholder}
                    onChange={e => setMeta(m => ({ ...m, [key]: e.target.value }))}
                    className="mt-1 w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-slate-500 resize-y" />
                </label>
              ))}
              {equipmentSummary(frames) && (
                <p className="col-span-2 text-xs text-slate-400">Sprzęt (automatycznie): <span className="text-slate-300">{equipmentSummary(frames)}</span></p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
              <button onClick={exportCard} className={`${btn} text-sm px-3`}>📄 Karta PNG</button>
              <button onClick={() => setShowMeta(false)} className="px-4 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white">Gotowe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
