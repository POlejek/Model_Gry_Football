// Wersja formatu danych — zmień przy niekompatybilnych zmianach schematu
export const STORAGE_VERSION = 2;
const STORAGE_KEY = 'footballTacticsData';

/**
 * Migruje dane ze starszych wersji do bieżącej.
 * Dodaj tutaj kolejne case'y gdy format się zmieni.
 */
function migrateData(data, fromVersion) {
  let migrated = { ...data };

  if (fromVersion < 2) {
    // v1 → v2: brak zmian strukturalnych; wystarczy oznaczyć wersję
    migrated._version = 2;
  }

  return migrated;
}

export function loadStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const version = data._version ?? 1;

    if (version < STORAGE_VERSION) {
      return migrateData(data, version);
    }

    return data;
  } catch (err) {
    console.error('[storage] Błąd wczytywania danych — resetuję:', err);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _version: STORAGE_VERSION }));
  } catch (err) {
    // Np. QuotaExceededError — nie blokujemy UI
    console.warn('[storage] Nie udało się zapisać danych:', err);
  }
}

export function clearStoredData() {
  localStorage.removeItem(STORAGE_KEY);
}
