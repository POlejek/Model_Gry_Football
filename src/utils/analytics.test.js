import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CONSENT_KEY, gaId, getConsent, needsConsent, initAnalytics, setConsent, track, resetAnalyticsForTests } from './analytics.js';

const gaScripts = () => [...document.head.querySelectorAll('script[src*="googletagmanager"]')];
const events = () => (window.dataLayer || []).map(a => [...a]).filter(a => a[0] === 'event');

beforeEach(() => {
  resetAnalyticsForTests();
  gaScripts().forEach(s => s.remove());
  delete window.dataLayer;
  delete window.gtag;
});
afterEach(() => vi.unstubAllEnvs());

describe('statystyki (Google Analytics)', () => {
  it('bez identyfikatora (testy, wersja lokalna) nie pyta i niczego nie wysyła', () => {
    vi.stubEnv('VITE_GA_ID', '');
    expect(gaId()).toBe('');
    expect(needsConsent()).toBe(false);
    setConsent('granted');
    track('tab_view', { tab: 'training' });
    expect(gaScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it('z identyfikatorem pyta raz; odmowa nie ładuje skryptu ani zdarzeń', () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    expect(needsConsent()).toBe(true);
    setConsent('denied');
    expect(getConsent()).toBe('denied');
    expect(needsConsent()).toBe(false);
    initAnalytics();
    track('tab_view', { tab: 'training' });
    expect(gaScripts()).toHaveLength(0);
  });

  it('po zgodzie ładuje skrypt raz, bez reklam i Google Signals, i wysyła zdarzenia', () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    setConsent('granted');
    initAnalytics();
    expect(gaScripts()).toHaveLength(1);
    expect(gaScripts()[0].src).toContain('id=G-TEST123');
    const calls = window.dataLayer.map(a => [...a]);
    expect(calls).toContainEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' })]);
    expect(calls).toContainEqual(['config', 'G-TEST123', { allow_google_signals: false, allow_ad_personalization_signals: false }]);
    track('print_session', { kind: 'cert' });
    expect(events()).toEqual([['event', 'print_session', { kind: 'cert' }]]);
  });

  it('wycofanie zgody zatrzymuje zdarzenia i usuwa ciasteczka _ga', () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    setConsent('granted');
    document.cookie = '_ga=GA1.1.123; path=/';
    document.cookie = '_ga_TEST=GS1.1; path=/';
    setConsent('denied');
    expect(window.dataLayer.map(a => [...a])).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(document.cookie).not.toMatch(/_ga/);
    track('tab_view', { tab: 'session' });
    expect(events()).toEqual([]);
  });

  it('wcześniejsza zgoda uruchamia statystyki przy starcie; nieznana wartość = brak wyboru', () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    localStorage.setItem(CONSENT_KEY, 'granted');
    initAnalytics();
    expect(gaScripts()).toHaveLength(1);
    localStorage.setItem(CONSENT_KEY, 'cos');
    expect(getConsent()).toBeNull();
  });
});
