// Links training drills with the phases of the game model defined in the tactics editor.
import { loadStoredData } from './storage.js';

export const DEFAULT_PHASES = {
  'Atak': ['Otwarcie', 'Budowanie', 'Tworzenie szans', 'Finalizacja'],
  'A/O': [],
  'Obrona': [],
  'O/A': [],
  'SFG': [],
};

// Same keys as the tactics schemes: "Faza-Podfaza", or "Faza" when it has no sub-phases.
export const phaseKey = (phase, subPhase) => (subPhase ? `${phase}-${subPhase}` : phase);

export function phaseOptions(phases = DEFAULT_PHASES) {
  return Object.entries(phases).flatMap(([phase, subs]) => (
    subs?.length
      ? subs.map(sub => ({ key: phaseKey(phase, sub), phase, label: `${phase} – ${sub}` }))
      : [{ key: phase, phase, label: phase }]
  ));
}

export function readModelPhases() {
  return loadStoredData()?.phases || DEFAULT_PHASES;
}

export const phaseLabel = (key, options) => options.find(o => o.key === key)?.label || key.replace('-', ' – ');

export function readDrillLibrary() {
  try {
    const list = JSON.parse(localStorage.getItem('trainingDrillLibrary'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const drillsForPhase = (drills, key) => drills.filter(d => (d.meta?.phases || []).includes(key));
