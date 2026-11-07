import { describe, it, expect } from 'vitest';
import { pageBreaks, unitsToShrink, pagesNeeded, fitScale } from './printLayout.js';

describe('pageBreaks (wydruk kompaktowy)', () => {
  it('nagłówek i ćwiczenie na jednej stronie, następne od nowej strony, gdy się nie mieści', () => {
    expect(pageBreaks([{ id: 'h', h: 100 }, { id: 'a', h: 800 }, { id: 'b', h: 700 }], 1000)).toEqual(['b']);
  });

  it('dwa krótkie ćwiczenia na jednej stronie', () => {
    expect(pageBreaks([{ id: 'a', h: 450 }, { id: 'b', h: 450 }, { id: 'c', h: 450 }], 1000)).toEqual(['c']);
  });

  it('za wysokie ćwiczenie zaczyna nową stronę i przelewa się dalej', () => {
    expect(pageBreaks([{ id: 'a', h: 300 }, { id: 'b', h: 1300 }, { id: 'c', h: 600 }], 1000)).toEqual(['b']);
    expect(pageBreaks([{ id: 'a', h: 300 }, { id: 'b', h: 1300 }, { id: 'c', h: 800 }], 1000)).toEqual(['b', 'c']);
  });

  it('nagłówek zawsze zostaje z pierwszym ćwiczeniem', () => {
    expect(pageBreaks([{ id: 'header', h: 200 }, { id: 'a', h: 900 }, { id: 'b', h: 300 }], 1000)).toEqual(['b']);
  });

  it('zmniejszamy tylko jednostki wyższe niż strona i dające się zmniejszyć', () => {
    expect(unitsToShrink([{ id: 'a', h: 900, shrinkable: true }, { id: 'b', h: 1200, shrinkable: true }, { id: 'n', h: 1500 }], 1000)).toEqual(['b']);
    expect(unitsToShrink([{ id: 'header', h: 200 }, { id: 'a', h: 900, shrinkable: true }], 1000)).toEqual(['a']);
  });
});

describe('pagesNeeded / fitScale (wydruk 1 albo 2 strony)', () => {
  it('liczy strony bez dzielenia jednostek', () => {
    expect(pagesNeeded([], 1000)).toBe(0);
    expect(pagesNeeded([{ id: 'header', h: 100 }, { id: 'a', h: 500 }, { id: 'b', h: 500 }], 1000)).toBe(2);
    expect(pagesNeeded([{ id: 'a', h: 400 }, { id: 'b', h: 2500 }], 1000)).toBe(4);
  });

  it('dobiera największą skalę, przy której treść mieści się na zadanej liczbie stron', () => {
    // wysokości rosną liniowo ze skalą: 3 ćwiczenia po 600 px przy skali 1
    const measure = (s) => [{ id: 'header', h: 100 * s }, ...['a', 'b', 'c'].map(id => ({ id, h: 600 * s }))];
    const one = fitScale(measure, 1, 1000);
    expect(pagesNeeded(measure(one), 1000)).toBe(1);
    expect(one).toBeGreaterThan(0.5);
    const two = fitScale(measure, 2, 1000);
    expect(pagesNeeded(measure(two), 1000)).toBeLessThanOrEqual(2);
    expect(two).toBeGreaterThan(one);
    expect(fitScale(() => [{ id: 'a', h: 200 }], 1, 1000)).toBe(1.15);
  });
});
