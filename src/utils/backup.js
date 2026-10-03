// Full backup of everything the app stores on this device, plus import of every file format the
// app has produced (backup, tactics export, drill / drill-library, session / session-library).
import { DRILL_FORMAT, LIBRARY_FORMAT, parseDrillFile } from './drill.js';

export const BACKUP_FORMAT = 'model-gry-backup';
export const KEYS = {
  tactics: 'footballTacticsData',
  drills: 'trainingDrillLibrary',
  sessions: 'trainingSessions',
  squad: 'modelGrySquad',
};
const LAST_BACKUP_KEY = 'modelGryLastBackup';
const UNDO_KEY = 'modelGryUndoImport';
const SESSION_FORMAT = 'model-gry-training-session';
const SESSION_LIBRARY_FORMAT = 'model-gry-session-library';
const SETTINGS_FIELDS = ['gameFormat', 'selectedPhase', 'selectedSubPhase', 'expandedPhases', 'teamColor', 'opponentColor', 'showNames'];

export const SECTIONS = [
  { id: 'tactics', label: 'Taktyka', hint: 'fazy, podfazy i schematy (wszystkie formaty gry)' },
  { id: 'drills', label: 'Biblioteka ćwiczeń', hint: 'ćwiczenia z zakładki Trening' },
  { id: 'sessions', label: 'Konspekty', hint: 'plany jednostek treningowych' },
  { id: 'squad', label: 'Kadra', hint: 'zawodnicy: numery, nazwiska, pozycje' },
  { id: 'settings', label: 'Ustawienia', hint: 'kolory drużyn, format gry, nazwiska na boisku' },
];

const readJson = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const asArray = (v) => (Array.isArray(v) ? v : []);

// ── Reading current data ──────────────────────────────────────────
export function readAll() {
  const tacticsData = readJson(KEYS.tactics, {}) || {};
  const settings = {};
  SETTINGS_FIELDS.forEach(f => { if (tacticsData[f] !== undefined) settings[f] = tacticsData[f]; });
  return {
    tactics: tacticsData.schemes || tacticsData.phases ? { phases: tacticsData.phases || {}, schemes: tacticsData.schemes || {} } : null,
    drills: asArray(readJson(KEYS.drills, [])),
    sessions: asArray(readJson(KEYS.sessions, [])),
    squad: asArray(readJson(KEYS.squad, [])),
    settings: Object.keys(settings).length ? settings : null,
  };
}

const countSchemes = (schemes) => Object.values(schemes || {})
  .reduce((sum, byKey) => sum + Object.values(byKey || {}).reduce((s, list) => s + asArray(list).length, 0), 0);

// Polish plural: plural(5, 'schemat', 'schematy', 'schematów') → "5 schematów".
export const plural = (n, one, few, many) =>
  `${n} ${n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many}`;
const P = {
  schemes: n => plural(n, 'schemat', 'schematy', 'schematów'),
  drills: n => plural(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń'),
  sessions: n => plural(n, 'konspekt', 'konspekty', 'konspektów'),
  squad: n => plural(n, 'zawodnik', 'zawodników', 'zawodników'),
};
export const SECTION_SLUGS = { tactics: 'taktyka', drills: 'cwiczenia', sessions: 'konspekty', squad: 'kadra', settings: 'ustawienia' };

// Short human description of a section's content, e.g. "14 schematów · 8 faz".
export function describe(sectionId, data) {
  switch (sectionId) {
    case 'tactics': {
      if (!data.tactics) return null;
      const phases = Object.values(data.tactics.phases || {}).reduce((s, subs) => s + Math.max(1, asArray(subs).length), 0);
      return `${plural(countSchemes(data.tactics.schemes), 'schemat', 'schematy', 'schematów')} · ${plural(phases, 'faza', 'fazy', 'faz')}`;
    }
    case 'drills': return data.drills?.length ? plural(data.drills.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń') : null;
    case 'sessions': return data.sessions?.length ? plural(data.sessions.length, 'konspekt', 'konspekty', 'konspektów') : null;
    case 'squad': return data.squad?.length ? plural(data.squad.length, 'zawodnik', 'zawodników', 'zawodników') : null;
    case 'settings': return data.settings ? 'zapisane' : null;
    default: return null;
  }
}

const drillIdsUsedBy = (sessions) => new Set(sessions.flatMap(s => asArray(s.blocks).map(b => b.drillId).filter(Boolean)));

// ── Export ────────────────────────────────────────────────────────
// Sessions need their drills: when sessions are exported without the drill library, the drills they
// use are added anyway. Returns { backup, addedDrills }.
export function buildBackup(selected, data = readAll()) {
  const sections = {};
  let addedDrills = 0;
  if (selected.has('tactics') && data.tactics) sections.tactics = data.tactics;
  if (selected.has('drills')) sections.drills = data.drills;
  if (selected.has('sessions')) {
    sections.sessions = data.sessions;
    if (!selected.has('drills')) {
      const used = drillIdsUsedBy(data.sessions);
      sections.drills = data.drills.filter(d => used.has(d.id));
      addedDrills = sections.drills.length;
    }
  }
  if (selected.has('squad')) sections.squad = data.squad;
  if (selected.has('settings') && data.settings) sections.settings = data.settings;
  return {
    backup: { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), sections },
    addedDrills,
  };
}

export const markBackupDone = () => { try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch { /* ignore */ } };
export const lastBackupAt = () => localStorage.getItem(LAST_BACKUP_KEY);
export function backupAgeDays() {
  const at = lastBackupAt();
  return at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : null;
}
// Reminder when there is data worth protecting and no backup in the last 14 days.
export function needsBackup() {
  const data = readAll();
  const hasData = countSchemes(data.tactics?.schemes) > 0 || data.drills.length || data.sessions.length || data.squad.length;
  const age = backupAgeDays();
  return Boolean(hasData) && (age === null || age > 14);
}

// ── Import: recognise any file the app has produced ──────────────
// Returns the same shape as readAll() (missing sections are null/empty) or null for unknown files.
export function parseAnyFile(json, fileName = '') {
  if (!json || typeof json !== 'object') return null;
  const empty = { tactics: null, drills: [], sessions: [], squad: [], settings: null };

  if (json.format === BACKUP_FORMAT && json.sections) {
    const s = json.sections;
    return {
      tactics: s.tactics ? { phases: s.tactics.phases || {}, schemes: s.tactics.schemes || {} } : null,
      drills: asArray(s.drills), sessions: asArray(s.sessions), squad: asArray(s.squad), settings: s.settings || null,
    };
  }
  if (json.format === SESSION_FORMAT && json.session) return { ...empty, sessions: [json.session], drills: asArray(json.drills) };
  if (json.format === SESSION_LIBRARY_FORMAT) return { ...empty, sessions: asArray(json.sessions), drills: asArray(json.drills) };
  if (json.format === DRILL_FORMAT || json.format === LIBRARY_FORMAT) {
    const drills = parseDrillFile(json, fileName).map((d, i) => (d.id ? d : { ...d, id: `drill-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
    return { ...empty, drills };
  }
  // tactics export ("Eksport" in the Taktyka tab)
  if (json.phases && json.schemes) {
    const settings = {};
    SETTINGS_FIELDS.forEach(f => { if (json[f] !== undefined) settings[f] = json[f]; });
    return { ...empty, tactics: { phases: json.phases, schemes: json.schemes }, settings: Object.keys(settings).length ? settings : null };
  }
  return null;
}

// Several files → one combined import (later files add to earlier ones).
export function combineParsed(list) {
  const out = { tactics: null, drills: [], sessions: [], squad: [], settings: null };
  list.forEach(p => {
    if (p.tactics) out.tactics = out.tactics ? mergeTactics(out.tactics, p.tactics).result : p.tactics;
    out.drills.push(...p.drills);
    out.sessions.push(...p.sessions);
    out.squad.push(...p.squad);
    if (p.settings) out.settings = { ...(out.settings || {}), ...p.settings };
  });
  return out;
}

// ── Merging ("Dodaj") ────────────────────────────────────────────
function mergeTactics(current, incoming) {
  const phases = { ...(current.phases || {}) };
  Object.entries(incoming.phases || {}).forEach(([phase, subs]) => {
    phases[phase] = [...new Set([...(phases[phase] || []), ...asArray(subs)])];
  });
  const schemes = JSON.parse(JSON.stringify(current.schemes || {}));
  let added = 0;
  Object.entries(incoming.schemes || {}).forEach(([format, byKey]) => {
    schemes[format] ||= {};
    Object.entries(byKey || {}).forEach(([key, list]) => {
      const existing = schemes[format][key] || [];
      const ids = new Set(existing.map(s => s.id));
      const fresh = asArray(list).filter(s => !ids.has(s.id));
      added += fresh.length;
      schemes[format][key] = [...existing, ...fresh];
    });
  });
  return { result: { phases, schemes }, added };
}

const mergeById = (current, incoming) => {
  const ids = new Set(current.map(x => x.id));
  const fresh = incoming.filter(x => x && x.id != null && !ids.has(x.id) && ids.add(x.id));
  return { result: [...fresh, ...current], added: fresh.length, skipped: incoming.length - fresh.length };
};

const mergeSquad = (current, incoming) => {
  const numbers = new Set(current.map(m => String(m.number).trim()));
  const fresh = incoming.filter(m => m && !numbers.has(String(m.number).trim()) && numbers.add(String(m.number).trim()));
  return { result: [...current, ...fresh.map((m, i) => ({ ...m, id: m.id || `p-${Date.now()}-${i}` }))], added: fresh.length, skipped: incoming.length - fresh.length };
};

// What "Zastąp" would delete, for the confirmation dialog.
export function replaceLosses(choices, current = readAll()) {
  const lost = [];
  if (choices.tactics === 'replace' && countSchemes(current.tactics?.schemes)) lost.push(P.schemes(countSchemes(current.tactics.schemes)));
  if (choices.drills === 'replace' && current.drills.length) lost.push(P.drills(current.drills.length));
  if (choices.sessions === 'replace' && current.sessions.length) lost.push(P.sessions(current.sessions.length));
  if (choices.squad === 'replace' && current.squad.length) lost.push(`${P.squad(current.squad.length)} z kadry`);
  return lost;
}

// ── Undo ──────────────────────────────────────────────────────────
function saveUndo() {
  const snapshot = {};
  Object.values(KEYS).forEach(k => { snapshot[k] = localStorage.getItem(k); });
  try {
    localStorage.setItem(UNDO_KEY, JSON.stringify({ at: new Date().toISOString(), snapshot }));
    return true;
  } catch {
    return false;
  }
}
export const undoInfo = () => readJson(UNDO_KEY, null);
export function undoLastImport() {
  const undo = undoInfo();
  if (!undo) return false;
  Object.entries(undo.snapshot).forEach(([k, v]) => {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  });
  localStorage.removeItem(UNDO_KEY);
  return true;
}

// ── Applying an import ────────────────────────────────────────────
// choices: { tactics|drills|sessions|squad: 'skip'|'add'|'replace', settings: 'skip'|'replace' }
// Returns { ok, summary: string[], undoSaved }.
export function applyImport(incoming, choices) {
  const current = readAll();
  const undoSaved = saveUndo();
  const summary = [];
  const tacticsData = readJson(KEYS.tactics, {}) || {};

  try {
    if (choices.tactics !== 'skip' && incoming.tactics) {
      if (choices.tactics === 'replace') {
        Object.assign(tacticsData, { phases: incoming.tactics.phases, schemes: incoming.tactics.schemes });
        summary.push(`Taktyka zastąpiona (${P.schemes(countSchemes(incoming.tactics.schemes))})`);
      } else {
        const { result, added } = mergeTactics(current.tactics || { phases: {}, schemes: {} }, incoming.tactics);
        Object.assign(tacticsData, result);
        summary.push(added ? `Taktyka: dodano ${P.schemes(added)}` : 'Taktyka: bez nowych schematów');
      }
    }
    if (choices.settings === 'replace' && incoming.settings) {
      Object.assign(tacticsData, incoming.settings);
      summary.push('Ustawienia wczytane');
    }
    if (summary.length) writeJson(KEYS.tactics, { ...tacticsData, _version: tacticsData._version || 2 });

    const listSection = (id, label, merge) => {
      const words = P[id];
      if (choices[id] === 'skip' || !incoming[id]?.length) return;
      if (choices[id] === 'replace') {
        writeJson(KEYS[id], incoming[id]);
        summary.push(`${label}: zastąpiono (${words(incoming[id].length)})`);
      } else {
        const { result, added, skipped } = merge(current[id], incoming[id]);
        writeJson(KEYS[id], result);
        summary.push(`${label}: ${added ? `dodano ${words(added)}` : 'bez nowych'}${skipped ? `, już były: ${skipped}` : ''}`);
      }
    };
    listSection('drills', 'Ćwiczenia', mergeById);
    listSection('sessions', 'Konspekty', mergeById);
    listSection('squad', 'Kadra', mergeSquad);
  } catch {
    if (undoSaved) undoLastImport();
    return { ok: false, summary: ['Brak miejsca w pamięci przeglądarki — import przerwany, dane bez zmian.'], undoSaved: false };
  }
  return { ok: true, summary, undoSaved };
}

// ── Storage usage ─────────────────────────────────────────────────
export const STORAGE_LIMIT = 5 * 1024 * 1024;
export function storageUsage() {
  let chars = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    chars += k.length + (localStorage.getItem(k) || '').length;
  }
  return chars * 2; // UTF-16
}
