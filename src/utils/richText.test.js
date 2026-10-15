import { describe, it, expect } from 'vitest';
import { htmlToLines, htmlToPptRuns, commentFontSize } from './richText.js';

const text = (l) => l.runs.map(r => r.text).join('');

describe('htmlToLines', () => {
  it('zachowuje akapity, listę i pogrubienie', () => {
    const lines = htmlToLines('<b>Tytuł</b><ul><li>Pierwszy</li><li>Drugi <i>punkt</i></li></ul><p>Źródło</p>');
    expect(lines.map(text)).toEqual(['Tytuł', 'Pierwszy', 'Drugi punkt', 'Źródło']);
    expect(lines.map(l => l.bullet)).toEqual([false, true, true, false]);
    expect(lines[0].runs[0].bold).toBe(true);
    expect(lines[2].runs[1].italic).toBe(true);
  });

  it('dzieli tekst na <br> i <div> z edytora', () => {
    const lines = htmlToLines('Klatka 1<br>Klatka 2<div>Klatka 3</div><div><br></div><div>Po przerwie</div>');
    expect(lines.map(text)).toEqual(['Klatka 1', 'Klatka 2', 'Klatka 3', '', 'Po przerwie']);
  });

  it('pusty komentarz daje pustą listę', () => {
    expect(htmlToLines('')).toEqual([]);
    expect(htmlToLines('   ')).toEqual([]);
  });
});

describe('htmlToPptRuns', () => {
  it('kończy każdy wiersz oprócz ostatniego i ustawia punktory', () => {
    const runs = htmlToPptRuns('<b>A</b><ul><li>B</li></ul>');
    expect(runs).toHaveLength(2);
    expect(runs[0].options).toMatchObject({ bold: true, breakLine: true });
    expect(runs[1].options.bullet).toBeTruthy();
    expect(runs[1].options.breakLine).toBeUndefined();
  });
});

describe('commentFontSize', () => {
  it('zmniejsza czcionkę dla długich komentarzy', () => {
    expect(commentFontSize(htmlToLines('krótki'))).toBe(14);
    expect(commentFontSize(htmlToLines(`<p>${'x'.repeat(2000)}</p>`))).toBe(10);
  });
});
