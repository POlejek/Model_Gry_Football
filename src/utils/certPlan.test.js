import { describe, it, expect } from 'vitest';
import {
  PARTS, certOf, guessPart, blockPart, groupByPart, equipmentRows, printedEquipment, equipmentGrid, playersText,
} from './certPlan.js';

const block = (id, minutes, part) => ({ block: { id, minutes: String(minutes), ...(part ? { part } : {}) } });
const drillWith = (...types) => ({ frames: [{ items: types.map((type, i) => ({ id: i + 1, type })) }] });

describe('certOf', () => {
  it('stary konspekt bez pól certyfikacji dostaje puste wartości', () => {
    expect(certOf({ id: 's' })).toMatchObject({ enabled: false, topic: '', equipment: [] });
    expect(certOf(null).enabled).toBe(false);
    expect(certOf({ cert: { enabled: true, place: 'Orlik' } })).toMatchObject({ enabled: true, place: 'Orlik', coach: '' });
  });
});

describe('części treningu', () => {
  it('bez wyboru: pierwszy blok to wstępna, ostatni końcowa, reszta główna', () => {
    expect([0, 1, 2, 3].map(i => guessPart(i, 4))).toEqual(['wstepna', 'glowna', 'glowna', 'koncowa']);
    expect([0, 1].map(i => guessPart(i, 2))).toEqual(['wstepna', 'glowna']);
    expect(guessPart(0, 1)).toBe('glowna');
  });

  it('wybór trenera wygrywa z podpowiedzią, nieznana wartość jest ignorowana', () => {
    expect(blockPart({ part: 'koncowa' }, 0, 3)).toBe('koncowa');
    expect(blockPart({ part: 'cos' }, 0, 3)).toBe('wstepna');
  });

  it('grupuje bloki w kolejności metodycznej z sumą minut i numerem bloku', () => {
    const groups = groupByPart([block('a', 10), block('b', 25), block('c', 20, 'wstepna'), block('d', 5)]);
    expect(groups.map(g => [g.id, g.minutes, g.items.map(x => x.number)])).toEqual([
      ['wstepna', 30, [1, 3]],
      ['glowna', 25, [2]],
      ['koncowa', 5, [4]],
    ]);
    expect(groups[0].label).toBe(PARTS[0].label);
    expect(groupByPart([])).toEqual([]);
  });
});

describe('sprzęt', () => {
  it('liczy największą liczbę każdego przyrządu w jednym ćwiczeniu, bez zawodników i napisów', () => {
    const rows = equipmentRows([drillWith('cone', 'cone', 'ball', 'player'), drillWith('cone', 'cone', 'cone', 'text', 'unknown'), null]);
    expect(rows).toEqual([{ name: 'Stożek', count: '3' }, { name: 'Piłka', count: '1' }]);
  });

  it('na wydruku wpisy trenera mają pierwszeństwo, puste wiersze są pomijane', () => {
    const drills = [drillWith('ball')];
    expect(printedEquipment(certOf({}), drills)).toEqual([{ name: 'Piłka', count: '1' }]);
    expect(printedEquipment(certOf({ cert: { equipment: [{ name: '', count: '' }] } }), drills)).toEqual([{ name: 'Piłka', count: '1' }]);
    expect(printedEquipment(certOf({ cert: { equipment: [{ name: 'Znaczniki', count: '12' }] } }), drills)).toEqual([{ name: 'Znaczniki', count: '12' }]);
  });

  it('tabela „Sprzęt / Liczba” ma wiersze po 7 komórek, uzupełnione pustymi', () => {
    expect(equipmentGrid([])).toEqual([Array(7).fill({ name: '', count: '' })]);
    const grid = equipmentGrid(Array.from({ length: 9 }, (_, i) => ({ name: `S${i}`, count: i })));
    expect(grid).toHaveLength(2);
    expect(grid[1].slice(0, 3)).toEqual([{ name: 'S7', count: '7' }, { name: 'S8', count: '8' }, { name: '', count: '' }]);
  });
});

describe('playersText', () => {
  it.each([['0', '0 osób'], ['1', '1 osoba'], ['3', '3 osoby'], ['16', '16 osób'], ['', ''], ['x', '']])('%s → „%s”', (n, text) => {
    expect(playersText(n)).toBe(text);
  });
});
