import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { drawField } from './utils/draw.js';

const FIELD_W = 700;
const FIELD_H = 1080;

// ── Helpers ──────────────────────────────────────────────────────
function getItemRadius(item) {
  const s = item.scale || 1;
  switch (item.type) {
    case 'player':    return 18 * s;
    case 'goal':      return 50 * s;
    case 'mini-goal': return 28 * s;
    case 'cone':      return 14 * s;
    case 'pole':      return 20 * s;
    case 'mannequin': return 22 * s;
    case 'ball':      return 12 * s;
    default:          return 18 * s;
  }
}

function drawRotationHandle(ctx, item) {
  const { x, y, rotation = 0 } = item;
  const dist = getItemRadius(item) + 18;
  const hx = x + Math.sin(rotation) * dist;
  const hy = y - Math.cos(rotation) * dist;
  ctx.save();
  ctx.strokeStyle = 'rgba(96,165,250,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3b82f6';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function isNearHandle(x, y, item) {
  const rotation = item.rotation || 0;
  const dist = getItemRadius(item) + 18;
  const hx = item.x + Math.sin(rotation) * dist;
  const hy = item.y - Math.cos(rotation) * dist;
  return Math.hypot(x - hx, y - hy) < 14;
}

// ── Draw functions ───────────────────────────────────────────────
function drawGoal(ctx, item, selected) {
  const { x, y, rotation = 0, scale = 1, color = '#ffffff' } = item;
  const w = 90 * scale, h = 16 * scale, depth = 20 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = color;
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, -h / 2 - depth);
  ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.moveTo(-w / 2, -h / 2 - depth); ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.stroke();
  ctx.restore();
}

function drawMiniGoal(ctx, item, selected) {
  drawGoal(ctx, { ...item, scale: (item.scale || 1) * 0.5 }, selected);
}

function drawCone(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#f97316' } = item;
  const r = 10 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.8); ctx.lineTo(-r, r * 0.6); ctx.lineTo(r, r * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, r * 0.6, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.restore();
  ctx.restore();
}

function drawPole(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#ef4444' } = item;
  const h = 36 * scale, r = 4 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = color;
  ctx.lineWidth = r;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(0, -h / 2 + r * 2); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(0, -h / 2, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMannequin(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#facc15' } = item;
  const w = 14 * scale, h = 40 * scale, headR = 6 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2 + headR * 2.2, w, h - headR * 2.2, 3);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -h / 2 + headR, headR, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, item, selected) {
  const { x, y, scale = 1, color = '#ffffff' } = item;
  const r = 10 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, item, selected) {
  const { x, y, scale = 1, color = '#1d4ed8', label = '1', rotation = 0 } = item;
  const r = 18 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  // hands showing orientation
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(-r * 1.3, -r * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 1.3, -r * 0.8);
  ctx.stroke();
  // body circle
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#60a5fa' : '#ffffff';
  ctx.lineWidth = selected ? 2.5 : 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.stroke();
  // label always upright
  ctx.rotate(-rotation);
  ctx.fillStyle = '#ffffff';
  const fs = Math.max(9, Math.round(r * 0.7));
  ctx.font = `bold ${fs}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(label), 0, 0);
  ctx.restore();
}

function drawArrow(ctx, item, selected) {
  const { x1, y1, x2, y2, color = '#000000', dashed = false } = item;
  ctx.save();
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10; }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  if (dashed) ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawItem(ctx, item, selected) {
  switch (item.type) {
    case 'goal':       drawGoal(ctx, item, selected); break;
    case 'mini-goal':  drawMiniGoal(ctx, item, selected); break;
    case 'cone':       drawCone(ctx, item, selected); break;
    case 'pole':       drawPole(ctx, item, selected); break;
    case 'mannequin':  drawMannequin(ctx, item, selected); break;
    case 'ball':       drawBall(ctx, item, selected); break;
    case 'player':     drawPlayer(ctx, item, selected); break;
    case 'arrow':      drawArrow(ctx, item, selected); break;
  }
}

// ── Equipment palette ────────────────────────────────────────────
const EQUIPMENT = [
  { type: 'player', label: 'Zawodnik A', team: 'A', icon: '🔵' },
  { type: 'player', label: 'Zawodnik B', team: 'B', icon: '🔴' },
  { type: 'goal',       label: 'Bramka',       icon: '🥅', color: '#ffffff' },
  { type: 'mini-goal',  label: 'Mini-bramka',  icon: '🏒', color: '#ffffff' },
  { type: 'cone',       label: 'Stożek',       icon: '🔶', color: '#f97316' },
  { type: 'pole',       label: 'Tyczka',       icon: '📍', color: '#ef4444' },
  { type: 'mannequin',  label: 'Manekin',      icon: '🟡', color: '#facc15' },
  { type: 'ball',       label: 'Piłka',        icon: '⚽', color: '#ffffff' },
];

// ── Main component ───────────────────────────────────────────────
export default function TrainingDrillApp() {
  const canvasRef = useRef(null);
  const lastTapRef = useRef(0);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [tool, setTool] = useState('select');
  const [teamAColor, setTeamAColor] = useState('#1d4ed8');
  const [teamBColor, setTeamBColor] = useState('#dc2626');
  const [nextId, setNextId] = useState(1);
  const [playerCountA, setPlayerCountA] = useState(0);
  const [playerCountB, setPlayerCountB] = useState(0);
  const [colorPicker, setColorPicker] = useState(null); // { id, screenX, screenY }

  // ── Render canvas ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    drawField(ctx, '11v11');
    items.filter(i => i.type === 'arrow').forEach(i => drawItem(ctx, i, i.id === selectedId));
    items.filter(i => i.type !== 'arrow').forEach(i => {
      drawItem(ctx, i, i.id === selectedId);
      if (i.id === selectedId) drawRotationHandle(ctx, i);
    });
    if (drawingArrow) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash(tool === 'dashed' ? [8, 5] : []);
      ctx.beginPath();
      ctx.moveTo(drawingArrow.x1, drawingArrow.y1);
      ctx.lineTo(drawingArrow.x2, drawingArrow.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [items, selectedId, drawingArrow, tool]);

  // ── Canvas coords ────────────────────────────────────────────────
  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_W / rect.width;
    const scaleY = FIELD_H / rect.height;
    const src = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
      screenX: src.clientX,
      screenY: src.clientY,
    };
  }, []);

  // ── Hit test ─────────────────────────────────────────────────────
  const hitTest = useCallback((x, y) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'arrow') {
        const dx = item.x2 - item.x1, dy = item.y2 - item.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const t = Math.max(0, Math.min(1, ((x - item.x1) * dx + (y - item.y1) * dy) / (len * len)));
        const px = item.x1 + t * dx, py = item.y1 + t * dy;
        if (Math.hypot(x - px, y - py) < 12) return item;
      } else {
        if (Math.hypot(x - item.x, y - item.y) < getItemRadius(item) + 4) return item;
      }
    }
    return null;
  }, [items]);

  // ── Add item ──────────────────────────────────────────────────────
  const addItem = useCallback((eq) => {
    const id = nextId;
    setNextId(n => n + 1);
    const x = FIELD_W / 2 + (Math.random() - 0.5) * 100;
    const y = FIELD_H / 2 + (Math.random() - 0.5) * 100;
    const newItem = {
      id,
      type: eq.type,
      x, y,
      scale: 1,
      rotation: 0,
      color: eq.type === 'player' ? (eq.team === 'A' ? teamAColor : teamBColor) : (eq.color || '#ffffff'),
      ...(eq.type === 'player' ? {
        team: eq.team,
        label: String(eq.team === 'A' ? playerCountA + 1 : playerCountB + 1),
      } : {}),
    };
    if (eq.type === 'player') {
      if (eq.team === 'A') setPlayerCountA(n => n + 1);
      else setPlayerCountB(n => n + 1);
    }
    setItems(prev => [...prev, newItem]);
    setSelectedId(id);
  }, [nextId, teamAColor, teamBColor, playerCountA, playerCountB]);

  // ── Delete selected ───────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (item?.type === 'player') {
      if (item.team === 'A') setPlayerCountA(n => Math.max(0, n - 1));
      else setPlayerCountB(n => Math.max(0, n - 1));
    }
    setItems(prev => prev.filter(i => i.id !== selectedId));
    setSelectedId(null);
    setColorPicker(null);
  }, [selectedId, items]);

  // ── Mouse / touch handlers ────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    const { x, y } = getCoords(e);
    if (tool === 'arrow' || tool === 'dashed') {
      setDrawingArrow({ x1: x, y1: y, x2: x, y2: y });
      return;
    }
    // check rotation handle first
    if (selectedId) {
      const selItem = items.find(i => i.id === selectedId);
      if (selItem && selItem.type !== 'arrow' && isNearHandle(x, y, selItem)) {
        setIsDraggingRotation(true);
        return;
      }
    }
    const hit = hitTest(x, y);
    setColorPicker(null);
    if (hit) {
      setSelectedId(hit.id);
      const offsetX = hit.type === 'arrow' ? x - hit.x1 : x - hit.x;
      const offsetY = hit.type === 'arrow' ? y - hit.y1 : y - hit.y;
      setDragging({
        id: hit.id, offsetX, offsetY,
        isArrow: hit.type === 'arrow',
        dx: hit.type === 'arrow' ? hit.x2 - hit.x1 : 0,
        dy: hit.type === 'arrow' ? hit.y2 - hit.y1 : 0,
      });
    } else {
      setSelectedId(null);
    }
  }, [tool, getCoords, hitTest, selectedId, items]);

  const handleMouseMove = useCallback((e) => {
    const { x, y } = getCoords(e);
    if (drawingArrow) {
      setDrawingArrow(prev => ({ ...prev, x2: x, y2: y }));
      return;
    }
    if (isDraggingRotation && selectedId) {
      setItems(prev => prev.map(item => {
        if (item.id !== selectedId) return item;
        return { ...item, rotation: Math.atan2(x - item.x, -(y - item.y)) };
      }));
      return;
    }
    if (!dragging) return;
    setItems(prev => prev.map(item => {
      if (item.id !== dragging.id) return item;
      if (dragging.isArrow) {
        const nx = x - dragging.offsetX, ny = y - dragging.offsetY;
        return { ...item, x1: nx, y1: ny, x2: nx + dragging.dx, y2: ny + dragging.dy };
      }
      return { ...item, x: x - dragging.offsetX, y: y - dragging.offsetY };
    }));
  }, [dragging, drawingArrow, isDraggingRotation, selectedId, getCoords]);

  const handleMouseUp = useCallback((e) => {
    if (isDraggingRotation) { setIsDraggingRotation(false); return; }
    if (drawingArrow) {
      const { x, y } = getCoords(e);
      const dx = x - drawingArrow.x1, dy = y - drawingArrow.y1;
      if (Math.hypot(dx, dy) > 15) {
        const id = nextId;
        setNextId(n => n + 1);
        setItems(prev => [...prev, {
          id, type: 'arrow',
          x1: drawingArrow.x1, y1: drawingArrow.y1, x2: x, y2: y,
          dashed: tool === 'dashed',
          color: '#000000',
        }]);
        setSelectedId(id);
      }
      setDrawingArrow(null);
      return;
    }
    setDragging(null);
  }, [isDraggingRotation, drawingArrow, getCoords, nextId, tool]);

  const handleDoubleClick = useCallback((e) => {
    const { x, y, screenX, screenY } = getCoords(e);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id);
      setColorPicker({ id: hit.id, screenX, screenY });
    }
  }, [getCoords, hitTest]);

  const handleTouchStart = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches.length === 1) {
      handleDoubleClick(e);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    handleMouseDown(e);
  }, [handleMouseDown, handleDoubleClick]);

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) deleteSelected();
      if (e.key === 'Escape') { setSelectedId(null); setTool('select'); setColorPicker(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, deleteSelected]);

  const selectedItem = items.find(i => i.id === selectedId);
  const colorPickerItem = colorPicker ? items.find(i => i.id === colorPicker.id) : null;

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* ── Floating color picker ── */}
      {colorPicker && colorPickerItem && (
        <div
          className="fixed z-50 bg-slate-800 border border-white/20 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
          style={{ left: colorPicker.screenX, top: colorPicker.screenY, transform: 'translate(-50%, 12px)', minWidth: 150 }}
        >
          <p className="text-xs font-semibold text-slate-300">Kolor elementu</p>
          <input
            type="color"
            value={colorPickerItem.color || '#ffffff'}
            onChange={e => setItems(prev => prev.map(i => i.id === colorPicker.id ? { ...i, color: e.target.value } : i))}
            className="w-full h-9 rounded cursor-pointer border border-white/20 bg-transparent"
          />
          <button
            onClick={() => setColorPicker(null)}
            className="text-xs text-slate-400 hover:text-white py-1 hover:bg-white/10 rounded transition-all"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* ── Left panel ── */}
      <div className="w-56 bg-slate-950/80 border-r border-white/10 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-white/10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Narzędzia</p>
          <div className="flex flex-col gap-1">
            {[['select', '↖ Zaznacz'], ['arrow', '→ Strzałka'], ['dashed', '⇢ Przerywana']].map(([t, l]) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`px-3 py-1.5 rounded text-sm text-left transition-all ${tool === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-b border-white/10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kolory drużyn</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input type="color" value={teamAColor}
                onChange={e => { setTeamAColor(e.target.value); setItems(prev => prev.map(i => i.team === 'A' ? { ...i, color: e.target.value } : i)); }}
                className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
              <span className="text-sm text-slate-300">Drużyna A</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={teamBColor}
                onChange={e => { setTeamBColor(e.target.value); setItems(prev => prev.map(i => i.team === 'B' ? { ...i, color: e.target.value } : i)); }}
                className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
              <span className="text-sm text-slate-300">Drużyna B</span>
            </div>
          </div>
        </div>

        <div className="p-3 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sprzęt</p>
          <div className="flex flex-col gap-1">
            {EQUIPMENT.map((eq, idx) => (
              <button
                key={idx}
                onClick={() => addItem(eq)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-200 bg-white/5 hover:bg-white/15 transition-all text-left active:scale-95"
              >
                <span className="text-base">{eq.icon}</span>
                <span>{eq.label}</span>
                <Plus size={12} className="ml-auto text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: '100%', maxWidth: '100%', aspectRatio: `${FIELD_W}/${FIELD_H}` }}>
            <canvas
              ref={canvasRef}
              width={FIELD_W}
              height={FIELD_H}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-52 bg-slate-950/80 border-l border-white/10 flex flex-col p-3 gap-3 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zaznaczony</p>

        {selectedItem ? (
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-sm font-medium text-white capitalize">{selectedItem.type}</p>
              {selectedItem.type === 'player' && (
                <p className="text-xs text-slate-400">Drużyna {selectedItem.team}</p>
              )}
            </div>

            {selectedItem.type === 'player' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Numer / Imię</p>
                <input
                  type="text"
                  value={selectedItem.label ?? ''}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, label: e.target.value } : i))}
                  className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white"
                  placeholder="np. 10 lub Jan"
                />
              </div>
            )}

            {selectedItem.type !== 'arrow' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input
                  type="color"
                  value={selectedItem.color || '#ffffff'}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, color: e.target.value } : i))}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent"
                />
              </div>
            )}

            {selectedItem.type === 'arrow' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor strzałki</p>
                <input
                  type="color"
                  value={selectedItem.color || '#000000'}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, color: e.target.value } : i))}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent"
                />
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Rozmiar</p>
              <input
                type="range" min={0.4} max={2.5} step={0.05}
                value={selectedItem.scale || 1}
                onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, scale: parseFloat(e.target.value) } : i))}
                className="w-full"
              />
            </div>

            {selectedItem.type !== 'arrow' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Obrót &nbsp;
                  <span className="text-slate-500">{Math.round(((selectedItem.rotation || 0) * 180) / Math.PI)}°</span>
                </p>
                <input
                  type="range" min={0} max={Math.PI * 2} step={0.05}
                  value={selectedItem.rotation || 0}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, rotation: parseFloat(e.target.value) } : i))}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-0.5">lub przeciągnij niebieską rączkę</p>
              </div>
            )}

            <button
              onClick={deleteSelected}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
            >
              <Trash2 size={14} /> Usuń element
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 leading-relaxed">
            Kliknij element, aby zaznaczyć.<br /><br />
            Dwuklik → szybka zmiana koloru.<br /><br />
            Przeciągnij niebieską rączkę → obróć.<br /><br />
            <kbd className="bg-white/10 px-1 rounded">Delete</kbd> — usuń zaznaczony
          </div>
        )}

        <div className="mt-auto border-t border-white/10 pt-3">
          <p className="text-xs text-slate-400 mb-2">Elementy: {items.length}</p>
          {items.length > 0 && (
            <button
              onClick={() => { setItems([]); setSelectedId(null); setPlayerCountA(0); setPlayerCountB(0); setColorPicker(null); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-400 transition-all"
            >
              <Trash2 size={12} /> Wyczyść wszystko
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
