import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { drawField } from './utils/draw.js';

// ── Stałe boiska (takie same jak w FootballTacticsApp) ────────
const FIELD_W = 700;
const FIELD_H = 1080;


function drawGoal(ctx, item, selected) {
  const { x, y, rotation = 0, scale = 1 } = item;
  const w = 90 * scale, h = 16 * scale, depth = 20 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (selected) {
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 12;
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  ctx.stroke();
  // słupki
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(-w / 2, -h / 2 - depth);
  ctx.moveTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.moveTo(-w / 2, -h / 2 - depth);
  ctx.lineTo(w / 2, -h / 2 - depth);
  ctx.stroke();
  ctx.restore();
}

function drawMiniGoal(ctx, item, selected) {
  drawGoal(ctx, { ...item, scale: (item.scale || 1) * 0.5 }, selected);
}

function drawCone(ctx, item, selected) {
  const { x, y, scale = 1 } = item;
  const r = 10 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = '#f97316';
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.8);
  ctx.lineTo(-r, r * 0.6);
  ctx.lineTo(r, r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // podstawa
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.6, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPole(ctx, item, selected) {
  const { x, y, scale = 1 } = item;
  const h = 36 * scale, r = 4 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(0, -h / 2 + r * 2);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -h / 2, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMannequin(ctx, item, selected) {
  const { x, y, scale = 1 } = item;
  const w = 14 * scale, h = 40 * scale, headR = 6 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;
  // tułów
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2 + headR * 2.2, w, h - headR * 2.2, 3);
  ctx.fill();
  ctx.stroke();
  // głowa
  ctx.beginPath();
  ctx.arc(0, -h / 2 + headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, item, selected) {
  const { x, y, scale = 1 } = item;
  const r = 10 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // pentagonowy wzór
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, item, selected) {
  const { x, y, scale = 1, color = '#1d4ed8', number = 1, team = 'A' } = item;
  const r = 18 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14; }
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#60a5fa' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(r * 0.75)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 0, 0);
  ctx.restore();
}

function drawArrow(ctx, item, selected) {
  const { x1, y1, x2, y2, color = '#000000', dashed = false } = item;
  ctx.save();
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10; }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  if (dashed) ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  // grot
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
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

// ── Rysowanie boiska treningowego ─────────────────────────────
// ── Paleta sprzętu ────────────────────────────────────────────
const EQUIPMENT = [
  { type: 'player', label: 'Zawodnik A', team: 'A', color: '#1d4ed8', icon: '🔵' },
  { type: 'player', label: 'Zawodnik B', team: 'B', color: '#dc2626', icon: '🔴' },
  { type: 'goal',       label: 'Bramka',        icon: '🥅' },
  { type: 'mini-goal',  label: 'Mini-bramka',   icon: '🏒' },
  { type: 'cone',       label: 'Stożek',        icon: '🔶' },
  { type: 'pole',       label: 'Tyczka',        icon: '📍' },
  { type: 'mannequin',  label: 'Manekin',       icon: '🟡' },
  { type: 'ball',       label: 'Piłka',         icon: '⚽' },
];

// ── Główny komponent ──────────────────────────────────────────
export default function TrainingDrillApp() {
  const canvasRef = useRef(null);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const [drawingArrow, setDrawingArrow] = useState(null); // {x1,y1,x2,y2}
  const [tool, setTool] = useState('select'); // 'select' | 'arrow' | 'dashed'
  const [teamAColor, setTeamAColor] = useState('#1d4ed8');
  const [teamBColor, setTeamBColor] = useState('#dc2626');
  const [nextId, setNextId] = useState(1);
  const [playerCountA, setPlayerCountA] = useState(0);
  const [playerCountB, setPlayerCountB] = useState(0);

  // ── Render canvas ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    drawField(ctx, '11v11');
    // rysuj strzałki pod innymi elementami
    items.filter(i => i.type === 'arrow').forEach(i => drawItem(ctx, i, i.id === selectedId));
    // rysuj sprzęt i zawodników
    items.filter(i => i.type !== 'arrow').forEach(i => drawItem(ctx, i, i.id === selectedId));
    // strzałka w trakcie rysowania
    if (drawingArrow) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
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

  // ── Koordynaty canvas ──────────────────────────────────────
  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_W / rect.width;
    const scaleY = FIELD_H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }, []);

  // ── Hit test ───────────────────────────────────────────────
  const hitTest = useCallback((x, y) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'arrow') {
        // prosty test odległości od odcinka
        const dx = item.x2 - item.x1, dy = item.y2 - item.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const t = Math.max(0, Math.min(1, ((x - item.x1) * dx + (y - item.y1) * dy) / (len * len)));
        const px = item.x1 + t * dx, py = item.y1 + t * dy;
        if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < 12) return item;
      } else {
        const r = item.type === 'player' ? 20 : item.type === 'goal' ? 55 : 18;
        if (Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2) < r * (item.scale || 1)) return item;
      }
    }
    return null;
  }, [items]);

  // ── Dodawanie elementu przez klik w paletę ─────────────────
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
      ...(eq.type === 'player' ? {
        team: eq.team,
        color: eq.team === 'A' ? teamAColor : teamBColor,
        number: eq.team === 'A' ? playerCountA + 1 : playerCountB + 1,
      } : {}),
      ...(eq.type === 'arrow' || eq.type === 'dashed' ? { x1: x - 50, y1: y, x2: x + 50, y2: y, dashed: eq.type === 'dashed' } : {}),
    };
    if (eq.type === 'player') {
      if (eq.team === 'A') setPlayerCountA(n => n + 1);
      else setPlayerCountB(n => n + 1);
    }
    setItems(prev => [...prev, newItem]);
    setSelectedId(id);
  }, [nextId, teamAColor, teamBColor, playerCountA, playerCountB]);

  // ── Usuwanie zaznaczonego elementu ───────────────────────────
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (item?.type === 'player') {
      if (item.team === 'A') setPlayerCountA(n => Math.max(0, n - 1));
      else setPlayerCountB(n => Math.max(0, n - 1));
    }
    setItems(prev => prev.filter(i => i.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, items]);

  // ── Zdarzenia myszy/dotyku ────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    const { x, y } = getCoords(e);
    if (tool === 'arrow' || tool === 'dashed') {
      setDrawingArrow({ x1: x, y1: y, x2: x, y2: y });
      return;
    }
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id);
      const offsetX = hit.type === 'arrow' ? x - hit.x1 : x - hit.x;
      const offsetY = hit.type === 'arrow' ? y - hit.y1 : y - hit.y;
      setDragging({ id: hit.id, offsetX, offsetY, isArrow: hit.type === 'arrow', dx: hit.type === 'arrow' ? hit.x2 - hit.x1 : 0, dy: hit.type === 'arrow' ? hit.y2 - hit.y1 : 0 });
    } else {
      setSelectedId(null);
    }
  }, [tool, getCoords, hitTest]);

  const handleMouseMove = useCallback((e) => {
    const { x, y } = getCoords(e);
    if (drawingArrow) {
      setDrawingArrow(prev => ({ ...prev, x2: x, y2: y }));
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
  }, [dragging, drawingArrow, getCoords]);

  const handleMouseUp = useCallback((e) => {
    if (drawingArrow) {
      const { x, y } = getCoords(e);
      const dx = x - drawingArrow.x1, dy = y - drawingArrow.y1;
      if (Math.sqrt(dx * dx + dy * dy) > 15) {
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
  }, [drawingArrow, getCoords, nextId, tool]);

  // ── Klawiatura ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) deleteSelected();
      if (e.key === 'Escape') { setSelectedId(null); setTool('select'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, deleteSelected]);

  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Lewa paleta ── */}
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
              <input type="color" value={teamAColor} onChange={e => { setTeamAColor(e.target.value); setItems(prev => prev.map(i => i.team === 'A' ? { ...i, color: e.target.value } : i)); }} className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
              <span className="text-sm text-slate-300">Drużyna A</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={teamBColor} onChange={e => { setTeamBColor(e.target.value); setItems(prev => prev.map(i => i.team === 'B' ? { ...i, color: e.target.value } : i)); }} className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
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
                title={`Dodaj: ${eq.label}`}
              >
                <span className="text-base">{eq.icon}</span>
                <span>{eq.label}</span>
                <Plus size={12} className="ml-auto text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Środek: canvas ── */}
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
              style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* ── Prawy panel: właściwości ── */}
      <div className="w-52 bg-slate-950/80 border-l border-white/10 flex flex-col p-3 gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zaznaczony element</p>

        {selectedItem ? (
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-sm font-medium text-white capitalize">{selectedItem.type}</p>
              {selectedItem.type === 'player' && (
                <p className="text-xs text-slate-400">Drużyna {selectedItem.team} · #{selectedItem.number}</p>
              )}
            </div>

            {selectedItem.type === 'player' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Numer</p>
                <input
                  type="number"
                  min={1} max={99}
                  value={selectedItem.number}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, number: parseInt(e.target.value) || 1 } : i))}
                  className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white"
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

            {selectedItem.type === 'goal' && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Obrót</p>
                <input
                  type="range" min={0} max={Math.PI * 2} step={0.05}
                  value={selectedItem.rotation || 0}
                  onChange={e => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, rotation: parseFloat(e.target.value) } : i))}
                  className="w-full"
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

            <button
              onClick={deleteSelected}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
            >
              <Trash2 size={14} /> Usuń element
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 leading-relaxed">
            Kliknij element na boisku, aby go zaznaczyć.<br /><br />
            Przeciągnij, aby przesunąć.<br /><br />
            <kbd className="bg-white/10 px-1 rounded">Delete</kbd> — usuń zaznaczony
          </div>
        )}

        <div className="mt-auto border-t border-white/10 pt-3">
          <p className="text-xs text-slate-400 mb-2">Elementy na boisku: {items.length}</p>
          {items.length > 0 && (
            <button
              onClick={() => { setItems([]); setSelectedId(null); setPlayerCountA(0); setPlayerCountB(0); }}
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
