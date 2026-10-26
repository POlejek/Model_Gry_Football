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
    // a new drill has 30 px of room beyond the lines on each side: 1080 × 700 pitch → 1140 × 760
    expect(cone.x).toBeCloseTo(1140 * 0.25, -1);
    expect(cone.y).toBeCloseTo(760 * 0.5, -1);
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

    await page.locator('aside:visible').getByRole('button', { name: 'Nowe ćwiczenie', exact: true }).click();
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
    expect(canvasSize).toEqual([760, 620]);
    const [goal] = (await trainingDraft(page)).frames[0].items;
    expect(goal.x).toBeLessThan(760);
    expect(goal.y).toBeLessThan(620);
    expect(await canvasPoint(page, 0, 0)).toBeTruthy();
  });

  test('bandy z logo szkółki: wyłączone bez szkółki, ramka wokół boiska nie przesuwa elementów', async ({ page }) => {
    await page.getByRole('tab', { name: 'Boisko i kolory' }).click();
    const toggle = page.getByRole('button', { name: 'Bandy: uzupełnij logo w Szkółce' }).filter({ visible: true });
    await expect(toggle).toBeDisabled();

    await page.getByRole('button', { name: 'Szkółka' }).click();
    await page.getByRole('dialog', { name: 'Szkółka i trener' }).getByLabel('Nazwa szkółki / klubu').fill('AP BKS Naprzód Brwinów');
    await page.getByRole('dialog', { name: 'Szkółka i trener' }).getByRole('button', { name: 'Gotowe' }).click();

    const canvas = page.locator('canvas:visible');
    const before = await canvas.evaluate(c => [c.width, c.height]);
    await page.getByRole('button', { name: 'Bandy z logo szkółki' }).filter({ visible: true }).click();
    const after = await canvas.evaluate(c => [c.width, c.height]);
    expect(after).toEqual([before[0] + 68, before[1] + 68]); // 34 px frame on each side
    expect((await trainingDraft(page)).pitch.boards).toBe(true);

    // a drop in the middle of the canvas still lands in the middle of the pitch
    const box = await canvas.boundingBox();
    await paletteTile(page, 'Stożek').dragTo(canvas, { targetPosition: { x: box.width * 0.5, y: box.height * 0.5 } });
    const [cone] = (await trainingDraft(page)).frames[0].items;
    expect(cone.x).toBeCloseTo(1140 / 2, -1);
    expect(cone.y).toBeCloseTo(760 / 2, -1);
  });

  test('banda jak pachołek: dodanie z palety, własny tekst, długość i przesunięcie', async ({ page }) => {
    await paletteTile(page, 'Banda').click();
    let [board] = (await trainingDraft(page)).frames[0].items;
    expect(board).toMatchObject({ type: 'board', content: 'brand', length: 150 });

    await page.getByLabel('Treść bandy').filter({ visible: true }).selectOption('text');
    await page.getByLabel('Tekst na bandzie').filter({ visible: true }).fill('Fair play');
    await page.getByLabel('Długość bandy').filter({ visible: true }).fill('300');
    [board] = (await trainingDraft(page)).frames[0].items;
    expect(board).toMatchObject({ content: 'text', text: 'Fair play', length: 300 });

    await dragOnCanvas(page, [board.x, board.y], [board.x + 200, board.y + 100]);
    const [moved] = (await trainingDraft(page)).frames[0].items;
    expect(moved.x - board.x).toBeGreaterThan(150);
    expect(moved.y - board.y).toBeGreaterThan(70);
  });

  test('połowa → całe boisko: ćwiczenie zostaje na swojej połowie, dochodzi pusta połowa', async ({ page }) => {
    await page.getByRole('tab', { name: 'Boisko i kolory' }).click();
    await page.getByRole('button', { name: 'Połowa' }).click();
    const canvas = page.locator('canvas:visible');
    const box = await canvas.boundingBox();
    await paletteTile(page, 'Stożek').dragTo(canvas, { targetPosition: { x: box.width * 0.8, y: box.height * 0.3 } });
    const [before] = (await trainingDraft(page)).frames[0].items;
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Boisko i kolory' }).click();
    await page.getByRole('button', { name: 'Całe' }).click();
    expect(await canvas.evaluate(c => [c.width, c.height])).toEqual([1140, 760]);
    const [after] = (await trainingDraft(page)).frames[0].items;
    expect(after.x).toBeCloseTo(before.x + (1140 - 620), 0); // the goal end stays on the right
    expect(after.y).toBeCloseTo(before.y, 0);
    expect(after.scale).toBe(1);
  });

  test('miejsce za liniami: nowe ćwiczenie ma 50 px za liniami, wyłączenie przesuwa rysunek razem z liniami', async ({ page }) => {
    await paletteTile(page, 'Banda').click();
    const [board] = (await trainingDraft(page)).frames[0].items;

    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Boisko i kolory' }).click();
    const toggle = page.getByRole('button', { name: 'Miejsce za liniami' }).filter({ visible: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.locator('canvas:visible').evaluate(c => [c.width, c.height])).toEqual([1080, 700]);
    const [moved] = (await trainingDraft(page)).frames[0].items;
    expect(moved.x).toBeCloseTo(board.x - 30, 0);
    expect(moved.y).toBeCloseTo(board.y - 30, 0);
  });
});
