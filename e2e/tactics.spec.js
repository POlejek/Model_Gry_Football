import { test, expect, dragOnCanvas, clickOnCanvas, canvasPoint, firstScheme } from './fixtures.js';

const newScheme = (page) => page.getByRole('button', { name: /^Nowy schemat$/ }).first().click();
const frameCounter = (page) => page.getByText(/^\d+ \/ \d+$/);

test.describe('Taktyka', () => {
  test('przesunięty zawodnik zostaje zapisany w schemacie i przetrwa odświeżenie strony', async ({ page }) => {
    await newScheme(page);
    // napastnik drużyny (nr 9) startuje w punkcie (350, 570)
    await dragOnCanvas(page, [350, 570], [450, 420]);
    const scheme = await firstScheme(page);
    const striker = scheme.frames[0].team.find(p => p.id === 'st');
    expect(striker.x).toBeCloseTo(450, -1);
    expect(striker.y).toBeCloseTo(420, -1);

    await page.reload();
    await expect(page.getByText('Schemat 1').first()).toBeVisible();
    const after = await firstScheme(page);
    expect(after.frames[0].team.find(p => p.id === 'st').x).toBeCloseTo(450, -1);
  });

  test('animację można odtworzyć ponownie od początku (zgłoszony błąd)', async ({ page }) => {
    await newScheme(page);
    await page.getByRole('button', { name: 'Dodaj klatkę' }).click();
    await dragOnCanvas(page, [350, 570], [450, 420]);
    await page.getByRole('button', { name: 'Dodaj klatkę' }).click();
    await dragOnCanvas(page, [450, 420], [300, 260]);

    // Records every counter value shown, so a fast animation cannot slip between assertion polls.
    await page.evaluate(() => {
      window.__frames = [];
      new MutationObserver(() => {
        const el = [...document.querySelectorAll('div')].find(d => /^\d+ \/ \d+$/.test(d.textContent.trim()) && !d.children.length);
        if (el && window.__frames.at(-1) !== el.textContent.trim()) window.__frames.push(el.textContent.trim());
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });

    for (let run = 1; run <= 3; run++) {
      await page.evaluate(() => { window.__frames = []; });
      await page.getByRole('button', { name: 'Odtwórz animację' }).click();
      await expect(frameCounter(page)).toHaveText('3 / 3', { timeout: 5_000 });
      // restarted from the first frame and played through every frame in order
      expect(await page.evaluate(() => window.__frames)).toEqual(['1 / 3', '2 / 3', '3 / 3']);
      await expect(page.getByRole('button', { name: 'Odtwórz animację' })).toBeVisible();
    }
  });

  test('rysowanie linii i strefy, zmiana rozmiaru strefy za róg i cofanie', async ({ page }) => {
    await newScheme(page);
    await page.keyboard.press('l');
    await dragOnCanvas(page, [100, 800], [300, 700]);
    await page.keyboard.press('s');
    await dragOnCanvas(page, [450, 150], [600, 300]);
    await page.keyboard.press('Escape');

    let scheme = await firstScheme(page);
    expect(scheme.frames[0].lines).toHaveLength(1);
    expect(scheme.frames[0].zones[0]).toMatchObject({ type: 'rectangle' });

    await clickOnCanvas(page, 525, 225);
    await dragOnCanvas(page, [600, 300], [650, 380]);
    scheme = await firstScheme(page);
    expect(scheme.frames[0].zones[0].width).toBeGreaterThan(180);
    expect(scheme.frames[0].zones[0].height).toBeGreaterThan(200);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    scheme = await firstScheme(page);
    expect(scheme.frames[0].zones[0].width).toBeLessThan(160);
    expect(scheme.frames[0].lines).toHaveLength(1);
  });

  test('nowa strefa trafia na spód; zawodnik w strefie ma pierwszeństwo przy kliknięciu', async ({ page }) => {
    await newScheme(page);
    await page.keyboard.press('s');
    await dragOnCanvas(page, [200, 200], [400, 400]);
    await dragOnCanvas(page, [300, 300], [500, 500]);
    await page.keyboard.press('Escape');
    let zones = (await firstScheme(page)).frames[0].zones;
    expect(zones).toHaveLength(2);
    // druga narysowana strefa leży pod pierwszą
    expect(zones[0].x).toBeGreaterThan(zones[1].x);

    // strefa pod napastnikiem (nr 9 w punkcie 350, 570): kliknięcie i przeciągnięcie rusza zawodnika, nie strefę
    await page.keyboard.press('s');
    await dragOnCanvas(page, [280, 500], [420, 640]);
    await page.keyboard.press('Escape');
    await dragOnCanvas(page, [350, 570], [380, 520]);
    const scheme = await firstScheme(page);
    zones = scheme.frames[0].zones;
    expect(scheme.frames[0].team.find(p => p.id === 'st').y).toBeLessThan(550);
    expect(zones[0]).toMatchObject({ x: expect.any(Number) });
    expect(Math.round(zones[0].x)).toBeLessThanOrEqual(281);
  });

  test('zaznaczona strefa: zmiana koloru i krycia, przeniesienie na wierzch i na spód', async ({ page }) => {
    await newScheme(page);
    await page.keyboard.press('s');
    await dragOnCanvas(page, [200, 200], [400, 400]);
    await dragOnCanvas(page, [300, 300], [500, 500]);
    await page.keyboard.press('Escape');

    // w części wspólnej na wierzchu jest pierwsza strefa (indeks 1)
    await clickOnCanvas(page, 380, 330);
    await page.getByRole('button', { name: 'Kolor zaznaczonej strefy' }).click();
    await page.getByTitle('Niebieski', { exact: true }).first().click();
    let zones = (await firstScheme(page)).frames[0].zones;
    const recolored = zones[1].color;
    expect(recolored).not.toBe(zones[0].color);
    await expect(page.getByRole('button', { name: 'Na wierzch' })).toBeDisabled();

    await page.getByRole('button', { name: 'Na spód' }).click();
    zones = (await firstScheme(page)).frames[0].zones;
    expect(zones[0].color).toBe(recolored);
    await expect(page.getByRole('button', { name: 'Na spód' })).toBeDisabled();

    await page.getByRole('button', { name: 'Na wierzch' }).click();
    zones = (await firstScheme(page)).frames[0].zones;
    expect(zones[1].color).toBe(recolored);

    await page.getByLabel('Krycie zaznaczonej strefy').fill('0.8');
    zones = (await firstScheme(page)).frames[0].zones;
    expect(zones[1].opacity).toBe(0.8);
  });

  test('zapisane schematy nie są nadpisywane podczas uruchamiania aplikacji', async ({ page }) => {
    await newScheme(page);
    // otwiera aplikację od nowa i sprawdza magazyn od razu, zanim interfejs zdąży się zaktualizować
    await page.goto('about:blank');
    await page.goto('./');
    const schemes = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('footballTacticsData')).schemes['11v11']).flat().length);
    expect(schemes).toBe(1);
  });

  test('format 5v5 ma po 5 zawodników na drużynę', async ({ page }) => {
    await page.getByRole('button', { name: /^Format gry:/ }).click();
    await page.getByRole('menuitemradio', { name: '5v5' }).click();
    await newScheme(page);
    const scheme = await firstScheme(page, '5v5');
    expect(scheme.frames[0].team).toHaveLength(5);
    expect(scheme.frames[0].opponent).toHaveLength(5);
  });

  test('pasek narzędzi mieści się w jednym wierszu i boisko jest widoczne w całości', async ({ page }) => {
    const toolbar = page.getByRole('button', { name: 'Przesuwanie' }).locator('xpath=../..');
    const { height } = await toolbar.boundingBox();
    expect(height).toBeLessThan(60);
    const [x, y] = await canvasPoint(page, 700, 1080);
    const viewport = page.viewportSize();
    expect(x).toBeLessThanOrEqual(viewport.width);
    expect(y).toBeLessThanOrEqual(viewport.height);
  });

  test('eksport PowerPoint pokazuje postęp i kończy się komunikatem (bez kodera wideo: 1. klatka jako obraz)', async ({ page }) => {
    await page.route('https://unpkg.com/**', route => route.abort());
    await newScheme(page);
    await page.getByLabel('Dodaj klatkę').first().click();
    await page.getByTitle('Wybierz schematy do eksportu PowerPoint').click();
    await page.locator('input[type=checkbox]').first().check();
    const download = page.waitForEvent('download');
    await page.getByTitle('Pobierz zaznaczone schematy jako PPT').click();
    await expect(page.getByRole('dialog', { name: /PowerPoint|Prezentacja/ })).toBeVisible();
    expect((await download).suggestedFilename()).toMatch(/^PlanGry-Taktyka-11v11-.*\.pptx$/);
    const done = page.getByRole('dialog', { name: 'Prezentacja gotowa' });
    await expect(done).toContainText('1 slajd');
    await done.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
