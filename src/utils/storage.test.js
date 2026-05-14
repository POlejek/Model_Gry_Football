import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStoredData, saveStoredData, STORAGE_VERSION } from './storage.js';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

describe('loadStoredData', () => {
  it('zwraca null gdy brak danych', () => {
    expect(loadStoredData()).toBeNull();
  });

  it('wczytuje dane w bieżącej wersji', () => {
    saveStoredData({ phases: {}, schemes: {} });
    const data = loadStoredData();
    expect(data).not.toBeNull();
    expect(data.phases).toEqual({});
  });

  it('migruje dane z wersji 1 (bez _version)', () => {
    localStorageMock.setItem('footballTacticsData', JSON.stringify({ phases: {}, schemes: {} }));
    const data = loadStoredData();
    expect(data).not.toBeNull();
    expect(data._version).toBe(STORAGE_VERSION);
  });

  it('zwraca null i czyści localStorage po uszkodzonym JSON', () => {
    localStorageMock.setItem('footballTacticsData', 'INVALID_JSON{{{');
    expect(loadStoredData()).toBeNull();
    expect(localStorageMock.getItem('footballTacticsData')).toBeNull();
  });
});

describe('saveStoredData', () => {
  it('zapisuje dane z właściwą wersją', () => {
    saveStoredData({ phases: { 'Atak': [] } });
    const raw = JSON.parse(localStorageMock.getItem('footballTacticsData'));
    expect(raw._version).toBe(STORAGE_VERSION);
    expect(raw.phases).toEqual({ 'Atak': [] });
  });
});
