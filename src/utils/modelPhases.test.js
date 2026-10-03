import { describe, it, expect } from 'vitest';
import { phaseKey, phaseOptions, phaseLabel, readModelPhases, readDrillLibrary, drillsForPhase, DEFAULT_PHASES } from './modelPhases.js';

describe('fazy modelu gry', () => {
  it('klucze jak w schematach Taktyki: "Faza-Podfaza" albo "Faza"', () => {
    expect(phaseKey('Atak', 'Budowanie')).toBe('Atak-Budowanie');
    expect(phaseKey('SFG')).toBe('SFG');
  });

  it('opcje obejmują podfazy, a fazy bez podfaz jako całość', () => {
    const opts = phaseOptions({ Atak: ['Otwarcie', 'Budowanie'], Obrona: [] });
    expect(opts.map(o => o.key)).toEqual(['Atak-Otwarcie', 'Atak-Budowanie', 'Obrona']);
    expect(phaseLabel('Atak-Budowanie', opts)).toBe('Atak – Budowanie');
    expect(phaseLabel('Nieznana-Faza', opts)).toBe('Nieznana – Faza');
  });

  it('bez danych Taktyki używa domyślnych faz; inaczej czyta zapisane', () => {
    expect(readModelPhases()).toEqual(DEFAULT_PHASES);
    localStorage.setItem('footballTacticsData', JSON.stringify({ _version: 2, phases: { Pressing: [] } }));
    expect(readModelPhases()).toEqual({ Pressing: [] });
  });

  it('wyszukuje ćwiczenia przypisane do fazy', () => {
    expect(readDrillLibrary()).toEqual([]);
    const drills = [{ id: 1, meta: { phases: ['Atak-Budowanie'] } }, { id: 2, meta: {} }, { id: 3 }];
    localStorage.setItem('trainingDrillLibrary', JSON.stringify(drills));
    expect(drillsForPhase(readDrillLibrary(), 'Atak-Budowanie').map(d => d.id)).toEqual([1]);
    localStorage.setItem('trainingDrillLibrary', '{zepsute');
    expect(readDrillLibrary()).toEqual([]);
  });
});
