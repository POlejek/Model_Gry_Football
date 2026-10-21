import { test, expect, openTab } from './fixtures.js';

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
});
