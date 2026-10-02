import { describe, it, expect } from 'vitest';
import {
  isPointNearLine, isPointInZone, isPointNearPolygonVertex, isPointNearLineEnd, isPointNearControlPoint,
  getZoneHandles, hitZoneHandle, resizeZone, rectangleToPolygon, zoneHandleCursor,
} from './geometry.js';

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

describe('uchwyty stref (zmiana rozmiaru)', () => {
  const rect = { type: 'rectangle', x: 100, y: 100, width: 200, height: 100 };
  const circle = { type: 'circle', centerX: 300, centerY: 300, radius: 50 };

  it('prostokąt ma 8 uchwytów: rogi i środki boków', () => {
    const ids = getZoneHandles(rect).map(h => h.id).sort();
    expect(ids).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w']);
    expect(getZoneHandles(rect).find(h => h.id === 'se')).toMatchObject({ x: 300, y: 200 });
  });

  it('uchwyty liczone są poprawnie dla prostokąta narysowanego "od tyłu" (ujemna szerokość)', () => {
    const reversed = { type: 'rectangle', x: 300, y: 200, width: -200, height: -100 };
    expect(getZoneHandles(reversed).find(h => h.id === 'nw')).toMatchObject({ x: 100, y: 100 });
  });

  it('koło ma 4 uchwyty na obwodzie, wielokąt nie ma żadnego', () => {
    expect(getZoneHandles(circle)).toHaveLength(4);
    expect(getZoneHandles(circle).find(h => h.id === 'e')).toMatchObject({ x: 350, y: 300 });
    expect(getZoneHandles({ type: 'polygon', points: [] })).toEqual([]);
  });

  it('hitZoneHandle trafia uchwyt w promieniu tolerancji i pudłuje poza nim', () => {
    expect(hitZoneHandle(302, 198, rect)).toBe('se');
    expect(hitZoneHandle(200, 150, rect)).toBeNull();
    expect(hitZoneHandle(320, 200, rect, 25)).toBe('se');
  });

  it('przeciągnięcie rogu zmienia rozmiar, a przeciwległy róg zostaje', () => {
    expect(resizeZone(rect, 'se', 400, 260)).toMatchObject({ x: 100, y: 100, width: 300, height: 160 });
    expect(resizeZone(rect, 'nw', 50, 40)).toMatchObject({ x: 50, y: 40, width: 250, height: 160 });
  });

  it('uchwyt boku zmienia tylko jeden wymiar', () => {
    expect(resizeZone(rect, 'e', 500, 999)).toMatchObject({ x: 100, y: 100, width: 400, height: 100 });
    expect(resizeZone(rect, 'n', 999, 50)).toMatchObject({ x: 100, y: 50, width: 200, height: 150 });
  });

  it('przeciągnięcie za przeciwległy róg odwraca prostokąt zamiast dać ujemny rozmiar', () => {
    const r = resizeZone(rect, 'se', 40, 60);
    expect(r).toMatchObject({ x: 40, y: 60, width: 60, height: 40 });
  });

  it('nie pozwala zmniejszyć strefy poniżej 10 px', () => {
    expect(resizeZone(rect, 'se', 101, 101)).toMatchObject({ width: 10, height: 10 });
    expect(resizeZone(circle, 'n', 300, 299).radius).toBe(10);
  });

  it('uchwyt koła ustawia promień na odległość od środka', () => {
    expect(resizeZone(circle, 'e', 380, 300).radius).toBe(80);
  });

  it('zachowuje kolor i krycie podczas zmiany rozmiaru', () => {
    const styled = { ...rect, color: '#00ff00', opacity: 0.5, id: 7 };
    expect(resizeZone(styled, 'se', 400, 300)).toMatchObject({ color: '#00ff00', opacity: 0.5, id: 7 });
  });

  it('rectangleToPolygon zamienia prostokąt w 4 rogi zgodnie z ruchem wskazówek zegara', () => {
    const poly = rectangleToPolygon({ ...rect, color: '#f00', id: 3 });
    expect(poly).toMatchObject({ type: 'polygon', color: '#f00', id: 3 });
    expect(poly.points).toEqual([{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 200 }, { x: 100, y: 200 }]);
    expect(poly).not.toHaveProperty('width');
  });

  it('kursor odpowiada kierunkowi uchwytu', () => {
    expect(zoneHandleCursor('nw')).toBe('nwse-resize');
    expect(zoneHandleCursor('ne')).toBe('nesw-resize');
    expect(zoneHandleCursor('e')).toBe('ew-resize');
    expect(zoneHandleCursor('x')).toBe('default');
  });
});

describe('końce linii i punkt kontrolny krzywej', () => {
  const line = { type: 'arrow-solid', startX: 0, startY: 0, endX: 100, endY: 0 };
  const curve = { type: 'curve-arrow-solid', startX: 0, startY: 0, endX: 100, endY: 0, controlX: 50, controlY: -40 };

  it('rozpoznaje początek i koniec linii', () => {
    expect(isPointNearLineEnd(3, 2, line)).toBe('start');
    expect(isPointNearLineEnd(98, 1, line)).toBe('end');
    expect(isPointNearLineEnd(50, 0, line)).toBeNull();
  });

  it('punkt kontrolny dotyczy tylko krzywych', () => {
    expect(isPointNearControlPoint(50, -40, curve)).toBe(true);
    expect(isPointNearControlPoint(50, -40, line)).toBe(false);
  });

  it('wykrywa punkt na wygiętej krzywej, a nie na prostej między końcami', () => {
    expect(isPointNearLine(50, -20, curve)).toBe(true);
    expect(isPointNearLine(50, 0, curve)).toBe(false);
  });
});
