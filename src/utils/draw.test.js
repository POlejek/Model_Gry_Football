import { describe, it, expect, beforeEach } from 'vitest';
import {
  drawField, drawPlayer, drawBall, drawZone, drawLine, drawPlayerLabel, interpolatePlayers, findMatchingPlayer,
} from './draw.js';

// Mock canvas context
function makeCtx(width = 700, height = 1080) {
  const canvas = { width, height };
  const calls = [];
  const ctx = new Proxy({
    canvas,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    rect: () => {},
    strokeText: () => {},
    ellipse: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    closePath: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    setLineDash: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    fillText: () => {},
    measureText: (t) => ({ width: t.length * 7 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    lineCap: '',
    lineJoin: '',
  }, { set: (t, k, v) => { t[k] = v; return true; } });
  return { ctx, calls };
}

describe('drawField', () => {
  it.each(['5v5', '7v7', '9v9', '11v11'])('rysuje boisko %s bez błędów', (format) => {
    const { ctx } = makeCtx();
    expect(() => drawField(ctx, format)).not.toThrow();
  });
});

describe('drawBall', () => {
  it('nie rzuca błędu dla standardowej piłki', () => {
    const { ctx } = makeCtx();
    expect(() => drawBall(ctx, { x: 350, y: 540 })).not.toThrow();
  });
});

describe('drawPlayer', () => {
  it('nie rzuca błędu dla zawodnika drużyny', () => {
    const { ctx } = makeCtx();
    const player = { x: 200, y: 400, number: 9, rotation: 0 };
    expect(() => drawPlayer(ctx, player, true)).not.toThrow();
  });

  it('nie rzuca błędu dla zawodnika z własnym kolorem', () => {
    const { ctx } = makeCtx();
    const player = { x: 300, y: 500, number: 1, rotation: 0 };
    expect(() => drawPlayer(ctx, player, false, '#ff0000')).not.toThrow();
  });
});

describe('drawZone', () => {
  it('nie rzuca błędu dla prostokąta', () => {
    const { ctx } = makeCtx();
    const zone = { type: 'rectangle', x: 100, y: 100, width: 200, height: 150, color: '#ff0000', opacity: 0.3 };
    expect(() => drawZone(ctx, zone)).not.toThrow();
  });

  it('nie rzuca błędu dla koła', () => {
    const { ctx } = makeCtx();
    const zone = { type: 'circle', centerX: 350, centerY: 540, radius: 80, color: '#00ff00', opacity: 0.3 };
    expect(() => drawZone(ctx, zone)).not.toThrow();
  });
});

describe('drawLine', () => {
  it('nie rzuca błędu dla linii prostej z grotem', () => {
    const { ctx } = makeCtx();
    const line = { startX: 100, startY: 100, endX: 300, endY: 300, type: 'arrow-solid', color: '#000' };
    expect(() => drawLine(ctx, line)).not.toThrow();
  });

  it('nie rzuca błędu dla linii przerywanej', () => {
    const { ctx } = makeCtx();
    const line = { startX: 100, startY: 100, endX: 300, endY: 300, type: 'arrow-dashed', color: '#000' };
    expect(() => drawLine(ctx, line)).not.toThrow();
  });
});

describe('interpolatePlayers (animacja między klatkami)', () => {
  const frameA = {
    team: [{ id: 'gk', x: 0, y: 0, rotation: 0 }, { id: 'st', x: 100, y: 100, rotation: 0 }],
    opponent: [{ id: 'ogk', x: 50, y: 50, rotation: Math.PI }],
    ball: { x: 0, y: 0 },
  };
  const frameB = {
    team: [{ id: 'gk', x: 100, y: 0, rotation: 0 }, { id: 'st', x: 300, y: 100, rotation: 0 }],
    opponent: [{ id: 'ogk', x: 50, y: 150, rotation: Math.PI }],
    ball: { x: 200, y: 100 },
  };

  it('na początku i na końcu zwraca pozycje z klatek', () => {
    expect(interpolatePlayers(frameA, frameB, 0).team[1]).toMatchObject({ x: 100, y: 100 });
    expect(interpolatePlayers(frameA, frameB, 1).team[1]).toMatchObject({ x: 300, y: 100 });
  });

  it('w połowie przejścia stawia zawodników i piłkę w połowie drogi', () => {
    const mid = interpolatePlayers(frameA, frameB, 0.5);
    expect(mid.team[0]).toMatchObject({ x: 50, y: 0 });
    expect(mid.opponent[0]).toMatchObject({ x: 50, y: 100 });
    expect(mid.ball).toEqual({ x: 100, y: 50 });
  });

  it('dopasowuje zawodników po id, nawet gdy kolejność w klatce jest inna', () => {
    const reordered = { ...frameB, team: [...frameB.team].reverse() };
    const mid = interpolatePlayers(frameA, reordered, 0.5);
    expect(mid.team.find(p => p.id === 'st')).toMatchObject({ x: 200, y: 100 });
  });

  it('nie rzuca błędu, gdy w następnej klatce brakuje zawodnika lub piłki (stare/importowane schematy)', () => {
    const broken = { team: [{ id: 'gk', x: 100, y: 0 }], opponent: [] };
    expect(() => interpolatePlayers(frameA, broken, 0.5)).not.toThrow();
    const mid = interpolatePlayers(frameA, broken, 0.5);
    expect(mid.team).toHaveLength(2);
    expect(mid.ball).toEqual({ x: 0, y: 0 });
  });

  it('obraca zawodnika krótszą drogą (przez 0, a nie przez cały obrót)', () => {
    const a = { team: [{ id: 'x', x: 0, y: 0, rotation: 0.1 }], opponent: [], ball: { x: 0, y: 0 } };
    const b = { team: [{ id: 'x', x: 0, y: 0, rotation: 2 * Math.PI - 0.1 }], opponent: [], ball: { x: 0, y: 0 } };
    expect(interpolatePlayers(a, b, 0.5).team[0].rotation).toBeCloseTo(0, 5);
  });

  it('findMatchingPlayer szuka po id, a gdy go brak — po pozycji na liście', () => {
    const list = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    expect(findMatchingPlayer(list, { id: 'b' }, 0).n).toBe(2);
    expect(findMatchingPlayer(list, { id: 'zzz' }, 1).n).toBe(2);
    expect(findMatchingPlayer(undefined, { id: 'a' }, 0)).toBeUndefined();
  });
});

describe('drawPlayerLabel (czytelność numeru/imienia)', () => {
  const recorder = () => {
    const log = { fills: [], strokes: 0 };
    const ctx = {
      font: '', textAlign: '', textBaseline: '', lineJoin: '', lineWidth: 0, strokeStyle: '', fillStyle: '', shadowColor: '',
      save() {}, restore() {},
      measureText: (t) => ({ width: t.length * 8 }),
      strokeText() { log.strokes++; },
      fillText(t) { log.fills.push({ text: t, color: this.fillStyle }); },
    };
    return { ctx, log };
  };

  it('krótki numer na ciemnym kole jest biały, bez obwódki', () => {
    const { ctx, log } = recorder();
    drawPlayerLabel(ctx, '10', 0, 0, 18, '#1d4ed8');
    expect(log.fills[0]).toEqual({ text: '10', color: '#ffffff' });
    expect(log.strokes).toBe(0);
  });

  it('imię wychodzące poza koło jest ciemne z białą obwódką (widoczne na białym boisku)', () => {
    const { ctx, log } = recorder();
    drawPlayerLabel(ctx, 'Lewandowski', 0, 0, 18, '#1d4ed8');
    expect(log.fills[0].color).toBe('#0f172a');
    expect(log.strokes).toBe(1);
  });

  it('na jasnym kole (żółtym) krótki napis jest ciemny', () => {
    const { ctx, log } = recorder();
    drawPlayerLabel(ctx, '7', 0, 0, 18, '#facc15');
    expect(log.fills[0].color).toBe('#0f172a');
  });

  it('pusty napis niczego nie rysuje', () => {
    const { ctx, log } = recorder();
    drawPlayerLabel(ctx, '', 0, 0, 18, '#000000');
    drawPlayerLabel(ctx, undefined, 0, 0, 18, '#000000');
    expect(log.fills).toHaveLength(0);
  });
});

describe('drawLine — wszystkie typy linii z paska narzędzi', () => {
  const types = ['arrow-solid', 'arrow-dashed', 'arrow-wavy', 'double-arrow-solid', 'line-dashed', 'line-solid',
    'curve-arrow-solid', 'curve-arrow-dashed', 'curve-arrow-wavy', 'curve-line', 'solid', 'dashed', 'arrow', 'double-arrow'];

  it.each(types)('rysuje "%s" (zwykłą i zaznaczoną, także z punktem kontrolnym)', (type) => {
    const { ctx } = makeCtx();
    const line = { startX: 50, startY: 50, endX: 400, endY: 300, type, color: '#123456' };
    expect(() => drawLine(ctx, line)).not.toThrow();
    expect(() => drawLine(ctx, { ...line, controlX: 200, controlY: 50 }, true)).not.toThrow();
  });

  it('bardzo krótka linia (kliknięcie bez przeciągnięcia) nie rzuca błędu', () => {
    const { ctx } = makeCtx();
    expect(() => drawLine(ctx, { startX: 10, startY: 10, endX: 10, endY: 10, type: 'arrow-wavy', color: '#000' })).not.toThrow();
  });
});

describe('drawZone — zaznaczenie i uchwyty', () => {
  it.each([
    ['prostokąt', { type: 'rectangle', x: 10, y: 10, width: 100, height: 50 }],
    ['koło', { type: 'circle', centerX: 100, centerY: 100, radius: 40 }],
    ['wielokąt', { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 40 }] }],
  ])('zaznaczony %s rysuje się bez błędu', (_, zone) => {
    const { ctx } = makeCtx();
    expect(() => drawZone(ctx, { ...zone, color: '#f00', opacity: 0.3 }, true)).not.toThrow();
    expect(() => drawZone(ctx, { ...zone, color: '#f00', opacity: 0.3 }, true, undefined, undefined, 0)).not.toThrow();
  });
});

describe('drawPlayer — zaznaczony zawodnik', () => {
  it('rysuje rączkę obrotu tylko dla zaznaczonego zawodnika właściwej drużyny', () => {
    const { ctx } = makeCtx();
    const player = { id: 'st', x: 200, y: 300, number: '9', rotation: 1 };
    expect(() => drawPlayer(ctx, player, true, null, '#00f', '#f00', '5v5', { id: 'st', type: 'team' })).not.toThrow();
    expect(() => drawPlayer(ctx, player, false, null, '#00f', '#f00', '9v9', { id: 'st', type: 'team' })).not.toThrow();
  });
});
