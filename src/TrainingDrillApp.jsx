import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { drawField, drawLine, drawZone } from './utils/draw.js';
import {
  isPointNearLine, isPointNearControlPoint, isPointNearLineEnd,
  isPointInZone, isPointNearPolygonVertex,
} from './utils/geometry.js';

const FIELD_W = 700;
const FIELD_H = 1080;

// ── Item helpers ─────────────────────────────────────────────────
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
  ctx.fillStyle = '#3b82f6'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function isNearHandle(x, y, item) {
  const rot = item.rotation || 0;
  const dist = getItemRadius(item) + 18;
  return Math.hypot(x - (item.x + Math.sin(rot) * dist), y - (item.y - Math.cos(rot) * dist)) < 14;
}

// ── Item draw functions ──────────────────────────────────────────
function drawGoal(ctx, item, selected) {
  const { x, y, rotation = 0, scale = 1, color = '#ffffff' } = item;
  const w = 90 * scale, h = 16 * scale, depth = 20 * scale;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = color;
  ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w/2, -h/2); ctx.lineTo(-w/2, -h/2-depth);
  ctx.moveTo(w/2, -h/2); ctx.lineTo(w/2, -h/2-depth);
  ctx.moveTo(-w/2, -h/2-depth); ctx.lineTo(w/2, -h/2-depth);
  ctx.stroke(); ctx.restore();
}

function drawMiniGoal(ctx, item, selected) {
  drawGoal(ctx, { ...item, scale: (item.scale || 1) * 0.5 }, selected);
}

function drawCone(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#f97316' } = item;
  const r = 10 * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,-r*1.8); ctx.lineTo(-r,r*0.6); ctx.lineTo(r,r*0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, r*0.6, r, r*0.35, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  ctx.restore();
}

function drawPole(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#ef4444' } = item;
  const h = 36*scale, r = 4*scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = color; ctx.lineWidth = r; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(0, -h/2+r*2); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(0, -h/2, r*1.6, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMannequin(ctx, item, selected) {
  const { x, y, scale = 1, rotation = 0, color = '#facc15' } = item;
  const w = 14*scale, h = 40*scale, headR = 6*scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-w/2, -h/2+headR*2.2, w, h-headR*2.2, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h/2+headR, headR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, item, selected) {
  const { x, y, scale = 1, color = '#ffffff' } = item;
  const r = 10*scale;
  ctx.save(); ctx.translate(x, y);
  if (selected) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
  ctx.fillStyle = color; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(0, 0, r*0.32, 0, Math.PI*2); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2 - Math.PI/2;
    ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.62, Math.sin(a)*r*0.62, r*0.18, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawPlayerItem(ctx, item, selected) {
  const { x, y, scale = 1, color = '#1d4ed8', label = '1', rotation = 0 } = item;
  const r = 18*scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, r*0.22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r*0.5,-r*0.3); ctx.lineTo(-r*1.3,-r*0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r*0.5,-r*0.3); ctx.lineTo(r*1.3,-r*0.8); ctx.stroke();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; ctx.strokeStyle = selected ? '#60a5fa' : '#ffffff'; ctx.lineWidth = selected ? 2.5 : 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.stroke();
  ctx.rotate(-rotation);
  ctx.fillStyle = '#ffffff';
  const fs = Math.max(9, Math.round(r*0.7));
  ctx.font = `bold ${fs}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(label), 0, 0);
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
    case 'player':     drawPlayerItem(ctx, item, selected); break;
  }
}

// ── Constants ────────────────────────────────────────────────────
const EQUIPMENT = [
  { type: 'player',    label: 'Zawodnik A', team: 'A', icon: '🔵' },
  { type: 'player',    label: 'Zawodnik B', team: 'B', icon: '🔴' },
  { type: 'goal',      label: 'Bramka',     icon: '🥅', color: '#ffffff' },
  { type: 'mini-goal', label: 'Mini-bramka',icon: '🏒', color: '#ffffff' },
  { type: 'cone',      label: 'Stożek',     icon: '🔶', color: '#f97316' },
  { type: 'pole',      label: 'Tyczka',     icon: '📍', color: '#ef4444' },
  { type: 'mannequin', label: 'Manekin',    icon: '🟡', color: '#facc15' },
  { type: 'ball',      label: 'Piłka',      icon: '⚽', color: '#ffffff' },
];

const quickColorPalette = [
  { name: 'Niebieski',   color: '#1F77B4' },
  { name: 'Zielony',     color: '#2CA02C' },
  { name: 'Turkusowy',   color: '#17BECF' },
  { name: 'Granatowy',   color: '#003F5C' },
  { name: 'Czerwony',    color: '#D62728' },
  { name: 'Pomarańczowy',color: '#FF7F0E' },
  { name: 'Żółty',       color: '#BCBD22' },
  { name: 'Różowy',      color: '#E377C2' },
  { name: 'Brązowy',     color: '#8C564B' },
  { name: 'Czarny',      color: '#000000' },
  { name: 'Biały',       color: '#FFFFFF' },
];

// ── Main component ───────────────────────────────────────────────
export default function TrainingDrillApp() {
  const canvasRef = useRef(null);
  const lastTapRef = useRef(0);
  const lineColorInputRef = useRef(null);
  const zoneColorInputRef = useRef(null);

  // Items (equipment + players)
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);
  const [teamAColor, setTeamAColor] = useState('#1d4ed8');
  const [teamBColor, setTeamBColor] = useState('#dc2626');
  const [nextId, setNextId] = useState(1);
  const [playerCountA, setPlayerCountA] = useState(0);
  const [playerCountB, setPlayerCountB] = useState(0);
  const [colorPicker, setColorPicker] = useState(null);

  // Drawing mode
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState('line');

  // Line drawing
  const [lineType, setLineType] = useState('arrow-solid');
  const [lineColor, setLineColor] = useState('#000000');
  const [currentLine, setCurrentLine] = useState(null);
  const [lines, setLines] = useState([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  const [isDraggingLine, setIsDraggingLine] = useState(false);
  const [isDraggingLineEnd, setIsDraggingLineEnd] = useState(null);
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  const [lineDragOffset, setLineDragOffset] = useState(null);

  // Zone drawing
  const [zoneType, setZoneType] = useState('rectangle');
  const [zoneColor, setZoneColor] = useState('#ff0000');
  const [zoneOpacity, setZoneOpacity] = useState(0.3);
  const [currentZone, setCurrentZone] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [zoneDragOffset, setZoneDragOffset] = useState(null);
  const [isDraggingPolygonVertex, setIsDraggingPolygonVertex] = useState(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState(null);

  // Color palette
  const [openColorPalette, setOpenColorPalette] = useState(null);

  // ── Canvas render ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    drawField(ctx, '11v11');

    // zones
    zones.forEach((zone, i) => drawZone(ctx, zone, i === selectedZoneIndex, zoneColor, zoneOpacity));
    if (currentZone) drawZone(ctx, currentZone, false, zoneColor, zoneOpacity);

    // in-progress polygon
    if (isDrawingMode && drawingTool === 'zone' && zoneType === 'polygon' && polygonPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = zoneColor; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      polygonPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
      polygonPoints.forEach((p, i) => {
        ctx.fillStyle = i === 0 && polygonPoints.length >= 3 ? '#00ff00' : zoneColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }

    // lines
    lines.forEach((line, i) => drawLine(ctx, line, i === selectedLineIndex));
    if (currentLine) drawLine(ctx, currentLine, false);

    // items
    items.forEach(item => {
      drawItem(ctx, item, item.id === selectedId);
      if (item.id === selectedId) drawRotationHandle(ctx, item);
    });
  }, [items, selectedId, lines, currentLine, selectedLineIndex, zones, currentZone,
      selectedZoneIndex, polygonPoints, zoneColor, zoneType, zoneOpacity, isDrawingMode, drawingTool]);

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

  // ── Item hit test ────────────────────────────────────────────────
  const hitTest = useCallback((x, y) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (Math.hypot(x - item.x, y - item.y) < getItemRadius(item) + 4) return item;
    }
    return null;
  }, [items]);

  // ── Add item ─────────────────────────────────────────────────────
  const addItem = useCallback((eq) => {
    const id = nextId;
    setNextId(n => n + 1);
    const x = FIELD_W/2 + (Math.random()-0.5)*100;
    const y = FIELD_H/2 + (Math.random()-0.5)*100;
    const newItem = {
      id, type: eq.type, x, y, scale: 1, rotation: 0,
      color: eq.type === 'player' ? (eq.team === 'A' ? teamAColor : teamBColor) : (eq.color || '#ffffff'),
      ...(eq.type === 'player' ? {
        team: eq.team,
        label: String(eq.team === 'A' ? playerCountA+1 : playerCountB+1),
      } : {}),
    };
    if (eq.type === 'player') {
      if (eq.team === 'A') setPlayerCountA(n => n+1);
      else setPlayerCountB(n => n+1);
    }
    setItems(prev => [...prev, newItem]);
    setSelectedId(id);
    setSelectedLineIndex(null);
    setSelectedZoneIndex(null);
  }, [nextId, teamAColor, teamBColor, playerCountA, playerCountB]);

  // ── Delete selected ──────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (selectedLineIndex !== null) {
      setLines(prev => prev.filter((_, i) => i !== selectedLineIndex));
      setSelectedLineIndex(null);
      return;
    }
    if (selectedZoneIndex !== null) {
      setZones(prev => prev.filter((_, i) => i !== selectedZoneIndex));
      setSelectedZoneIndex(null);
      return;
    }
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (item?.type === 'player') {
      if (item.team === 'A') setPlayerCountA(n => Math.max(0,n-1));
      else setPlayerCountB(n => Math.max(0,n-1));
    }
    setItems(prev => prev.filter(i => i.id !== selectedId));
    setSelectedId(null);
    setColorPicker(null);
  }, [selectedId, selectedLineIndex, selectedZoneIndex, items]);

  // ── Mouse down ───────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    const { x, y } = getCoords(e);

    // Drawing: line
    if (isDrawingMode && drawingTool === 'line') {
      setCurrentLine({ startX: x, startY: y, endX: x, endY: y, type: lineType, color: lineColor });
      return;
    }

    // Drawing: zone
    if (isDrawingMode && drawingTool === 'zone') {
      if (zoneType === 'polygon') {
        if (polygonPoints.length >= 3 && Math.hypot(x-polygonPoints[0].x, y-polygonPoints[0].y) < 12) {
          setZones(prev => [...prev, { type:'polygon', points:[...polygonPoints], color:zoneColor, opacity:zoneOpacity }]);
          setPolygonPoints([]);
          return;
        }
        setPolygonPoints(prev => [...prev, { x, y }]);
        return;
      }
      if (zoneType === 'rectangle') {
        setCurrentZone({ type:'rectangle', x, y, width:0, height:0, color:zoneColor, opacity:zoneOpacity });
        return;
      }
      if (zoneType === 'circle') {
        setCurrentZone({ type:'circle', centerX:x, centerY:y, radius:0, color:zoneColor, opacity:zoneOpacity });
        return;
      }
    }

    // Select: rotation handle
    if (selectedId) {
      const sel = items.find(i => i.id === selectedId);
      if (sel && isNearHandle(x, y, sel)) { setIsDraggingRotation(true); return; }
    }

    // Select: line end/control point
    if (selectedLineIndex !== null) {
      const le = isPointNearLineEnd(x, y, lines[selectedLineIndex]);
      if (le) { setIsDraggingLineEnd(le); return; }
      if (lines[selectedLineIndex]?.type.includes('curve') && isPointNearControlPoint(x, y, lines[selectedLineIndex])) {
        setIsDraggingControlPoint(true); return;
      }
    }

    // Select: any line
    for (let i = lines.length-1; i >= 0; i--) {
      if (isPointNearLine(x, y, lines[i])) {
        setSelectedLineIndex(i); setSelectedZoneIndex(null); setSelectedId(null); setColorPicker(null);
        setIsDraggingLine(true);
        setLineDragOffset({ startX: x-lines[i].startX, startY: y-lines[i].startY, endX: x-lines[i].endX, endY: y-lines[i].endY });
        return;
      }
    }
    if (selectedLineIndex !== null) setSelectedLineIndex(null);

    // Select: polygon vertex
    if (selectedZoneIndex !== null && zones[selectedZoneIndex]?.type === 'polygon') {
      const vi = isPointNearPolygonVertex(x, y, zones[selectedZoneIndex]);
      if (vi !== null) { setIsDraggingPolygonVertex(true); setDraggedVertexIndex(vi); return; }
    }

    // Select: zone drag
    if (selectedZoneIndex !== null && isPointInZone(x, y, zones[selectedZoneIndex])) {
      const zone = zones[selectedZoneIndex];
      setIsDraggingZone(true);
      if (zone.type === 'rectangle') setZoneDragOffset({ x: x-zone.x, y: y-zone.y });
      else if (zone.type === 'circle') setZoneDragOffset({ x: x-zone.centerX, y: y-zone.centerY });
      else setZoneDragOffset({ x, y });
      return;
    }

    // Select: any zone
    for (let i = zones.length-1; i >= 0; i--) {
      if (isPointInZone(x, y, zones[i])) {
        setSelectedZoneIndex(i); setSelectedLineIndex(null); setSelectedId(null); setColorPicker(null);
        return;
      }
    }
    if (selectedZoneIndex !== null) setSelectedZoneIndex(null);

    // Select: item
    setColorPicker(null);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id); setSelectedLineIndex(null); setSelectedZoneIndex(null);
      setDragging({ id: hit.id, offsetX: x-hit.x, offsetY: y-hit.y });
    } else {
      setSelectedId(null);
    }
  };

  // ── Mouse move ───────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const { x, y } = getCoords(e);

    if (currentLine) { setCurrentLine(prev => ({ ...prev, endX: x, endY: y })); return; }

    if (currentZone) {
      if (currentZone.type === 'rectangle') setCurrentZone(prev => ({ ...prev, width: x-prev.x, height: y-prev.y }));
      else if (currentZone.type === 'circle') setCurrentZone(prev => ({ ...prev, radius: Math.hypot(x-prev.centerX, y-prev.centerY) }));
      return;
    }

    if (isDraggingLineEnd && selectedLineIndex !== null) {
      setLines(prev => {
        const u = [...prev];
        const l = { ...u[selectedLineIndex] };
        if (isDraggingLineEnd === 'start') { l.startX = x; l.startY = y; }
        else { l.endX = x; l.endY = y; }
        u[selectedLineIndex] = l;
        return u;
      });
      return;
    }

    if (isDraggingControlPoint && selectedLineIndex !== null) {
      setLines(prev => { const u=[...prev]; u[selectedLineIndex]={...u[selectedLineIndex],controlX:x,controlY:y}; return u; });
      return;
    }

    if (isDraggingLine && selectedLineIndex !== null && lineDragOffset) {
      setLines(prev => {
        const u=[...prev];
        const l=prev[selectedLineIndex];
        const ns=x-lineDragOffset.startX, nsy=y-lineDragOffset.startY;
        const ne=x-lineDragOffset.endX, ney=y-lineDragOffset.endY;
        const newLine={...l, startX:ns, startY:nsy, endX:ne, endY:ney};
        if (l.controlX !== undefined) { newLine.controlX=l.controlX+(ns-l.startX); newLine.controlY=l.controlY+(nsy-l.startY); }
        u[selectedLineIndex]=newLine;
        return u;
      });
      return;
    }

    if (isDraggingPolygonVertex && selectedZoneIndex !== null && draggedVertexIndex !== null) {
      setZones(prev => {
        const u=[...prev]; const z={...u[selectedZoneIndex]}; const pts=[...z.points];
        pts[draggedVertexIndex]={x,y}; u[selectedZoneIndex]={...z,points:pts}; return u;
      });
      return;
    }

    if (isDraggingZone && selectedZoneIndex !== null && zoneDragOffset) {
      setZones(prev => {
        const u=[...prev]; const z=u[selectedZoneIndex];
        if (z.type==='rectangle') u[selectedZoneIndex]={...z,x:x-zoneDragOffset.x,y:y-zoneDragOffset.y};
        else if (z.type==='circle') u[selectedZoneIndex]={...z,centerX:x-zoneDragOffset.x,centerY:y-zoneDragOffset.y};
        else if (z.type==='polygon') {
          const dx=x-zoneDragOffset.x, dy=y-zoneDragOffset.y;
          u[selectedZoneIndex]={...z,points:z.points.map(p=>({x:p.x+dx,y:p.y+dy}))};
          setZoneDragOffset({x,y});
        }
        return u;
      });
      return;
    }

    if (isDraggingRotation && selectedId) {
      setItems(prev => prev.map(i => i.id===selectedId ? {...i, rotation:Math.atan2(x-i.x,-(y-i.y))} : i));
      return;
    }

    if (!dragging) return;
    setItems(prev => prev.map(i => i.id===dragging.id ? {...i, x:x-dragging.offsetX, y:y-dragging.offsetY} : i));
  };

  // ── Mouse up ─────────────────────────────────────────────────────
  const handleMouseUp = (e) => {
    if (isDraggingRotation) { setIsDraggingRotation(false); return; }

    if (currentLine && isDrawingMode && drawingTool === 'line') {
      if (Math.hypot(currentLine.endX-currentLine.startX, currentLine.endY-currentLine.startY) > 10)
        setLines(prev => [...prev, currentLine]);
      setCurrentLine(null);
      return;
    }

    if (currentZone && isDrawingMode && drawingTool === 'zone') {
      const ok = currentZone.type==='rectangle'
        ? Math.abs(currentZone.width)>20 && Math.abs(currentZone.height)>20
        : currentZone.radius > 10;
      if (ok) setZones(prev => [...prev, currentZone]);
      setCurrentZone(null);
      return;
    }

    setIsDraggingLine(false);
    setIsDraggingLineEnd(null);
    setIsDraggingControlPoint(false);
    setIsDraggingZone(false);
    setIsDraggingPolygonVertex(false);
    setDraggedVertexIndex(null);
    setDragging(null);
  };

  // ── Double click ─────────────────────────────────────────────────
  const handleDoubleClick = (e) => {
    const { x, y, screenX, screenY } = getCoords(e);
    const hit = hitTest(x, y);
    if (hit) { setSelectedId(hit.id); setColorPicker({ id: hit.id, screenX, screenY }); }
  };

  const handleTouchStart = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches.length === 1) {
      handleDoubleClick(e); lastTapRef.current = 0; return;
    }
    lastTapRef.current = now;
    handleMouseDown(e);
  };

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'Escape') {
        setSelectedId(null); setSelectedLineIndex(null); setSelectedZoneIndex(null);
        setIsDrawingMode(false); setCurrentLine(null); setCurrentZone(null); setPolygonPoints([]); setColorPicker(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected]);

  // close palette on outside click
  useEffect(() => {
    const handler = () => setOpenColorPalette(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const selectedItem = items.find(i => i.id === selectedId);
  const colorPickerItem = colorPicker ? items.find(i => i.id === colorPicker.id) : null;

  const isSelecting = !isDrawingMode;

  return (
    <div className="flex flex-1 overflow-hidden flex-col relative">

      {/* ── Drawing toolbar ── */}
      {isDrawingMode && (
        <div className="flex-shrink-0 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 px-4 py-2 overflow-x-auto">
          <div className="min-w-max flex flex-col gap-2">
            {/* Tool picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium">Narzędzie:</span>
              <button
                onClick={() => { setDrawingTool('line'); setCurrentZone(null); setPolygonPoints([]); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${drawingTool==='line' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-slate-300'}`}
              >📏 Linie</button>
              <button
                onClick={() => { setDrawingTool('zone'); setCurrentLine(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${drawingTool==='zone' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-slate-300'}`}
              >🔷 Strefy</button>
            </div>

            {/* Line options */}
            {drawingTool === 'line' && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-sm text-slate-400 font-medium mr-1">Typ:</span>
                {[
                  ['arrow-solid','Prosta ciągła z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
                  ['arrow-dashed','Przerywana z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
                  ['arrow-wavy','Falowana z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 C8 5,12 17,16 11 C20 5,24 17,28 11 C30 8,31 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
                  ['double-arrow-solid','Podwójna z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="9" x2="32" y2="9" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="13" x2="32" y2="13" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
                  null,
                  ['line-dashed','Przerywana bez grotów',<svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/></svg>],
                  ['line-solid','Ciągła bez grotów',<svg width="40" height="22" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2"/></svg>],
                  null,
                  ['curve-arrow-solid','Krzywa ciągła z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
                  ['curve-arrow-dashed','Krzywa przerywana z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
                  ['curve-arrow-wavy','Krzywa falowana z grotem',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 C9 3,13 13,18 7 C22 2,26 15,30 10 C31 9,31.5 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
                  ['curve-line','Krzywa bez grotów',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 36 11" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                ].map((item, idx) => {
                  if (item === null) return <div key={idx} className="w-px h-7 bg-white/15 mx-1" />;
                  const [type, title, icon] = item;
                  return (
                    <button key={type} onClick={() => setLineType(type)} title={title}
                      className={`px-2 py-1.5 rounded transition-all ${lineType===type ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'}`}>
                      {icon}
                    </button>
                  );
                })}
                <div className="w-px h-7 bg-white/15 mx-1" />
                {/* Line color */}
                <div className="flex items-center gap-1.5 relative" onClick={e => e.stopPropagation()}>
                  <span className="text-sm text-slate-400">Kolor:</span>
                  <input ref={lineColorInputRef} type="color" value={lineColor}
                    onChange={e => { setLineColor(e.target.value); setOpenColorPalette(null); }} className="hidden" />
                  <button onClick={e => { e.stopPropagation(); setOpenColorPalette(openColorPalette==='line' ? null : 'line'); }}
                    className="w-7 h-7 rounded border-2 border-white/20 hover:border-white/40 transition-all"
                    style={{ backgroundColor: lineColor }} title="Kolor linii" />
                  {openColorPalette === 'line' && (
                    <div className="absolute top-full mt-1 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-1.5 flex gap-1 shadow-xl z-50" onClick={e=>e.stopPropagation()}>
                      {quickColorPalette.map(c => (
                        <button key={c.color} onClick={() => { setLineColor(c.color); setOpenColorPalette(null); }}
                          className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all"
                          style={{ backgroundColor: c.color }} title={c.name} />
                      ))}
                      <button onClick={() => lineColorInputRef.current?.click()}
                        className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                        RGB
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Zone options */}
            {drawingTool === 'zone' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 font-medium">Typ:</span>
                {[
                  ['rectangle','Prostokąt',<svg width="40" height="22" viewBox="0 0 40 22"><rect x="4" y="3" width="32" height="16" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                  ['circle','Koło',<svg width="40" height="22" viewBox="0 0 40 22"><circle cx="20" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                  ['polygon','Wielokąt',<svg width="40" height="22" viewBox="0 0 40 22"><path d="M20 3 L35 9 L30 19 L10 19 L5 9 Z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
                ].map(([type, title, icon]) => (
                  <button key={type} onClick={() => setZoneType(type)} title={title}
                    className={`p-1.5 rounded-lg transition-all ${zoneType===type ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'}`}>
                    {icon}
                  </button>
                ))}
                <div className="w-px h-7 bg-white/15 mx-1" />
                {/* Zone color */}
                <div className="flex items-center gap-1.5 relative" onClick={e => e.stopPropagation()}>
                  <span className="text-sm text-slate-400">Kolor:</span>
                  <input ref={zoneColorInputRef} type="color" value={zoneColor}
                    onChange={e => { setZoneColor(e.target.value); setOpenColorPalette(null); }} className="hidden" />
                  <button onClick={e => { e.stopPropagation(); setOpenColorPalette(openColorPalette==='zone' ? null : 'zone'); }}
                    className="w-7 h-7 rounded border-2 border-white/20 hover:border-white/40 transition-all"
                    style={{ backgroundColor: zoneColor }} title="Kolor strefy" />
                  {openColorPalette === 'zone' && (
                    <div className="absolute top-full mt-1 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-1.5 flex gap-1 shadow-xl z-50" onClick={e=>e.stopPropagation()}>
                      {quickColorPalette.map(c => (
                        <button key={c.color} onClick={() => { setZoneColor(c.color); setOpenColorPalette(null); }}
                          className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all"
                          style={{ backgroundColor: c.color }} title={c.name} />
                      ))}
                      <button onClick={() => zoneColorInputRef.current?.click()}
                        className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                        RGB
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">Przezroczystość:</span>
                  <input type="range" min={0} max={1} step={0.05} value={zoneOpacity}
                    onChange={e => setZoneOpacity(parseFloat(e.target.value))} className="w-20" />
                  <span className="text-xs text-slate-400 w-8">{Math.round(zoneOpacity*100)}%</span>
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

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Floating color picker ── */}
        {colorPicker && colorPickerItem && (
          <div className="fixed z-50 bg-slate-800 border border-white/20 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
            style={{ left: colorPicker.screenX, top: colorPicker.screenY, transform:'translate(-50%,12px)', minWidth:150 }}>
            <p className="text-xs font-semibold text-slate-300">Kolor elementu</p>
            <input type="color" value={colorPickerItem.color || '#ffffff'}
              onChange={e => setItems(prev => prev.map(i => i.id===colorPicker.id ? {...i,color:e.target.value} : i))}
              className="w-full h-9 rounded cursor-pointer border border-white/20 bg-transparent" />
            <button onClick={() => setColorPicker(null)}
              className="text-xs text-slate-400 hover:text-white py-1 hover:bg-white/10 rounded transition-all">
              Zamknij
            </button>
          </div>
        )}

        {/* ── Left panel ── */}
        <div className="w-56 bg-slate-950/80 border-r border-white/10 flex flex-col overflow-y-auto">
          {/* Mode toggle */}
          <div className="p-3 border-b border-white/10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tryb</p>
            <div className="flex gap-1">
              <button onClick={() => { setIsDrawingMode(false); setCurrentLine(null); setCurrentZone(null); setPolygonPoints([]); }}
                className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all ${!isDrawingMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                ↖ Zaznacz
              </button>
              <button onClick={() => setIsDrawingMode(true)}
                className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all ${isDrawingMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                ✏️ Rysuj
              </button>
            </div>
          </div>

          {/* Team colors */}
          <div className="p-3 border-b border-white/10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kolory drużyn</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input type="color" value={teamAColor}
                  onChange={e => { setTeamAColor(e.target.value); setItems(prev => prev.map(i => i.team==='A' ? {...i,color:e.target.value} : i)); }}
                  className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
                <span className="text-sm text-slate-300">Drużyna A</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={teamBColor}
                  onChange={e => { setTeamBColor(e.target.value); setItems(prev => prev.map(i => i.team==='B' ? {...i,color:e.target.value} : i)); }}
                  className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent" />
                <span className="text-sm text-slate-300">Drużyna B</span>
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="p-3 flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sprzęt</p>
            <div className="flex flex-col gap-1">
              {EQUIPMENT.map((eq, idx) => (
                <button key={idx} onClick={() => addItem(eq)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-200 bg-white/5 hover:bg-white/15 transition-all text-left active:scale-95">
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
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight:'100%', maxWidth:'100%', aspectRatio:`${FIELD_W}/${FIELD_H}` }}>
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
                style={{ display:'block', maxWidth:'100%', maxHeight:'100%',
                  cursor: isDrawingMode ? 'crosshair' : 'default', touchAction:'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-52 bg-slate-950/80 border-l border-white/10 flex flex-col p-3 gap-3 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zaznaczony</p>

          {selectedLineIndex !== null && lines[selectedLineIndex] ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-medium text-white">Linia</p>
                <p className="text-xs text-slate-400">{lines[selectedLineIndex].type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={lines[selectedLineIndex].color || '#000000'}
                  onChange={e => setLines(prev => { const u=[...prev]; u[selectedLineIndex]={...u[selectedLineIndex],color:e.target.value}; return u; })}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>
              <button onClick={deleteSelected}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all">
                <Trash2 size={14} /> Usuń linię
              </button>
            </div>
          ) : selectedZoneIndex !== null && zones[selectedZoneIndex] ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-medium text-white">Strefa</p>
                <p className="text-xs text-slate-400">{zones[selectedZoneIndex].type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={zones[selectedZoneIndex].color || '#ff0000'}
                  onChange={e => setZones(prev => { const u=[...prev]; u[selectedZoneIndex]={...u[selectedZoneIndex],color:e.target.value}; return u; })}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Przezroczystość</p>
                <input type="range" min={0} max={1} step={0.05}
                  value={zones[selectedZoneIndex].opacity || 0.3}
                  onChange={e => setZones(prev => { const u=[...prev]; u[selectedZoneIndex]={...u[selectedZoneIndex],opacity:parseFloat(e.target.value)}; return u; })}
                  className="w-full" />
              </div>
              <button onClick={deleteSelected}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all">
                <Trash2 size={14} /> Usuń strefę
              </button>
            </div>
          ) : selectedItem ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-medium text-white capitalize">{selectedItem.type}</p>
                {selectedItem.type === 'player' && <p className="text-xs text-slate-400">Drużyna {selectedItem.team}</p>}
              </div>

              {selectedItem.type === 'player' && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Numer / Imię</p>
                  <input type="text" value={selectedItem.label ?? ''}
                    onChange={e => setItems(prev => prev.map(i => i.id===selectedId ? {...i,label:e.target.value} : i))}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white"
                    placeholder="np. 10 lub Jan" />
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 mb-1">Kolor</p>
                <input type="color" value={selectedItem.color || '#ffffff'}
                  onChange={e => setItems(prev => prev.map(i => i.id===selectedId ? {...i,color:e.target.value} : i))}
                  className="w-full h-8 rounded cursor-pointer border border-white/20 bg-transparent" />
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Rozmiar</p>
                <input type="range" min={0.4} max={2.5} step={0.05} value={selectedItem.scale || 1}
                  onChange={e => setItems(prev => prev.map(i => i.id===selectedId ? {...i,scale:parseFloat(e.target.value)} : i))}
                  className="w-full" />
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Obrót&nbsp;
                  <span className="text-slate-500">{Math.round(((selectedItem.rotation||0)*180)/Math.PI)}°</span>
                </p>
                <input type="range" min={0} max={Math.PI*2} step={0.05} value={selectedItem.rotation || 0}
                  onChange={e => setItems(prev => prev.map(i => i.id===selectedId ? {...i,rotation:parseFloat(e.target.value)} : i))}
                  className="w-full" />
                <p className="text-xs text-slate-500 mt-0.5">lub przeciągnij niebieską rączkę</p>
              </div>

              <button onClick={deleteSelected}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all">
                <Trash2 size={14} /> Usuń element
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 leading-relaxed">
              Kliknij element, linię lub strefę.<br /><br />
              Dwuklik → zmień kolor.<br /><br />
              Przeciągnij niebieską rączkę → obróć.<br /><br />
              <kbd className="bg-white/10 px-1 rounded">Delete</kbd> — usuń zaznaczony
            </div>
          )}

          <div className="mt-auto border-t border-white/10 pt-3 flex flex-col gap-1">
            <p className="text-xs text-slate-400">Sprzęt: {items.length} | Linie: {lines.length} | Strefy: {zones.length}</p>
            {(items.length > 0 || lines.length > 0 || zones.length > 0) && (
              <button
                onClick={() => { setItems([]); setLines([]); setZones([]); setSelectedId(null); setSelectedLineIndex(null); setSelectedZoneIndex(null); setPlayerCountA(0); setPlayerCountB(0); setColorPicker(null); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-400 transition-all">
                <Trash2 size={12} /> Wyczyść wszystko
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
