import { describe, it, expect, vi, afterEach } from 'vitest';
import { pageRanges, isIOS, sharePdf } from './pdfExport.js';

const block = (top, bottom, breakBefore = false) => ({ top, bottom, breakBefore });

describe('pageRanges (strony PDF dzielone między blokami)', () => {
  it('bloki, które się mieszczą, są na jednej stronie', () => {
    expect(pageRanges([block(0, 100), block(110, 400)], 1000)).toEqual([[0, 400]]);
  });

  it('blok, który się nie mieści, zaczyna nową stronę zamiast być przecięty', () => {
    expect(pageRanges([block(0, 600), block(610, 1200), block(1210, 1500)], 1000)).toEqual([[0, 610], [610, 1500]]);
  });

  it('wymuszony podział strony (układ „ćwiczenie na stronę”, „1 / 2 strony”)', () => {
    expect(pageRanges([block(0, 200), block(210, 400, true)], 1000)).toEqual([[0, 210], [210, 400]]);
  });

  it('blok wyższy niż strona jest dzielony na kolejne strony', () => {
    expect(pageRanges([block(0, 2500)], 1000)).toEqual([[0, 1000], [1000, 2000], [2000, 2500]]);
  });

  it('pusty wydruk nie ma stron', () => {
    expect(pageRanges([], 1000)).toEqual([]);
  });
});

describe('rozpoznanie iPhone / iPad i udostępnianie', () => {
  afterEach(() => vi.restoreAllMocks());

  it('iPhone i iPad (także iPad udający Maca), ale nie Android', () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get');
    ua.mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(isIOS()).toBe(true);
    ua.mockReturnValue('Mozilla/5.0 (Linux; Android 14; Pixel 7)');
    expect(isIOS()).toBe(false);
    ua.mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    expect(isIOS()).toBe(true);
    delete navigator.maxTouchPoints;
  });

  it('udostępnia plik przez menu systemowe, a bez niego pobiera', async () => {
    const file = new File(['%PDF'], 'konspekt.pdf', { type: 'application/pdf' });
    navigator.canShare = () => true;
    navigator.share = vi.fn().mockResolvedValue();
    expect(await sharePdf(file)).toBe('shared');
    expect(navigator.share).toHaveBeenCalledWith({ files: [file], title: 'konspekt' });

    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect(await sharePdf(file)).toBe('cancelled');

    navigator.canShare = () => false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await sharePdf(file)).toBe('downloaded');
    expect(click).toHaveBeenCalled();
    delete navigator.canShare; delete navigator.share;
  });
});
