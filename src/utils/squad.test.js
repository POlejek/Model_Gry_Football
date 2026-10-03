import { describe, it, expect } from 'vitest';
import { loadSquad, saveSquad, shortName, findByNumber, sortSquad, assignSquadToTeam, SQUAD_KEY } from './squad.js';

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
