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

test.describe('Konspekt', () => {
  test('konspekt do certyfikacji: szkółka, pola formularza i wydruk', async ({ page }) => {
    await page.getByRole('button', { name: 'Szkółka' }).click();
    const club = page.getByRole('dialog', { name: 'Szkółka i trener' });
    await club.getByLabel('Nazwa szkółki / klubu').fill('AP BKS Naprzód Brwinów');
    await club.getByLabel('Drużyna / rocznik').fill('2013');
    await club.getByLabel('Trener').fill('Olejniczak Paweł');
    await club.getByRole('button', { name: 'Gotowe' }).click();

    await openTab(page, 'Konspekt');
    await page.getByRole('button', { name: 'Utwórz pierwszy konspekt' }).click();
    await page.getByLabel('Tytuł konspektu').fill('Trening 1');
    await page.getByPlaceholder('np. U15').fill('U13');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Blok tekstowy' }).click();
    await page.getByRole('checkbox', { name: /Konspekt zgodny z certyfikacją PZPN/ }).check();
    await page.getByLabel('Temat zajęć').fill('Wyjście spod pressingu');
    await page.getByLabel('Miejsce').fill('Orlik');
    await page.getByLabel('Zawodnicy').fill('14');
    await expect(page.getByLabel('Część treningu')).toHaveCount(3);

    // the print dialog cannot be driven by the test: keep what would be printed instead
    await page.evaluate(() => {
      window.print = () => {
        window.__printed = document.querySelector('.print-root').textContent;
        window.dispatchEvent(new Event('afterprint'));
      };
    });
    await page.getByRole('button', { name: 'Drukuj konspekt do certyfikacji' }).click();
    await expect.poll(() => page.evaluate(() => window.__printed || '')).toContain('AP BKS Naprzód Brwinów - 2013');
    const printed = await page.evaluate(() => window.__printed);
    expect(printed).toContain('Olejniczak Paweł');
    expect(printed).toContain('Wyjście spod pressingu');
    expect(printed).toContain('14 osób');
    expect(printed).toContain('Część wstępna1. Rozgrzewka');
    expect(printed).toContain('Część główna2. Rozgrzewka');
    expect(printed).toContain('Część końcowa3. Rozgrzewka');
  });

  test('plik upuszczony na aplikację otwiera import, a „Wyczyść wszystko” usuwa dane z możliwością cofnięcia', async ({ page }) => {
    const library = { format: 'model-gry-training-library', drills: [{ id: 'd1', name: 'Rondo 4v2', frames: [{ items: [], lines: [], zones: [] }] }] };
    const dataTransfer = await page.evaluateHandle((json) => {
      const dt = new DataTransfer();
      dt.items.add(new File([json], 'cwiczenia.json', { type: 'application/json' }));
      return dt;
    }, JSON.stringify(library));
    await page.dispatchEvent('body', 'dragenter', { dataTransfer });
    await page.dispatchEvent('body', 'drop', { dataTransfer });

    const dialog = page.getByRole('dialog', { name: 'Dane i kopia zapasowa' });
    await expect(dialog.getByRole('radiogroup', { name: 'Biblioteka ćwiczeń: co zrobić' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Importuj' }).click();
    await expect(page.getByText(/Import zakończony/)).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trainingDrillLibrary')).length)).toBe(1);

    await page.getByRole('button', { name: 'Dane' }).click();
    await page.getByRole('dialog', { name: 'Dane i kopia zapasowa' }).getByRole('button', { name: 'Wyczyść wszystko' }).click();
    await expect(page.getByText(/Wyczyszczono wszystkie dane/)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('trainingDrillLibrary'))).toBeNull();

    await page.getByRole('button', { name: 'Dane' }).click();
    await page.getByRole('button', { name: 'Cofnij wyczyszczenie' }).click();
    await expect(page.getByText(/Przywrócono dane sprzed wyczyszczenia/)).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trainingDrillLibrary')).length)).toBe(1);
  });

  test('ćwiczenie z bandami drukuje się w Konspekcie z ramką band', async ({ page }) => {
    const drill = {
      id: 'd1', name: 'Gra z bandami', version: 2, createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z',
      frames: [{ items: [], lines: [], zones: [] }], pitch: { type: 'half', orientation: 'horizontal', width: 30, length: 40, boards: true }, meta: {},
    };
    await page.evaluate((d) => {
      localStorage.setItem('modelGryClub', JSON.stringify({ name: 'AP BKS', team: '', logo: '', coach: '', assistant: '' }));
      localStorage.setItem('trainingDrillLibrary', JSON.stringify([d]));
      localStorage.setItem('trainingSessions', JSON.stringify([{ id: 's1', title: 'T', date: '2026-10-20', group: 'U14', goal: '', notes: '', phases: [],
        blocks: [{ id: 'b1', drillId: d.id, minutes: '20', note: '' }] }]));
    }, drill);
    await page.reload();
    await openTab(page, 'Konspekt');
    await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
    await page.getByRole('button', { name: 'Drukuj / PDF' }).click();
    await page.waitForFunction(() => window.__printed === true);
    // half pitch lying flat: 560 × 700 plus a 34 px frame on each side
    const size = await page.evaluate(() => {
      const img = document.querySelector('.print-root .print-block img');
      return [img.naturalWidth, img.naturalHeight];
    });
    expect(size).toEqual([560 + 68, 700 + 68]);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  });
});
