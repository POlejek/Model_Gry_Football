import { test as base, expect } from '@playwright/test';

// Every test starts with empty storage and fails on any uncaught page error or the app's error bar.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('dialog', (d) => d.accept());
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await use(page);
    expect(errors, 'błędy JavaScript na stronie').toEqual([]);
    await expect(page.getByRole('alert')).toHaveCount(0);
  },
});

export { expect };

export const openTab = (page, name) => page.getByRole('tab', { name: new RegExp(name) }).click();

// Canvas coordinates (in the canvas' own pixels) → mouse position on the page.
export async function canvasPoint(page, x, y) {
  const canvas = page.locator('canvas:visible');
  const box = await canvas.boundingBox();
  const width = await canvas.evaluate((c) => c.width);
  const s = box.width / width;
  return [box.x + x * s, box.y + y * s];
}

export async function dragOnCanvas(page, from, to) {
  await page.mouse.move(...(await canvasPoint(page, ...from)));
  await page.mouse.down();
  await page.mouse.move(...(await canvasPoint(page, ...to)), { steps: 8 });
  await page.mouse.up();
}

export const clickOnCanvas = async (page, x, y) => page.mouse.click(...(await canvasPoint(page, x, y)));

export const tacticsData = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('footballTacticsData')));

export const firstScheme = async (page, format = '11v11') => {
  const data = await tacticsData(page);
  return Object.values(data.schemes[format]).flat()[0];
};

// The training editor saves its draft after a short debounce.
export const trainingDraft = async (page) => {
  await page.waitForTimeout(700);
  return page.evaluate(() => JSON.parse(localStorage.getItem('trainingDrillDraft')));
};
