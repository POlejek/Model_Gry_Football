import { test, expect, openTab, dragOnCanvas, clickOnCanvas, canvasPoint, trainingDraft } from './fixtures.js';

const paletteTile = (page, label) => page.locator('aside:visible').getByTitle(new RegExp(`^${label} —`));
const nameInput = (page) => page.locator('aside:visible').getByRole('textbox', { name: 'Nazwa ćwiczenia' });

test.describe('Trening', () => {
  test.beforeEach(async ({ page }) => {
    await openTab(page, 'Trening');
  });

  test('przeciągnięcie sprzętu z palety kładzie go w miejscu upuszczenia', async ({ page }) => {
    const canvas = page.locator('canvas:visible');
    const box = await canvas.boundingBox();
    await paletteTile(page, 'Stożek').dragTo(canvas, { targetPosition: { x: box.width * 0.25, y: box.height * 0.5 } });
    const draft = await trainingDraft(page);
    const [cone] = draft.frames[0].items;
    expect(cone.type).toBe('cone');
    expect(cone.x).toBeCloseTo(1080 * 0.25, -1);
    expect(cone.y).toBeCloseTo(700 * 0.5, -1);
  });

  test('wielokąt: każde kliknięcie dodaje dokładnie jeden punkt, a kliknięcie pierwszego zamyka strefę', async ({ page }) => {
    await page.keyboard.press('s');
    await page.getByRole('button', { name: 'Wielokąt' }).filter({ visible: true }).first().click();
    for (const [x, y] of [[200, 200], [500, 200], [500, 450], [200, 450]]) await clickOnCanvas(page, x, y);
    await expect(page.getByText(/Punkty: 4/)).toBeVisible();
    await clickOnCanvas(page, 200, 200);
    const draft = await trainingDraft(page);
    expect(draft.frames[0].zones[0].points).toHaveLength(4);
  });

  test('zapis do biblioteki, nowe ćwiczenie i ponowne otwarcie po odświeżeniu strony', async ({ page }) => {
    await paletteTile(page, 'Zawodnik A').click();
    await paletteTile(page, 'Piłka').click();
    await nameInput(page).fill('Rondo 4v2');
    await page.keyboard.press('Control+s');
    await expect(page.getByRole('status')).toHaveText('Zapisano „Rondo 4v2”');

    await page.getByRole('button', { name: /Więcej/ }).first().click();
    await page.getByRole('button', { name: 'Nowe ćwiczenie', exact: true }).click();
    await expect(nameInput(page)).toHaveValue('');

    await page.reload();
    await openTab(page, 'Trening');
    await page.locator('aside:visible').getByRole('button', { name: /Biblioteka/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Otwórz' }).click();
    await expect(nameInput(page)).toHaveValue('Rondo 4v2');
    const draft = await trainingDraft(page);
    expect(draft.frames[0].items.map(i => i.type).sort()).toEqual(['ball', 'player']);
  });

  test('eksport PNG i karty ćwiczenia pobiera pliki z bezpiecznymi nazwami', async ({ page }) => {
    await paletteTile(page, 'Stożek').click();
    await nameInput(page).fill('Wyjście spod pressingu');
    for (const [label, file] of [['Pobierz PNG', 'Wyjscie_spod_pressingu.png'], ['Pobierz kartę ćwiczenia', 'Wyjscie_spod_pressingu_karta.png']]) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label }).click()]);
      expect(download.suggestedFilename()).toBe(file);
    }
  });

  test('animacja: ruch zawodnika między klatkami i ponowne odtworzenie', async ({ page }) => {
    await paletteTile(page, 'Zawodnik A').click();
    await page.getByRole('button', { name: 'Dodaj klatkę' }).filter({ visible: true }).click();
    const draft = await trainingDraft(page);
    const p = draft.frames[1].items[0];
    await dragOnCanvas(page, [p.x, p.y], [p.x + 200, p.y + 100]);

    // Records every playback start in the page, so a short animation cannot slip between assertion polls.
    await page.evaluate(() => {
      window.__playbackStarts = 0;
      new MutationObserver(() => {
        const playing = [...document.querySelectorAll('button')].some(b => b.textContent.includes('Stop'));
        if (playing && !window.__wasPlaying) window.__playbackStarts++;
        window.__wasPlaying = playing;
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });

    for (let run = 1; run <= 2; run++) {
      await page.getByRole('button', { name: /Odtwórz/ }).click();
      await expect.poll(() => page.evaluate(() => window.__playbackStarts)).toBe(run);
      await expect(page.getByRole('button', { name: /Odtwórz/ })).toBeVisible({ timeout: 5_000 });
    }
  });

  test('zmiana boiska na połowę w poziomie zachowuje elementy w granicach boiska', async ({ page }) => {
    await paletteTile(page, 'Bramka').click();
    await page.keyboard.press('Escape'); // odznacz, aby panel pokazał ustawienia boiska
    await page.getByRole('button', { name: 'Połowa' }).click();
    await page.getByRole('button', { name: /Pionowo/ }).click();
    const canvasSize = await page.locator('canvas:visible').evaluate(c => [c.width, c.height]);
    expect(canvasSize).toEqual([700, 560]);
    const [goal] = (await trainingDraft(page)).frames[0].items;
    expect(goal.x).toBeLessThan(700);
    expect(goal.y).toBeLessThan(560);
    expect(await canvasPoint(page, 0, 0)).toBeTruthy();
  });
});
