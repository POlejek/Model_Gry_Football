import { test, expect, openTab, canvasPoint, trainingDraft } from './fixtures.js';

// Runs on phone viewports with touch (projects "telefon" and, in CI, "iphone").
async function swipe(page, from, to) {
  const [x0, y0] = await canvasPoint(page, ...from);
  const [x1, y1] = await canvasPoint(page, ...to);
  await page.locator('canvas:visible').dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: x0, clientY: y0 }], changedTouches: [{ identifier: 1, clientX: x0, clientY: y0 }] });
  for (let i = 1; i <= 6; i++) {
    const x = x0 + ((x1 - x0) * i) / 6, y = y0 + ((y1 - y0) * i) / 6;
    await page.locator('canvas:visible').dispatchEvent('touchmove', { touches: [{ identifier: 1, clientX: x, clientY: y }], changedTouches: [{ identifier: 1, clientX: x, clientY: y }] });
  }
  await page.locator('canvas:visible').dispatchEvent('touchend', { touches: [], changedTouches: [{ identifier: 1, clientX: x1, clientY: y1 }] });
}

const noHorizontalOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('Telefon', () => {
  test('Taktyka: pasek narzędzi i boisko mieszczą się na ekranie', async ({ page }) => {
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expect(page.getByRole('button', { name: 'Linie' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fazy i schematy' })).toBeVisible();
  });

  test('Trening: dodanie zawodnika z arkusza „Sprzęt” i przesunięcie go palcem', async ({ page }) => {
    await openTab(page, 'Trening');
    await page.getByRole('navigation').getByRole('button', { name: 'Sprzęt' }).click();
    await page.getByRole('dialog').getByTitle(/^Zawodnik A —/).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const before = (await trainingDraft(page)).frames[0].items[0];
    await swipe(page, [before.x, before.y], [before.x + 120, before.y - 150]);
    const after = (await trainingDraft(page)).frames[0].items[0];
    expect(after.x - before.x).toBeGreaterThan(80);
    expect(before.y - after.y).toBeGreaterThan(100);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('Trening: zapis ćwiczenia z arkusza „Ćwiczenie”', async ({ page }) => {
    await openTab(page, 'Trening');
    await page.getByRole('navigation').getByRole('button', { name: 'Ćwiczenie' }).click();
    const sheet = page.getByRole('dialog', { name: 'Ćwiczenie' });
    await sheet.getByRole('textbox', { name: 'Nazwa ćwiczenia' }).fill('Mobilne');
    await sheet.getByRole('button', { name: 'Zapisz w bibliotece' }).click();
    await expect(page.getByRole('status')).toHaveText('Zapisano „Mobilne”');
  });
});
