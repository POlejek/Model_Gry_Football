import { describe, it, expect, vi } from 'vitest';
import { BOARD, hasBrand, boardSize, boardPanels, drawBoards } from './boards.js';

describe('bandy reklamowe', () => {
  it('są tylko, gdy ćwiczenie je ma, a szkółka ma logo lub nazwę', () => {
    expect(hasBrand({ name: '  ', logo: '' })).toBe(false);
    expect(hasBrand({ name: 'AP BKS', logo: '' })).toBe(true);
    expect(hasBrand({ name: '', logo: 'data:image/png;base64,AA' })).toBe(true);
    expect(hasBrand(null)).toBe(false);
    expect(boardSize({ boards: true }, { name: 'AP BKS' })).toBe(BOARD);
    expect(boardSize({ boards: false }, { name: 'AP BKS' })).toBe(0);
    expect(boardSize({ boards: true }, { name: '' })).toBe(0);
  });

  it.each([
    ['całe pionowo', 700, 1080],
    ['całe poziomo', 1080, 700],
    ['połowa', 700, 560],
    ['wymiar własny', 790, 1040],
  ])('%s: bandy na czterech bokach, poza boiskiem, na przemian logo i nazwa', (_, w, h) => {
    const b = BOARD;
    const panels = boardPanels(w, h, b);
    expect(panels.length).toBeGreaterThanOrEqual(4);
    panels.forEach(p => {
      const outside = p.y < b || p.y > h + b || p.x < b || p.x > w + b;
      expect(outside).toBe(true);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(w + 2 * b);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(h + 2 * b);
    });
    // the boards on one side cover the whole side
    const top = panels.filter(p => p.y === b / 2);
    expect(top.reduce((sum, p) => sum + p.w + 3, 0)).toBeCloseTo(w, 5);
    expect(panels.map(p => p.kind).slice(0, 4)).toEqual(['logo', 'name', 'logo', 'name']);
    expect(new Set(panels.map(p => p.rotation))).toEqual(new Set([0, Math.PI / 2, -Math.PI / 2]));
  });

  it('bez logo same nazwy, bez nazwy same logo, bez ramki nic', () => {
    expect(new Set(boardPanels(700, 1080, BOARD, { logo: false }).map(p => p.kind))).toEqual(new Set(['name']));
    expect(new Set(boardPanels(700, 1080, BOARD, { name: false }).map(p => p.kind))).toEqual(new Set(['logo']));
    expect(boardPanels(700, 1080, 0)).toEqual([]);
  });

  it('rysuje logo z zachowaniem proporcji i nazwę dużymi literami', () => {
    const ctx = {
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
      drawImage: vi.fn(), measureText: (t) => ({ width: t.length * 9 }),
    };
    const logo = { naturalWidth: 200, naturalHeight: 100 };
    drawBoards(ctx, { w: 700, h: 1080, b: BOARD, club: { name: 'AP BKS Naprzód' }, logo });
    const [, , , dw, dh] = ctx.drawImage.mock.calls[0];
    expect(dw / dh).toBeCloseTo(2, 5);
    expect(ctx.fillText).toHaveBeenCalledWith('AP BKS NAPRZÓD', 0, 1);

    const none = { ...ctx, fillRect: vi.fn() };
    drawBoards(none, { w: 700, h: 1080, b: 0, club: { name: 'X' } });
    expect(none.fillRect).not.toHaveBeenCalled();
  });
});
