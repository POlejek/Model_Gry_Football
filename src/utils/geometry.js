// Funkcje geometryczne i hit-test canvas — nie zależą od stanu React

export const isPointNearLine = (px, py, line, threshold = 8) => {
    // Dla linii prostych
    if (!line.type.includes('curve')) {
      // Odległość punktu od odcinka
      const A = px - line.startX;
      const B = py - line.startY;
      const C = line.endX - line.startX;
      const D = line.endY - line.startY;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      
      if (lenSq !== 0) param = dot / lenSq;
      
      let xx, yy;
      
      if (param < 0) {
        xx = line.startX;
        yy = line.startY;
      } else if (param > 1) {
        xx = line.endX;
        yy = line.endY;
      } else {
        xx = line.startX + param * C;
        yy = line.startY + param * D;
      }
      
      const dx = px - xx;
      const dy = py - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < threshold;
    } else {
      // Dla linii krzywych - sprawdź punkty wzdłuż krzywej
      const cp = line.controlX !== undefined && line.controlY !== undefined
        ? { x: line.controlX, y: line.controlY }
        : {
            x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
            y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
          };
      
      // Sprawdź wiele punktów wzdłuż krzywej
      for (let t = 0; t <= 1; t += 0.05) {
        const x = (1-t)*(1-t)*line.startX + 2*(1-t)*t*cp.x + t*t*line.endX;
        const y = (1-t)*(1-t)*line.startY + 2*(1-t)*t*cp.y + t*t*line.endY;
        const distance = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
        if (distance < threshold) return true;
      }
      return false;
    }
  };

  // Funkcja sprawdzająca czy punkt jest blisko punktu kontrolnego krzywej
export const isPointNearControlPoint = (px, py, line, threshold = 10) => {
    if (!line.type.includes('curve')) return false;
    
    const cp = line.controlX !== undefined && line.controlY !== undefined
      ? { x: line.controlX, y: line.controlY }
      : {
          x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
          y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
        };
    
    const distance = Math.sqrt((px - cp.x) * (px - cp.x) + (py - cp.y) * (py - cp.y));
    return distance < threshold;
  };

  // Funkcja sprawdzająca czy punkt jest blisko końca linii (do wydłużania)
export const isPointNearLineEnd = (px, py, line, threshold = 12) => {
    const distToStart = Math.sqrt((px - line.startX) * (px - line.startX) + (py - line.startY) * (py - line.startY));
    const distToEnd = Math.sqrt((px - line.endX) * (px - line.endX) + (py - line.endY) * (py - line.endY));
    
    if (distToStart < threshold) return 'start';
    if (distToEnd < threshold) return 'end';
    return null;
  };

  // Funkcja sprawdzająca czy punkt jest wewnątrz strefy
export const isPointInZone = (px, py, zone) => {
    switch (zone.type) {
      case 'rectangle':
        return px >= Math.min(zone.x, zone.x + zone.width) &&
               px <= Math.max(zone.x, zone.x + zone.width) &&
               py >= Math.min(zone.y, zone.y + zone.height) &&
               py <= Math.max(zone.y, zone.y + zone.height);
      
      case 'circle':
        const dx = px - zone.centerX;
        const dy = py - zone.centerY;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
      
      case 'polygon':
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = zone.points.length - 1; i < zone.points.length; j = i++) {
          const xi = zone.points[i].x, yi = zone.points[i].y;
          const xj = zone.points[j].x, yj = zone.points[j].y;
          
          const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      
      default:
        return false;
    }
  };

  // Funkcja sprawdzająca czy punkt jest blisko wierzchołka wielokąta
export const isPointNearPolygonVertex = (px, py, zone, threshold = 10) => {
    if (zone.type !== 'polygon' || !zone.points) return null;
    
    for (let i = 0; i < zone.points.length; i++) {
      const vertex = zone.points[i];
      const distance = Math.sqrt((px - vertex.x) * (px - vertex.x) + (py - vertex.y) * (py - vertex.y));
      if (distance < threshold) {
        return i; // Zwróć indeks wierzchołka
      }
    }
    return null;
  };

  // Funkcja rysująca strefę

// ── Resize handles for rectangle / circle zones ─────────────────────
const rectBounds = (z) => ({
  x0: Math.min(z.x, z.x + z.width), x1: Math.max(z.x, z.x + z.width),
  y0: Math.min(z.y, z.y + z.height), y1: Math.max(z.y, z.y + z.height),
});

// Handle ids are compass directions; corners combine two (e.g. 'nw').
export const getZoneHandles = (zone) => {
  if (zone.type === 'rectangle') {
    const { x0, x1, y0, y1 } = rectBounds(zone);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return [
      { id: 'nw', x: x0, y: y0 }, { id: 'ne', x: x1, y: y0 }, { id: 'se', x: x1, y: y1 }, { id: 'sw', x: x0, y: y1 },
      { id: 'n', x: mx, y: y0 }, { id: 'e', x: x1, y: my }, { id: 's', x: mx, y: y1 }, { id: 'w', x: x0, y: my },
    ];
  }
  if (zone.type === 'circle') {
    const { centerX: cx, centerY: cy, radius: r } = zone;
    return [{ id: 'n', x: cx, y: cy - r }, { id: 'e', x: cx + r, y: cy }, { id: 's', x: cx, y: cy + r }, { id: 'w', x: cx - r, y: cy }];
  }
  return [];
};

export const hitZoneHandle = (px, py, zone, threshold = 10) =>
  getZoneHandles(zone).find(h => Math.hypot(px - h.x, py - h.y) < threshold)?.id ?? null;

export const zoneHandleCursor = (handle) => ({
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}[handle] || 'default');

// Resizes from the zone as it was when the drag started; the opposite side stays put.
export const resizeZone = (original, handle, px, py) => {
  if (original.type === 'circle') {
    return { ...original, radius: Math.max(10, Math.hypot(px - original.centerX, py - original.centerY)) };
  }
  let { x0, x1, y0, y1 } = rectBounds(original);
  if (handle.includes('w')) x0 = px;
  if (handle.includes('e')) x1 = px;
  if (handle.includes('n')) y0 = py;
  if (handle.includes('s')) y1 = py;
  const nx0 = Math.min(x0, x1), ny0 = Math.min(y0, y1);
  return { ...original, x: nx0, y: ny0, width: Math.max(10, Math.abs(x1 - x0)), height: Math.max(10, Math.abs(y1 - y0)) };
};

// "Free corners": the rectangle becomes a 4-point polygon whose vertices move independently.
export const rectangleToPolygon = (zone) => {
  const { x0, x1, y0, y1 } = rectBounds(zone);
  const { x, y, width, height, ...rest } = zone;
  return { ...rest, type: 'polygon', points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] };
};
