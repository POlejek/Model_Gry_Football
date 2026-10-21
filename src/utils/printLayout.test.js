import { describe, it, expect } from 'vitest';
import { pageBreaks, unitsToShrink } from './printLayout.js';

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
