import { test, expect, openTab } from './fixtures.js';

const drill = (id, name) => ({
  id, name, version: 2, createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z',
  frames: [{ items: [{ id: 1, type: 'player', team: 'A', x: 200, y: 200, rotation: 0, scale: 1, color: '#1d4ed8', label: '1' }], lines: [], zones: [] }],
  pitch: { type: 'custom', orientation: 'horizontal', width: 40, length: 60 },
  meta: { category: 'Gra', duration: '20', players: '14', area: '60×40 m', objective: 'Cel', organization: 'Organizacja '.repeat(30), description: 'Przebieg '.repeat(60), coachingPoints: 'Punkty', variations: 'Warianty', phases: [] },
});

test.describe('Konspekt – wydruk', () => {
  test('grafika w wydruku per ćwiczenie i tryb kompaktowy: 2 krótkie ćwiczenia na jednej stronie', async ({ page }) => {
    await page.evaluate(([a, b]) => {
      localStorage.setItem('trainingDrillLibrary', JSON.stringify([a, b]));
      localStorage.setItem('trainingSessions', JSON.stringify([{ id: 's1', title: 'Test wydruku', date: '2026-10-20', group: 'U14', goal: '', notes: '', phases: [],
        blocks: [{ id: 'b1', drillId: a.id, minutes: '20', note: '' }, { id: 'b2', drillId: b.id, minutes: '20', note: '' }], createdAt: '', updatedAt: '' }]));
    }, [drill('d1', 'Ćwiczenie A'), drill('d2', 'Ćwiczenie B')]);
    await page.reload();
    await openTab(page, 'Konspekt');

    const toggle = page.getByRole('button', { name: 'Grafika w wydruku: Ćwiczenie B' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const blocks = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions'))[0].blocks.map(b => b.printImage));
    expect(blocks).toEqual([undefined, false]);

    await page.getByLabel('Tryb wydruku').selectOption('compact');
    await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
    await page.getByRole('button', { name: 'Drukuj / PDF' }).click();
    await page.waitForFunction(() => window.__printed === true);
    const result = await page.evaluate(() => ({
      images: document.querySelectorAll('.print-root .print-block img').length,
      breaks: [...document.querySelectorAll('.print-root [data-print-unit]')].filter(el => el.style.breakBefore === 'page').length,
    }));
    expect(result.images).toBe(1); // tylko ćwiczenie A ma grafikę
    expect(result.breaks).toBe(0); // nagłówek + A + B (bez grafiki) mieszczą się na jednej stronie
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  });
});
