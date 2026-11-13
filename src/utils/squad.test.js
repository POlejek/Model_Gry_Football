import { describe, it, expect } from 'vitest';
import { loadSquad, saveSquad, shortName, findByNumber, sortSquad, assignSquadToTeam, parseSquadText, mergeSquad, nameToSquad, SQUAD_KEY } from './squad.js';

describe('kadra — zapis i pomocnicze', () => {
  it('zapisuje i wczytuje kadrę; uszkodzone dane dają pustą listę', () => {
    expect(loadSquad()).toEqual([]);
    saveSquad([{ id: 'a', number: '9' }]);
    expect(loadSquad()).toEqual([{ id: 'a', number: '9' }]);
    localStorage.setItem(SQUAD_KEY, '{zepsute');
    expect(loadSquad()).toEqual([]);
  });

  it('shortName zwraca nazwisko', () => {
    expect(shortName({ name: 'Robert Lewandowski' })).toBe('Lewandowski');
    expect(shortName({ name: '  Pelé ' })).toBe('Pelé');
    expect(shortName({ name: '' })).toBe('');
  });

  it('findByNumber dopasowuje numer jako tekst i ignoruje puste numery', () => {
    const squad = [{ number: ' 9 ', name: 'A' }, { number: '', name: 'B' }];
    expect(findByNumber(squad, 9).name).toBe('A');
    expect(findByNumber(squad, '')).toBeUndefined();
  });

  it('sortSquad sortuje po numerze, zawodników bez numeru na koniec', () => {
    const sorted = sortSquad([{ number: '10', name: 'C' }, { number: '', name: 'Z' }, { number: '2', name: 'A' }]);
    expect(sorted.map(m => m.name)).toEqual(['A', 'C', 'Z']);
  });
});

describe('assignSquadToTeam (Ustaw z kadry)', () => {
  // the team attacks upwards: larger y = closer to own goal
  const team = [
    { id: 'gk', x: 350, y: 1030 },
    { id: 'lb', x: 180, y: 900 }, { id: 'rb', x: 520, y: 900 },
    { id: 'cm', x: 350, y: 750 },
    { id: 'lw', x: 160, y: 640 }, { id: 'st', x: 350, y: 570 },
  ];
  const squad = [
    { id: 'g', number: '1', position: 'BR' },
    { id: 'd1', number: '2', position: 'OBR' }, { id: 'd2', number: '3', position: 'OBR' },
    { id: 'm', number: '8', position: 'POM' },
    { id: 'f', number: '9', position: 'NAP' },
    { id: 'm2', number: '11', position: 'POM' },
  ];

  it('bramkarz do bramki, obrońcy do tyłu, napastnik na szpicę, reszta z pomocników', () => {
    const r = assignSquadToTeam(team, squad);
    expect(r.gk).toBe('1');
    expect([r.lb, r.rb].sort()).toEqual(['2', '3']);
    expect(r.st).toBe('9');
    expect([r.cm, r.lw].sort()).toEqual(['11', '8']);
  });

  it('bez bramkarza w kadrze bramkę dostaje ktoś z pozostałych', () => {
    const noKeeper = [...squad.filter(m => m.position !== 'BR'), { id: 'm3', number: '14', position: 'POM' }];
    const r = assignSquadToTeam(team, noKeeper);
    expect(Object.keys(r)).toHaveLength(team.length);
    expect(r.gk).toBeDefined();
  });

  it('pusta kadra lub drużyna nie zmienia niczego', () => {
    expect(assignSquadToTeam(team, [])).toEqual({});
    expect(assignSquadToTeam([], squad)).toEqual({});
  });
});

describe('wklejanie kadry', () => {
  it('Excel: kolumny rozdzielone tabulatorem, z nagłówkiem, osobne imię i nazwisko', () => {
    const text = 'Nr\tImię\tNazwisko\tPozycja\n1\tJan\tKowalski\tBramkarz\n4\tPiotr\tNowak\tObrońca\n10\tAdam\tŁącki\tPOM\n';
    expect(parseSquadText(text)).toEqual([
      { number: '1', name: 'Jan Kowalski', position: 'BR' },
      { number: '4', name: 'Piotr Nowak', position: 'OBR' },
      { number: '10', name: 'Adam Łącki', position: 'POM' },
    ]);
    expect(parseSquadText('Nr\tImię i nazwisko\tPozycja\n1\tJan Kowalski\tBR')).toEqual([{ number: '1', name: 'Jan Kowalski', position: 'BR' }]);
  });

  it('notatnik: numer na początku albo końcu, kropki, myślniki, średniki i same nazwiska', () => {
    const text = '7. Jan Kowalski – napastnik\r\nPiotr Nowak 5\nAdam Zieliński;8;ŚO\n  \nKamil Wójcik\n#9 Ola Lis ST';
    expect(parseSquadText(text)).toEqual([
      { number: '7', name: 'Jan Kowalski', position: 'NAP' },
      { number: '5', name: 'Piotr Nowak', position: 'POM' },
      { number: '8', name: 'Adam Zieliński', position: 'OBR' },
      { number: '', name: 'Kamil Wójcik', position: 'POM' },
      { number: '9', name: 'Ola Lis', position: 'NAP' },
    ]);
  });

  it('dodaje do kadry i nadaje wolne numery, albo zastępuje kadrę', () => {
    const squad = [{ id: 'a', number: '1', name: 'Stary', position: 'BR' }];
    const parsed = [{ number: '', name: 'Bez Numeru', position: 'POM' }, { number: '2', name: 'Dwa', position: 'OBR' }];
    const added = mergeSquad(squad, parsed);
    expect(added.map(m => [m.number, m.name])).toEqual([['1', 'Stary'], ['3', 'Bez Numeru'], ['2', 'Dwa']]);
    expect(new Set(added.map(m => m.id)).size).toBe(3);
    expect(mergeSquad(squad, parsed, 'replace').map(m => [m.number, m.name])).toEqual([['1', 'Bez Numeru'], ['2', 'Dwa']]);
  });
});

describe('nazwisko wpisane na boisku trafia do kadry', () => {
  const squad = [{ id: 'a', number: '7', name: 'Adam Nowak', position: 'NAP' }];

  it('samo nazwisko: zapisuje je pod obecnym numerem zawodnika z pozycją z boiska', () => {
    const r = nameToSquad(squad, 'Kowalski', { currentNumber: '9', position: 'POM' });
    expect(r.number).toBe('9');
    expect(r.squad.at(-1)).toMatchObject({ number: '9', name: 'Kowalski', position: 'POM' });
    expect(r.squad).toHaveLength(2);
  });

  it('numer i nazwisko (z pozycją) w jednym polu', () => {
    const r = nameToSquad([], '10 Jan Zieliński NAP', { currentNumber: '4', position: 'OBR' });
    expect(r).toMatchObject({ number: '10' });
    expect(r.squad).toEqual([expect.objectContaining({ number: '10', name: 'Jan Zieliński', position: 'NAP' })]);
  });

  it('nazwisko z kadry: używa numeru tego zawodnika, nie dubluje', () => {
    const r = nameToSquad(squad, 'adam nowak', { currentNumber: '3' });
    expect(r).toEqual({ number: '7', squad });
  });

  it('numer zajęty w kadrze: nadpisuje nazwisko, zachowuje pozycję', () => {
    const r = nameToSquad(squad, 'Lis', { currentNumber: '7', position: 'BR' });
    expect(r.squad).toEqual([{ id: 'a', number: '7', name: 'Lis', position: 'NAP' }]);
  });

  it('bez numeru zawodnika: pierwszy wolny numer; sam numer to nie nazwisko', () => {
    expect(nameToSquad(squad, 'Wójcik', { currentNumber: 'ABC' }).number).toBe('1');
    expect(nameToSquad(squad, '12')).toBeNull();
  });
});
