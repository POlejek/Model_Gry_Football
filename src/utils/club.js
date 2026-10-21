// School (club) details printed on the certification session plan: name, team, logo and coaches.
export const CLUB_KEY = 'modelGryClub';

export const EMPTY_CLUB = { name: '', team: '', logo: '', coach: '', assistant: '' };

// Only known text fields are kept, so a damaged or foreign file cannot inject anything else.
export function normalizeClub(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_CLUB };
  return Object.fromEntries(Object.keys(EMPTY_CLUB).map(k => [k, typeof raw[k] === 'string' ? raw[k] : '']));
}

export const isEmptyClub = (club) => Object.values(normalizeClub(club)).every(v => !v.trim());

export function loadClub() {
  try {
    return normalizeClub(JSON.parse(localStorage.getItem(CLUB_KEY)));
  } catch {
    return { ...EMPTY_CLUB };
  }
}

export function saveClub(club) {
  try {
    localStorage.setItem(CLUB_KEY, JSON.stringify(normalizeClub(club)));
    return true;
  } catch {
    return false;
  }
}

// Header of the printout, e.g. "AP BKS Naprzód Brwinów - 2013".
export const clubTitle = (club) => [club?.name, club?.team].map(s => (s || '').trim()).filter(Boolean).join(' - ');
