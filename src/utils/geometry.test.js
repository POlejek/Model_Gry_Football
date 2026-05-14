import { describe, it, expect } from 'vitest';
import { isPointNearLine, isPointInZone, isPointNearPolygonVertex } from './geometry.js';

describe('isPointNearLine', () => {
  const straightLine = { type: 'arrow-solid', startX: 0, startY: 0, endX: 100, endY: 0 };

  it('wykrywa punkt blisko linii prostej', () => {
    expect(isPointNearLine(50, 3, straightLine)).toBe(true);
  });

  it('ignoruje punkt daleko od linii', () => {
    expect(isPointNearLine(50, 50, straightLine)).toBe(false);
  });

  it('wykrywa punkt na końcu linii', () => {
    expect(isPointNearLine(0, 0, straightLine, 10)).toBe(true);
  });
});

describe('isPointInZone', () => {
  it('zwraca true dla punktu wewnątrz prostokąta', () => {
    const zone = { type: 'rectangle', x: 100, y: 100, width: 200, height: 150 };
    expect(isPointInZone(150, 150, zone)).toBe(true);
  });

  it('zwraca false dla punktu poza prostokątem', () => {
    const zone = { type: 'rectangle', x: 100, y: 100, width: 200, height: 150 };
    expect(isPointInZone(50, 50, zone)).toBe(false);
  });

  it('zwraca true dla punktu wewnątrz koła', () => {
    const zone = { type: 'circle', centerX: 200, centerY: 200, radius: 50 };
    expect(isPointInZone(210, 210, zone)).toBe(true);
  });

  it('zwraca false dla punktu poza kołem', () => {
    const zone = { type: 'circle', centerX: 200, centerY: 200, radius: 50 };
    expect(isPointInZone(300, 300, zone)).toBe(false);
  });
});

describe('isPointNearPolygonVertex', () => {
  it('wykrywa punkt blisko wierzchołka', () => {
    const zone = { type: 'polygon', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 150, y: 200 }] };
    expect(isPointNearPolygonVertex(102, 101, zone, 10)).not.toBeNull();
  });

  it('zwraca null gdy brak bliskiego wierzchołka', () => {
    const zone = { type: 'polygon', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 150, y: 200 }] };
    expect(isPointNearPolygonVertex(350, 350, zone, 10)).toBeNull();
  });
});
