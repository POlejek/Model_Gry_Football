import { describe, it, expect } from 'vitest';
import {
  getPitchSize, normAngle, transformObj, translateObj, transformFrame, fitFramesTo, objectsInRect, findObj,
  interpolateFrames, normalizeDrill, safeFileName, parseDrillFile, toLibraryEntry, equipmentSummary,
  drillSignature, isEmptyScene, emptyFrame, wrapText, DRILL_FORMAT, LIBRARY_FORMAT, LEGACY_PITCH,
} from './drill.js';

const player = (id, x, y, extra = {}) => ({ id, type: 'player', x, y, rotation: 0, scale: 1, team: 'A', label: String(id), ...extra });
const frame = (items = [], lines = [], zones = []) => ({ items, lines, zones });

describe('getPitchSize', () => {
  it.each([
    [{ type: 'full', orientation: 'vertical' }, { w: 700, h: 1080 }],
    [{ type: 'full', orientation: 'horizontal' }, { w: 1080, h: 700 }],
    [{ type: 'half', orientation: 'vertical' }, { w: 700, h: 560 }],
    [{ type: 'third', orientation: 'horizontal' }, { w: 387, h: 700 }],
  ])('%o → %o', (pitch, size) => {
    expect(getPitchSize(pitch)).toEqual(size);
  });

  it('własne pole zachowuje proporcje wymiarów w metrach', () => {
    const { w, h } = getPitchSize({ type: 'custom', orientation: 'vertical', width: 30, length: 40 });
    expect((w - 40) / (h - 40)).toBeCloseTo(30 / 40, 2);
    expect(getPitchSize({ type: 'custom', orientation: 'horizontal', width: 30, length: 40 })).toEqual({ w: h, h: w });
  });
});

describe('normAngle', () => {
  it('sprowadza kąt do przedziału [0, 2π)', () => {
    expect(normAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2);
    expect(normAngle(5 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normAngle(0)).toBe(0);
  });
});

describe('transformacje obiektów', () => {
  it('przesuwa element, linię z punktem kontrolnym i każdy rodzaj strefy', () => {
    expect(translateObj('items', player(1, 10, 20), 5, 5)).toMatchObject({ x: 15, y: 25 });
    const curve = { startX: 0, startY: 0, endX: 10, endY: 0, controlX: 5, controlY: -5 };
    expect(translateObj('lines', curve, 1, 2)).toMatchObject({ startX: 1, startY: 2, endX: 11, endY: 2, controlX: 6, controlY: -3 });
    expect(translateObj('zones', { type: 'circle', centerX: 0, centerY: 0, radius: 5 }, 3, 4)).toMatchObject({ centerX: 3, centerY: 4, radius: 5 });
    expect(translateObj('zones', { type: 'polygon', points: [{ x: 0, y: 0 }] }, 1, 1).points).toEqual([{ x: 1, y: 1 }]);
  });

  it('po transformacji prostokąt ma zawsze dodatnią szerokość i wysokość', () => {
    const z = transformObj('zones', { type: 'rectangle', x: 0, y: 0, width: 10, height: 20 }, (x, y) => [-x, -y]);
    expect(z).toMatchObject({ x: -10, y: -20, width: 10, height: 20 });
  });

  it('przy obrocie boiska obraca zawodników, ale tekst i numery kroków zostają poziome', () => {
    const f = frame([player(1, 0, 0), { id: 2, type: 'text', x: 0, y: 0, rotation: 0, text: 'A' }]);
    const rotated = transformFrame(f, (x, y) => [y, x], Math.PI / 2);
    expect(rotated.items[0].rotation).toBeCloseTo(Math.PI / 2);
    expect(rotated.items[1].rotation).toBe(0);
  });
});

describe('fitFramesTo (zmiana rozmiaru boiska)', () => {
  it('nie rusza elementów, które mieszczą się na nowym boisku', () => {
    const frames = [frame([player(1, 100, 100)])];
    expect(fitFramesTo(frames, 700, 560)).toBe(frames);
  });

  it('przesuwa lub skaluje elementy wystające poza mniejsze boisko', () => {
    const frames = [frame([player(1, 100, 100), player(2, 600, 1000)])];
    const [fitted] = fitFramesTo(frames, 700, 560);
    fitted.items.forEach(i => {
      expect(i.x).toBeGreaterThanOrEqual(30);
      expect(i.y).toBeLessThanOrEqual(560 - 30);
    });
  });

  it('puste klatki zostają bez zmian', () => {
    const frames = [emptyFrame()];
    expect(fitFramesTo(frames, 100, 100)).toBe(frames);
  });
});

describe('zaznaczanie ramką i wyszukiwanie', () => {
  const f = frame(
    [player(1, 50, 50), player(2, 500, 500)],
    [{ id: 3, startX: 10, startY: 10, endX: 90, endY: 90, type: 'arrow-solid' }],
    [{ id: 4, type: 'circle', centerX: 50, centerY: 50, radius: 20 }],
  );

  it('zaznacza tylko obiekty leżące w całości w ramce (w dowolnym kierunku przeciągania)', () => {
    expect(objectsInRect(f, { x0: 0, y0: 0, x1: 100, y1: 100 }).sort()).toEqual([1, 3, 4]);
    expect(objectsInRect(f, { x0: 100, y0: 100, x1: 0, y1: 0 }).sort()).toEqual([1, 3, 4]);
    expect(objectsInRect(f, { x0: 0, y0: 0, x1: 60, y1: 60 })).toEqual([1]);
  });

  it('findObj zwraca rodzaj obiektu', () => {
    expect(findObj(f, 3).kind).toBe('lines');
    expect(findObj(f, 4).kind).toBe('zones');
    expect(findObj(f, 999)).toBeNull();
  });
});

describe('interpolateFrames (odtwarzanie animacji ćwiczenia)', () => {
  const frames = [
    frame([player(1, 0, 0), player(2, 0, 0)]),
    frame([player(1, 100, 0), player(3, 50, 50)]),
  ];

  it('w punktach całkowitych zwraca dokładnie klatki', () => {
    expect(interpolateFrames(frames, 0)).toBe(frames[0]);
    expect(interpolateFrames(frames, 1)).toBe(frames[1]);
    expect(interpolateFrames(frames, 5)).toBe(frames[1]);
  });

  it('w połowie przejścia przesuwa zawodnika do połowy drogi (z wygładzeniem)', () => {
    const mid = interpolateFrames(frames, 0.5);
    expect(mid.items.find(i => i.id === 1).x).toBeCloseTo(50);
    expect(interpolateFrames(frames, 0.25).items.find(i => i.id === 1).x).toBeLessThan(25);
  });

  it('element usunięty w kolejnej klatce znika, a dodany — pojawia się (przezroczystość)', () => {
    const mid = interpolateFrames(frames, 0.5);
    expect(mid.items.find(i => i.id === 2)._alpha).toBeCloseTo(0.5);
    expect(mid.items.find(i => i.id === 3)._alpha).toBeCloseTo(0.5);
  });

  it('obrót idzie krótszą drogą', () => {
    const rot = [frame([player(1, 0, 0, { rotation: 0.1 })]), frame([player(1, 0, 0, { rotation: 2 * Math.PI - 0.1 })])];
    expect(interpolateFrames(rot, 0.5).items[0].rotation).toBeCloseTo(0, 5);
  });
});

describe('normalizeDrill (zgodność ze starszymi zapisami)', () => {
  it('pusty obiekt daje jedno puste ćwiczenie z domyślnymi ustawieniami', () => {
    const n = normalizeDrill();
    expect(n.frames).toHaveLength(1);
    expect(isEmptyScene(n.frames)).toBe(true);
    expect(n.pitch).toEqual(LEGACY_PITCH);
    expect(n.nextId).toBe(1);
  });

  it('wczytuje stary format bez klatek (items/lines/zones na wierzchu)', () => {
    const n = normalizeDrill({ items: [{ id: 5, type: 'cone', x: 1, y: 1 }], lines: [{ startX: 0, startY: 0, endX: 1, endY: 1 }] });
    expect(n.frames).toHaveLength(1);
    expect(n.frames[0].items[0].id).toBe(5);
    expect(n.frames[0].lines[0].id).toBe(6);
    expect(n.nextId).toBe(7);
  });

  it('zamienia stary "number" zawodnika na "label" i pomija nieznane typy', () => {
    const n = normalizeDrill({ frames: [frame([{ id: 1, type: 'player', number: 9 }, { id: 2, type: 'arrow' }])] });
    expect(n.frames[0].items).toHaveLength(1);
    expect(n.frames[0].items[0].label).toBe('9');
  });

  it('uzupełnia brakujące pola opisu, zachowując wpisane', () => {
    const n = normalizeDrill({ meta: { objective: 'Pressing' } });
    expect(n.meta.objective).toBe('Pressing');
    expect(n.meta.coachingPoints).toBe('');
  });
});

describe('safeFileName', () => {
  it.each([
    ['Rondo 4v2 + przejście', 'Rondo_4v2_przejscie'],
    ['Wyjście spod pressingu', 'Wyjscie_spod_pressingu'],
    ['ŻÓŁTA KARTKA', 'ZOLTA_KARTKA'],
    ['   ', 'cwiczenie'],
    ['!!!', 'cwiczenie'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(safeFileName(input)).toBe(expected);
  });
});

describe('import plików (parseDrillFile)', () => {
  const drill = { format: DRILL_FORMAT, name: 'Gra 3v3', frames: [frame([player(1, 0, 0)])] };

  it('plik z jednym ćwiczeniem daje jeden wpis biblioteki', () => {
    const [entry] = parseDrillFile(drill, 'gra.json');
    expect(entry.name).toBe('Gra 3v3');
    expect(entry.frames[0].items).toHaveLength(1);
    expect(entry.id).toBeNull();
  });

  it('plik biblioteki daje wszystkie ćwiczenia, z nazwą pliku dla bezimiennych', () => {
    const data = { format: LIBRARY_FORMAT, drills: [{ ...drill, id: 'd1' }, { frames: [emptyFrame()] }, { nonsense: true }] };
    const entries = parseDrillFile(data, 'moja_biblioteka.json');
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('d1');
    expect(entries[1].name).toBe('moja_biblioteka');
  });

  it('nieznany format pliku daje pustą listę', () => {
    expect(parseDrillFile({ hello: 1 }, 'x.json')).toEqual([]);
    expect(parseDrillFile(null, 'x.json')).toEqual([]);
  });

  it('toLibraryEntry odrzuca obiekt bez klatek i elementów', () => {
    expect(toLibraryEntry({ name: 'x' })).toBeNull();
  });
});

describe('equipmentSummary', () => {
  it('liczy każdy sprzęt raz, nawet gdy występuje w wielu klatkach; pomija zawodników i opisy', () => {
    const cone = { id: 10, type: 'cone', x: 0, y: 0 };
    const frames = [
      frame([cone, player(1, 0, 0), { id: 11, type: 'text', text: 'A' }]),
      frame([cone, { id: 12, type: 'cone', x: 5, y: 5 }, { id: 13, type: 'ladder', x: 0, y: 0 }]),
    ];
    expect(equipmentSummary(frames)).toBe('Stożek ×2, Drabinka ×1');
  });
});

describe('drillSignature (wykrywanie niezapisanych zmian)', () => {
  const base = { frames: [emptyFrame()], pitch: LEGACY_PITCH, teamAColor: '#000', teamBColor: '#fff', meta: {}, name: 'A' };

  it('zmienia się po zmianie zawartości lub nazwy, ignoruje spacje na końcach nazwy', () => {
    const sig = drillSignature(base);
    expect(drillSignature({ ...base, name: ' A ' })).toBe(sig);
    expect(drillSignature({ ...base, name: 'B' })).not.toBe(sig);
    expect(drillSignature({ ...base, frames: [frame([player(1, 0, 0)])] })).not.toBe(sig);
  });
});

describe('wrapText (opis na karcie PNG)', () => {
  const ctx = { measureText: (t) => ({ width: t.length * 10 }) };

  it('łamie wiersze po słowach i zachowuje nowe linie', () => {
    expect(wrapText(ctx, 'aaa bbb ccc', 70)).toEqual(['aaa bbb', 'ccc']);
    expect(wrapText(ctx, 'jeden\ndwa', 1000)).toEqual(['jeden', 'dwa']);
  });
});
