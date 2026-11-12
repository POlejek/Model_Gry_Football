// Team squad shared by the tactics and training editors (one list per device).
export const SQUAD_KEY = 'modelGrySquad';

export const POSITIONS = [
  { id: 'BR', label: 'Bramkarz' },
  { id: 'OBR', label: 'Obrońca' },
  { id: 'POM', label: 'Pomocnik' },
  { id: 'NAP', label: 'Napastnik' },
];

export function loadSquad() {
  try {
    const list = JSON.parse(localStorage.getItem(SQUAD_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSquad(list) {
  try {
    localStorage.setItem(SQUAD_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// Label used on the pitch: the surname (last word), which fits better than the full name.
export const shortName = (member) => {
  const parts = String(member?.name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
};

export const findByNumber = (squad, number) =>
  squad.find(m => String(m.number).trim() !== '' && String(m.number).trim() === String(number ?? '').trim());

export const sortSquad = (squad) => [...squad].sort((a, b) => {
  const na = parseInt(a.number, 10), nb = parseInt(b.number, 10);
  if (Number.isNaN(na) && Number.isNaN(nb)) return String(a.name).localeCompare(String(b.name), 'pl');
  if (Number.isNaN(na)) return 1;
  if (Number.isNaN(nb)) return -1;
  return na - nb;
});

const byNumber = (a, b) => (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999);

// Fills the own team with squad members by role: the player nearest the own goal (largest y, the
// team attacks upwards) is the goalkeeper; the rest are split by depth into defence / midfield /
// attack bands and matched with members of that position. Returns { [playerId]: number }.
export function assignSquadToTeam(team, squad) {
  const members = squad.filter(m => String(m.number ?? '').trim() !== '');
  if (!members.length || !team.length) return {};
  const pool = { BR: [], OBR: [], POM: [], NAP: [] };
  members.forEach(m => (pool[m.position] || pool.POM).push(m));
  Object.values(pool).forEach(list => list.sort(byNumber));

  const sorted = [...team].sort((a, b) => b.y - a.y);
  const [keeper, ...outfield] = sorted;
  const ys = outfield.map(p => p.y);
  const deep = Math.max(...ys), high = Math.min(...ys);
  const band = (p) => {
    if (deep === high) return 'POM';
    const t = (deep - p.y) / (deep - high); // 0 = deepest, 1 = most advanced
    return t < 1 / 3 ? 'OBR' : t < 2 / 3 ? 'POM' : 'NAP';
  };

  const result = {};
  const used = new Set();
  const take = (role) => {
    const m = pool[role].find(x => !used.has(x.id));
    if (m) used.add(m.id);
    return m;
  };
  const anyLeft = () => {
    for (const role of ['POM', 'OBR', 'NAP', 'BR']) {
      const m = take(role);
      if (m) return m;
    }
    return null;
  };

  const gk = take('BR');
  if (gk) result[keeper.id] = String(gk.number);
  // Forwards first, most advanced and most central first (a lone striker gets the striker, not a
  // winger); then defenders and midfielders. Players left without a member of their position get
  // any remaining member, preferably a midfielder.
  const centerX = outfield.reduce((sum, p) => sum + p.x, 0) / (outfield.length || 1);
  const order = { NAP: 0, OBR: 1, POM: 2 };
  const pending = [];
  [...outfield]
    .sort((a, b) => (order[band(a)] - order[band(b)]) || (a.y - b.y) || (Math.abs(a.x - centerX) - Math.abs(b.x - centerX)))
    .forEach(p => {
      const m = take(band(p));
      if (m) result[p.id] = String(m.number);
      else pending.push(p);
    });
  [...pending, ...(gk ? [] : [keeper])].forEach(p => {
    const m = anyLeft();
    if (m) result[p.id] = String(m.number);
  });
  return result;
}

// ── Pasting a squad list (Excel, Google Sheets, a text editor) ──
// Each line is one player. Excel gives tab-separated cells; a text line may be "7 Jan Kowalski",
// "7. Jan Kowalski – POM", "Jan Kowalski;7;Obrońca" or just a name. The number is the cell (or the
// leading / trailing token) made of digits, the position a recognised word, the rest is the name.
const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
const POSITION_WORDS = [
  ['BR', ['br', 'bramkarz', 'gk', 'goalkeeper', 'golkiper']],
  ['OBR', ['obr', 'obronca', 'obroncy', 'def', 'defender', 'so', 'bo', 'cb', 'lb', 'rb', 'lo', 'po', 'sw', 'stoper']],
  ['POM', ['pom', 'pomocnik', 'mid', 'midfielder', 'sp', 'cm', 'dm', 'am', 'cdm', 'cam', 'lp', 'pp', 'lm', 'rm', 'skrzydlowy', 'skrzydlo']],
  ['NAP', ['nap', 'napastnik', 'fw', 'st', 'att', 'forward', 'cf', 'striker', 'lw', 'rw']],
];
export function parsePosition(text) {
  const w = plain(String(text || '').trim()).replace(/[^a-z]/g, '');
  if (!w) return null;
  const hit = POSITION_WORDS.find(([, words]) => words.includes(w));
  return hit ? hit[0] : null;
}
const HEADER_WORDS = ['nr', 'numer', 'imie', 'i', 'nazwisko', 'pozycja', 'zawodnik', 'zawodnicy', 'name', 'no', 'lp', 'and'];
const isNumber = (s) => /^\d{1,3}$/.test(s);

export function parseSquadText(text) {
  return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).flatMap((line) => {
    let cells = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : null;
    if (!cells) {
      // free text: number and position at the start or the end, separated by spaces, dots or dashes
      const tokens = line.replace(/[.,)]/g, ' ').split(/\s+[-–—|]\s+|\s+/).filter(Boolean);
      cells = tokens;
    }
    cells = cells.map(c => c.trim()).filter(Boolean);
    if (!cells.length) return [];
    let number = '', position = null;
    const name = [];
    cells.forEach((c) => {
      const bare = c.replace(/^#/, '').replace(/[.)]$/, '');
      if (!number && isNumber(bare)) number = String(parseInt(bare, 10));
      else if (!position && parsePosition(c)) position = parsePosition(c);
      else if (!/^[-–—|]+$/.test(c)) name.push(c);
    });
    const words = name.join(' ').split(/[\s/]+/).map(w => plain(w).replace(/[^a-z]/g, '')).filter(Boolean);
    if (!number && !position && words.length && words.every(w => HEADER_WORDS.includes(w))) return []; // header row
    if (!number && !name.length) return [];
    return [{ number, name: name.join(' '), position: position || 'POM' }];
  });
}

// Adds parsed rows to the squad (or replaces it). Players without a number get the next free one.
export function mergeSquad(squad, parsed, mode = 'add') {
  const base = mode === 'replace' ? [] : [...squad];
  const used = new Set(base.map(m => String(m.number).trim()).filter(Boolean));
  parsed.forEach(p => { if (p.number) used.add(p.number); });
  let next = 1;
  const free = () => { while (used.has(String(next))) next++; used.add(String(next)); return String(next); };
  const stamp = Date.now();
  return [...base, ...parsed.map((p, i) => ({
    id: `p-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    number: p.number || free(), name: p.name, position: p.position,
  }))];
}
