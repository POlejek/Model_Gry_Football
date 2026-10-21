// Session plan in the layout required by the PZPN certification of football schools:
// header fields, methodical parts of the session (wstępna / główna / końcowa) and equipment table.
import { TYPE_LABELS } from './drill.js';
import { plural } from './backup.js';

export const PARTS = [
  { id: 'wstepna', label: 'Część wstępna' },
  { id: 'glowna', label: 'Część główna' },
  { id: 'koncowa', label: 'Część końcowa' },
];

// Fields filled in for the certification printout (stored as session.cert; all optional).
export const EMPTY_CERT = {
  enabled: false,
  coach: '', assistant: '', topic: '', microcycle: '',
  technique: '', teamplay: '', motor: '', mental: '',
  time: '', place: '', number: '', players: '',
  equipment: [], // [{ name, count }]
};

export const certOf = (session) => ({ ...EMPTY_CERT, ...(session?.cert || {}) });

// Part of a block the coach has not assigned yet: the first block opens the session, the last one
// closes it (when there are at least three), everything in between is the main part.
export function guessPart(index, count) {
  if (index === 0 && count > 1) return 'wstepna';
  if (index === count - 1 && count > 2) return 'koncowa';
  return 'glowna';
}

export const blockPart = (block, index, count) => (PARTS.some(p => p.id === block?.part) ? block.part : guessPart(index, count));

// Blocks grouped by part in methodical order; each item keeps its number in the whole session.
export function groupByPart(items, getBlock = x => x.block) {
  const groups = PARTS.map(p => ({ ...p, items: [], minutes: 0 }));
  items.forEach((item, i) => {
    const group = groups.find(g => g.id === blockPart(getBlock(item), i, items.length));
    group.items.push({ ...item, number: i + 1 });
    group.minutes += Math.max(0, parseInt(getBlock(item).minutes, 10) || 0);
  });
  return groups.filter(g => g.items.length);
}

// Equipment for the whole session: for each type the largest amount any single drill uses.
export function equipmentRows(drills) {
  const max = {};
  drills.forEach(d => {
    const perType = {};
    (d?.frames || []).forEach(f => (f.items || []).forEach(i => {
      if (['player', 'text', 'step', 'coach'].includes(i.type) || !TYPE_LABELS[i.type]) return;
      (perType[i.type] ||= new Set()).add(i.id);
    }));
    Object.entries(perType).forEach(([t, ids]) => { max[t] = Math.max(max[t] || 0, ids.size); });
  });
  return Object.entries(max).map(([t, n]) => ({ name: TYPE_LABELS[t], count: String(n) }));
}

// Equipment typed by the coach wins; without it the printout uses what the drills contain.
export function printedEquipment(cert, drills) {
  const typed = (cert.equipment || []).filter(e => (e.name || '').trim() || String(e.count || '').trim());
  return typed.length ? typed : equipmentRows(drills);
}

// "Sprzęt / Liczba" table: rows of `perRow` cells, padded with empty cells, at least one row.
export function equipmentGrid(list, perRow = 7) {
  const rows = [];
  for (let i = 0; i < Math.max(1, list.length); i += perRow) {
    const row = list.slice(i, i + perRow).map(e => ({ name: e.name || '', count: String(e.count ?? '') }));
    while (row.length < perRow) row.push({ name: '', count: '' });
    rows.push(row);
  }
  return rows;
}

export const playersText = (n) => {
  const count = parseInt(n, 10);
  return Number.isNaN(count) ? '' : plural(count, 'osoba', 'osoby', 'osób');
};
