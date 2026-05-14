import { describe, it, expect, beforeEach } from 'vitest';
import { drawField, drawPlayer, drawBall, drawZone, drawLine } from './draw.js';

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
  it('nie rzuca błędu dla formatu 11v11', () => {
    const { ctx } = makeCtx();
    ctx.canvas._gameFormat = '11v11';
    expect(() => drawField(ctx)).not.toThrow();
  });

  it('nie rzuca błędu dla formatu 7v7', () => {
    const { ctx } = makeCtx();
    expect(() => drawField(ctx)).not.toThrow();
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
