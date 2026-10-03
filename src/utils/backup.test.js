import { describe, it, expect } from 'vitest';
import {
  KEYS, BACKUP_FORMAT, readAll, describe as describeSection, buildBackup, parseAnyFile, combineParsed, applyImport,
  replaceLosses, undoInfo, undoLastImport, markBackupDone, backupAgeDays, needsBackup, storageUsage, plural,
} from './backup.js';

const scheme = (id) => ({ id, name: `Schemat ${id}`, frames: [] });
const drill = (id, name = id) => ({ id, name, frames: [{ items: [], lines: [], zones: [] }], updatedAt: '2026-01-01' });
const session = (id, drillIds = []) => ({ id, title: id, blocks: drillIds.map((d, i) => ({ id: `b${i}`, drillId: d, minutes: '10' })) });

const seed = ({ schemes = {}, drills = [], sessions = [], squad = [], extra = {} } = {}) => {
  localStorage.setItem(KEYS.tactics, JSON.stringify({ phases: { Atak: ['Budowanie'], Obrona: [] }, schemes, teamColor: '#123456', ...extra }));
  localStorage.setItem(KEYS.drills, JSON.stringify(drills));
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  localStorage.setItem(KEYS.squad, JSON.stringify(squad));
};
const stored = (key) => JSON.parse(localStorage.getItem(key));

describe('plural (polskie formy liczebników)', () => {
  it.each([[1, 'schemat'], [2, 'schematy'], [5, 'schematów'], [12, 'schematów'], [22, 'schematy']])('%i → %s', (n, word) => {
    expect(plural(n, 'schemat', 'schematy', 'schematów')).toBe(`${n} ${word}`);
  });
});

describe('readAll i opis zawartości', () => {
  it('pusta przeglądarka nie ma danych do eksportu', () => {
    const data = readAll();
    expect(data.tactics).toBeNull();
    expect(['tactics', 'drills', 'sessions', 'squad', 'settings'].map(id => describeSection(id, data))).toEqual([null, null, null, null, null]);
  });

  it('opisuje liczbę schematów, faz, ćwiczeń, konspektów i zawodników', () => {
    seed({ schemes: { '11v11': { 'Atak-Budowanie': [scheme(1), scheme(2)] } }, drills: [drill('d1')], sessions: [session('s1')], squad: [{ id: 'p', number: '9' }] });
    const data = readAll();
    expect(describeSection('tactics', data)).toBe('2 schematy · 2 fazy');
    expect(describeSection('drills', data)).toBe('1 ćwiczenie');
    expect(describeSection('sessions', data)).toBe('1 konspekt');
    expect(describeSection('squad', data)).toBe('1 zawodnik');
    expect(data.settings).toEqual({ teamColor: '#123456' });
  });
});

describe('buildBackup (eksport)', () => {
  it('pełna kopia zawiera wszystkie zaznaczone części', () => {
    seed({ schemes: { '11v11': { Obrona: [scheme(1)] } }, drills: [drill('d1')], sessions: [session('s1')], squad: [{ id: 'p', number: '1' }] });
    const { backup, addedDrills } = buildBackup(new Set(['tactics', 'drills', 'sessions', 'squad', 'settings']));
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(Object.keys(backup.sections).sort()).toEqual(['drills', 'sessions', 'settings', 'squad', 'tactics']);
    expect(addedDrills).toBe(0);
  });

  it('konspekty bez biblioteki dostają tylko używane w nich ćwiczenia', () => {
    seed({ drills: [drill('d1'), drill('d2')], sessions: [session('s1', ['d2'])] });
    const { backup, addedDrills } = buildBackup(new Set(['sessions']));
    expect(backup.sections.drills.map(d => d.id)).toEqual(['d2']);
    expect(addedDrills).toBe(1);
    expect(backup.sections.tactics).toBeUndefined();
  });
});

describe('parseAnyFile (rozpoznawanie plików)', () => {
  it('kopia zapasowa', () => {
    const p = parseAnyFile({ format: BACKUP_FORMAT, sections: { drills: [drill('d1')], squad: [{ number: '1' }] } });
    expect(p.drills).toHaveLength(1);
    expect(p.squad).toHaveLength(1);
    expect(p.tactics).toBeNull();
  });

  it('stary eksport Taktyki (z ustawieniami)', () => {
    const p = parseAnyFile({ version: '1.0', phases: { Atak: [] }, schemes: { '7v7': {} }, gameFormat: '7v7' });
    expect(p.tactics.phases).toEqual({ Atak: [] });
    expect(p.settings).toEqual({ gameFormat: '7v7' });
  });

  it('pojedyncze ćwiczenie, biblioteka ćwiczeń, konspekt i biblioteka konspektów', () => {
    expect(parseAnyFile({ format: 'model-gry-training-drill', name: 'X', frames: [{ items: [], lines: [], zones: [] }] }, 'x.json').drills[0].id).toBeTruthy();
    expect(parseAnyFile({ format: 'model-gry-training-library', drills: [drill('d1'), drill('d2')] }).drills).toHaveLength(2);
    expect(parseAnyFile({ format: 'model-gry-training-session', session: session('s1'), drills: [drill('d1')] })).toMatchObject({ sessions: [{ id: 's1' }], drills: [{ id: 'd1' }] });
    expect(parseAnyFile({ format: 'model-gry-session-library', sessions: [session('a'), session('b')] }).sessions).toHaveLength(2);
  });

  it('nieznany plik → null', () => {
    expect(parseAnyFile({ hello: 1 })).toBeNull();
    expect(parseAnyFile(null)).toBeNull();
  });

  it('combineParsed łączy kilka plików w jeden import', () => {
    const a = parseAnyFile({ format: BACKUP_FORMAT, sections: { tactics: { phases: { Atak: ['A'] }, schemes: {} }, drills: [drill('d1')] } });
    const b = parseAnyFile({ phases: { Atak: ['B'] }, schemes: {}, teamColor: '#fff' });
    const c = combineParsed([a, b]);
    expect(c.tactics.phases.Atak.sort()).toEqual(['A', 'B']);
    expect(c.drills).toHaveLength(1);
    expect(c.settings).toEqual({ teamColor: '#fff' });
  });
});

describe('applyImport — Dodaj / Zastąp / Cofnij', () => {
  const incoming = {
    tactics: { phases: { Atak: ['Finalizacja'] }, schemes: { '11v11': { 'Atak-Budowanie': [scheme(1), scheme(3)] } } },
    drills: [drill('d1'), drill('d9')],
    sessions: [session('s2')],
    squad: [{ id: 'x', number: '9', name: 'Duplikat' }, { id: 'y', number: '7', name: 'Nowy' }],
    settings: { teamColor: '#00ff00' },
  };

  it('„Dodaj” dopisuje nowe elementy, pomija istniejące i scala fazy', () => {
    seed({ schemes: { '11v11': { 'Atak-Budowanie': [scheme(1)] } }, drills: [drill('d1')], sessions: [session('s1')], squad: [{ id: 'p', number: '9', name: 'Jan' }] });
    const r = applyImport(incoming, { tactics: 'add', drills: 'add', sessions: 'add', squad: 'add', settings: 'skip' });
    expect(r.ok).toBe(true);
    const t = stored(KEYS.tactics);
    expect(t.schemes['11v11']['Atak-Budowanie'].map(s => s.id)).toEqual([1, 3]);
    expect(t.phases.Atak).toEqual(['Budowanie', 'Finalizacja']);
    expect(t.teamColor).toBe('#123456');
    expect(stored(KEYS.drills).map(d => d.id).sort()).toEqual(['d1', 'd9']);
    expect(stored(KEYS.sessions)).toHaveLength(2);
    expect(stored(KEYS.squad).map(m => m.name)).toEqual(['Jan', 'Nowy']);
    expect(r.summary.join(' ')).toContain('dodano 1 ćwiczenie');
  });

  it('„Zastąp” podmienia część, a „Cofnij ostatni import” przywraca poprzedni stan', () => {
    seed({ drills: [drill('a'), drill('b'), drill('c')] });
    expect(replaceLosses({ drills: 'replace' })).toEqual(['3 ćwiczenia']);
    applyImport(incoming, { tactics: 'skip', drills: 'replace', sessions: 'skip', squad: 'skip', settings: 'replace' });
    expect(stored(KEYS.drills).map(d => d.id)).toEqual(['d1', 'd9']);
    expect(stored(KEYS.tactics).teamColor).toBe('#00ff00');
    expect(undoInfo()).not.toBeNull();

    expect(undoLastImport()).toBe(true);
    expect(stored(KEYS.drills).map(d => d.id)).toEqual(['a', 'b', 'c']);
    expect(stored(KEYS.tactics).teamColor).toBe('#123456');
    expect(undoInfo()).toBeNull();
    expect(undoLastImport()).toBe(false);
  });

  it('„Pomiń” niczego nie zmienia', () => {
    seed({ drills: [drill('a')] });
    applyImport(incoming, { tactics: 'skip', drills: 'skip', sessions: 'skip', squad: 'skip', settings: 'skip' });
    expect(stored(KEYS.drills).map(d => d.id)).toEqual(['a']);
  });
});

describe('przypomnienie o kopii i zajętość pamięci', () => {
  it('przypomina, gdy są dane i nie było kopii; po kopii przestaje', () => {
    expect(needsBackup()).toBe(false);
    seed({ drills: [drill('d1')] });
    expect(backupAgeDays()).toBeNull();
    expect(needsBackup()).toBe(true);
    markBackupDone();
    expect(backupAgeDays()).toBe(0);
    expect(needsBackup()).toBe(false);
  });

  it('liczy zajętość pamięci w bajtach', () => {
    localStorage.setItem('k', 'abcd');
    expect(storageUsage()).toBe(('k'.length + 4) * 2);
  });
});
