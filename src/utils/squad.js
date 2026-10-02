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
