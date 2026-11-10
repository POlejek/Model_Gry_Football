import { describe, it, expect } from 'vitest';
import { buildModel, MODEL_SYSTEMS } from './modelGry.js';
import { buildPack } from './otwarcieGry.js';
import { SCHEME_W, SCHEME_H } from '../utils/draw.js';
import { DEFAULT_PHASES } from '../utils/modelPhases.js';
import { applyImport, KEYS } from '../utils/backup.js';
import { LINE_TYPES } from '../utils/lineTypes.jsx';

const lineTypes = new Set(LINE_TYPES.filter(Boolean).map(t => t[0]));
const PLAYERS = { '7v7': 7, '9v9': 9, '11v11': 11 };

describe('systemy modelu gry', () => {
  it('7v7 w 1-2-3-1, 9v9 w 1-3-2-3, 11v11 w 1-4-2-3-1', () => {
    expect(MODEL_SYSTEMS).toEqual({ '7v7': '1-2-3-1', '9v9': '1-3-2-3', '11v11': '1-4-2-3-1' });
  });

  it('ustawienie wyjściowe zgadza się z systemem (linie od własnej bramki)', () => {
    Object.entries(MODEL_SYSTEMS).forEach(([format, system]) => {
      const [first] = buildModel(format).schemes[format]['Atak-Otwarcie'];
      const field = first.frames[0].team.filter(p => p.number !== '1').sort((a, b) => b.y - a.y);
      const lines = system.split('-').slice(1).map(Number);
      let i = 0;
      const rows = lines.map(n => { const row = field.slice(i, i + n); i += n; return row; });
      // every player of a line stands behind (lower y = further up) every player of the next line
      rows.slice(0, -1).forEach((row, k) => {
        expect(Math.min(...row.map(p => p.y)), `${format}: linia ${k + 1}`).toBeGreaterThan(Math.max(...rows[k + 1].map(p => p.y)));
      });
    });
  });

  it('przy wznowieniu obrońcy stoją szerzej niż pole karne, a bramkarz i trzech najgłębszych tworzą budowanie', () => {
    Object.keys(MODEL_SYSTEMS).forEach(format => {
      const [wide] = buildModel(format).schemes[format]['Atak-Otwarcie'];
      const f = wide.frames[1];
      const deepest = f.team.filter(p => p.number !== '1').sort((a, b) => b.y - a.y).slice(0, 3);
      const xs = deepest.map(p => p.x).sort((a, b) => a - b);
      expect(xs[0], format).toBeLessThan(SCHEME_W * 0.2); // outside the penalty area width
      expect(xs[2], format).toBeGreaterThan(SCHEME_W * 0.8);
      expect(Math.abs(xs[1] - SCHEME_W / 2), format).toBeLessThan(40); // one in the middle
    });
  });
});

describe.each(Object.keys(PLAYERS))('model gry %s', (format) => {
  const model = buildModel(format);
  const schemes = model.schemes[format]['Atak-Otwarcie'];

  it('trzy schematy otwarcia z opisem i animacją', () => {
    expect(schemes.map(s => s.name)).toEqual(['Wznowienie: szerocy obrońcy, bramkarz jako czwarty', 'Rotacja w środku przeciw kryciu indywidualnemu', 'Plan B: długie podanie do napastnika i druga piłka']);
    schemes.forEach(s => {
      expect(s.frames.length).toBeGreaterThanOrEqual(2);
      expect(s.comments).toMatch(/<b>Cel:<\/b>/);
      expect(s.comments).toContain(MODEL_SYSTEMS[format]);
    });
    expect(new Set(schemes.map(s => s.id)).size).toBe(3);
  });

  it('w każdej klatce pełne drużyny na boisku, bez nakładania i z tymi samymi zawodnikami', () => {
    schemes.forEach(s => s.frames.forEach((f, k) => {
      expect(f.team).toHaveLength(PLAYERS[format]);
      expect(f.opponent).toHaveLength(PLAYERS[format]);
      expect(f.team.map(p => p.id)).toEqual(s.frames[0].team.map(p => p.id)); // animation matches players by id
      const all = [...f.team, ...f.opponent];
      all.forEach(p => {
        expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(SCHEME_W);
        expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(SCHEME_H);
      });
      all.forEach((p, i) => all.slice(i + 1).forEach(q => {
        expect(Math.hypot(p.x - q.x, p.y - q.y), `${s.name}, klatka ${k + 1}: ${p.id} i ${q.id}`).toBeGreaterThanOrEqual(36);
      }));
      f.lines.forEach(l => {
        expect(lineTypes.has(l.type)).toBe(true);
        [l.startX, l.endX].forEach(x => { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(SCHEME_W); });
        [l.startY, l.endY].forEach(y => { expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(SCHEME_H); });
      });
      expect(f.ball.x).toBeGreaterThan(0); expect(f.ball.y).toBeLessThan(SCHEME_H);
    }));
  });

  it('pakiet zaczyna się od modelu: schematy dochodzą do Taktyki, własne schematy i fazy zostają', () => {
    localStorage.setItem(KEYS.tactics, JSON.stringify({
      phases: { ...DEFAULT_PHASES, Atak: [...DEFAULT_PHASES.Atak, 'Moja podfaza'] },
      schemes: { [format]: { 'Atak-Otwarcie': [{ id: 1, name: 'Mój schemat', frames: [] }] } },
      gameFormat: '11v11', teamColor: '#123456',
    }));
    const pack = buildPack(format, '2026-11-09');
    expect(applyImport(pack, { tactics: 'add', settings: 'replace', drills: 'add', sessions: 'add' }).ok).toBe(true);
    const t = JSON.parse(localStorage.getItem(KEYS.tactics));
    expect(t.schemes[format]['Atak-Otwarcie'].map(s => s.name)).toEqual(['Mój schemat', ...schemes.map(s => s.name)]);
    expect(t.phases.Atak).toContain('Moja podfaza');
    expect(Object.keys(t.phases)).toEqual(Object.keys(DEFAULT_PHASES));
    expect(t).toMatchObject({ gameFormat: format, selectedPhase: 'Atak', selectedSubPhase: 'Otwarcie', teamColor: '#123456' });
  });
});
