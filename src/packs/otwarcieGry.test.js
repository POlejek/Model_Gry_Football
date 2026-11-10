import { describe, it, expect } from 'vitest';
import { FORMATS, PACKS, buildPack } from './otwarcieGry.js';
import { normalizeDrill, getPitchSize, TYPE_LABELS, zoneBBox } from '../utils/drill.js';
import { applyImport, KEYS } from '../utils/backup.js';
import { LINE_TYPES } from '../utils/lineTypes.jsx';

const MONDAY = '2026-11-09';
const lineTypes = new Set(LINE_TYPES.filter(Boolean).map(t => t[0]));

describe.each(Object.keys(FORMATS))('gotowy tydzień „Otwarcie gry” %s', (format) => {
  const pack = buildPack(format, MONDAY);

  it('ma 9 ćwiczeń i 3 konspekty w poniedziałek, środę i piątek', () => {
    expect(pack.drills).toHaveLength(9);
    expect(pack.sessions.map(s => s.date)).toEqual(['2026-11-09', '2026-11-11', '2026-11-13']);
    expect(new Set([...pack.drills, ...pack.sessions].map(x => x.id)).size).toBe(12);
  });

  it('każde ćwiczenie ma opis, a rysunek mieści się na swoim boisku', () => {
    pack.drills.forEach(d => {
      const n = normalizeDrill(d);
      const { w, h } = getPitchSize(n.pitch);
      ['objective', 'organization', 'description', 'coachingPoints', 'variations', 'load', 'players', 'area', 'category', 'duration'].forEach(f => {
        expect(String(d.meta[f]).trim(), `${d.name}: ${f}`).not.toBe('');
      });
      expect(d.meta.phases).toEqual(['Atak-Otwarcie']);
      expect(n.frames[0].items.length, `${d.name}: elementy`).toBe(d.frames[0].items.length); // no unknown item types dropped
      n.frames[0].items.forEach(i => {
        expect(TYPE_LABELS[i.type]).toBeTruthy();
        expect(i.x, `${d.name}: ${i.type} x`).toBeGreaterThanOrEqual(0);
        expect(i.x, `${d.name}: ${i.type} x`).toBeLessThanOrEqual(w);
        expect(i.y, `${d.name}: ${i.type} y`).toBeGreaterThanOrEqual(0);
        expect(i.y, `${d.name}: ${i.type} y`).toBeLessThanOrEqual(h);
      });
      n.frames[0].lines.forEach(l => {
        expect(lineTypes.has(l.type)).toBe(true);
        [l.startX, l.endX].forEach(x => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(w); });
        [l.startY, l.endY].forEach(y => { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(h); });
      });
      n.frames[0].zones.forEach(z => { const b = zoneBBox(z); expect(b[2]).toBeLessThanOrEqual(w); expect(b[3]).toBeLessThanOrEqual(h); });
      // no two players on the same spot
      const players = n.frames[0].items.filter(i => i.type === 'player');
      players.forEach((p, i) => players.slice(i + 1).forEach(q => {
        expect(Math.hypot(p.x - q.x, p.y - q.y), `${d.name}: zawodnicy ${p.team}${p.label} i ${q.team}${q.label} na sobie`).toBeGreaterThanOrEqual(30);
      }));
    });
  });

  it('konspekty mają części treningu i wskazują istniejące ćwiczenia', () => {
    const ids = new Set(pack.drills.map(d => d.id));
    const used = new Set();
    pack.sessions.forEach(s => {
      expect(s.blocks.map(b => b.part)).toEqual(['wstepna', 'glowna', 'glowna', 'glowna', 'koncowa']);
      s.blocks.filter(b => b.drillId).forEach(b => { expect(ids.has(b.drillId)).toBe(true); used.add(b.drillId); });
      const total = s.blocks.reduce((sum, b) => sum + Number(b.minutes), 0);
      expect(total).toBeGreaterThanOrEqual(60);
      expect(total).toBeLessThanOrEqual(90);
    });
    expect(used.size).toBe(9);
  });

  it('dodanie pakietu nie rusza treningów trenera, a drugie dodanie niczego nie dubluje', () => {
    localStorage.setItem(KEYS.drills, JSON.stringify([{ id: 'moje', name: 'Moje ćwiczenie', frames: [{ items: [], lines: [], zones: [] }] }]));
    localStorage.setItem(KEYS.sessions, JSON.stringify([{ id: 'moj-konspekt', title: 'Mój', blocks: [] }]));
    expect(applyImport(pack, { drills: 'add', sessions: 'add' }).ok).toBe(true);
    applyImport(buildPack(format, MONDAY), { drills: 'add', sessions: 'add' });
    const drills = JSON.parse(localStorage.getItem(KEYS.drills));
    const sessions = JSON.parse(localStorage.getItem(KEYS.sessions));
    expect(drills).toHaveLength(10);
    expect(sessions).toHaveLength(4);
    expect(drills.some(d => d.id === 'moje')).toBe(true);
    expect(sessions.some(s => s.id === 'moj-konspekt')).toBe(true);
  });
});

describe('lista pakietów', () => {
  it('trzy formaty: 7v7, 9v9 i 11v11', () => {
    expect(PACKS.map(p => p.id)).toEqual(['7v7', '9v9', '11v11']);
  });
});
