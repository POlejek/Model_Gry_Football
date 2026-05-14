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
