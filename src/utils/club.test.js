import { describe, it, expect } from 'vitest';
import { CLUB_KEY, EMPTY_CLUB, normalizeClub, isEmptyClub, loadClub, saveClub, clubTitle } from './club.js';

describe('szkółka', () => {
  it('bez zapisu zwraca puste dane, a uszkodzony zapis nie psuje aplikacji', () => {
    expect(loadClub()).toEqual(EMPTY_CLUB);
    localStorage.setItem(CLUB_KEY, '{nie-json');
    expect(loadClub()).toEqual(EMPTY_CLUB);
  });

  it('zapisuje i wczytuje tylko znane pola tekstowe', () => {
    expect(saveClub({ name: 'AP BKS Naprzód Brwinów', team: '2013', coach: 'Jan', extra: 'x', logo: 5 })).toBe(true);
    expect(loadClub()).toEqual({ ...EMPTY_CLUB, name: 'AP BKS Naprzód Brwinów', team: '2013', coach: 'Jan' });
    expect(normalizeClub('tekst')).toEqual(EMPTY_CLUB);
  });

  it('pusta szkółka i tytuł nagłówka', () => {
    expect(isEmptyClub({ name: '  ' })).toBe(true);
    expect(isEmptyClub({ coach: 'Jan' })).toBe(false);
    expect(clubTitle({ name: 'AP BKS Naprzód Brwinów', team: '2013' })).toBe('AP BKS Naprzód Brwinów - 2013');
    expect(clubTitle({ name: '', team: '2013' })).toBe('2013');
    expect(clubTitle(null)).toBe('');
  });
});
