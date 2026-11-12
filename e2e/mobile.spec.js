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

// Layout guards from the interface review: they fail when a change makes the phone layout regress.
test.describe('Telefon – układ', () => {
  const measure = (page) => page.evaluate(() => {
    // drawers parked wholly beside the screen are not on it; a control cut by the edge is the fault to catch
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0; };
    const controls = [...document.querySelectorAll('button, select, [role="tab"]')].filter(visible);
    return {
      small: controls.filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(el => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30)),
      offScreen: controls.filter(el => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).map(el => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30)),
    };
  });

  for (const tab of ['Taktyka', 'Trening', 'Konspekt']) {
    test(`${tab}: przyciski mają co najmniej 44 px i żaden nie wystaje poza ekran`, async ({ page }) => {
      await openTab(page, tab);
      const { small, offScreen } = await measure(page);
      expect(small, 'za małe na palec').toEqual([]);
      expect(offScreen, 'poza ekranem').toEqual([]);
    });
  }

  test('Gotowe treningi, Dane, Kadra, Szkółka i Instrukcja są w menu „Więcej”', async ({ page }) => {
    await page.getByRole('button', { name: 'Więcej' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([/Gotowe treningi/, /Dane/, /Kadra/, /Szkółka/, /Instrukcja/]);
    await page.getByRole('menuitem', { name: /Kadra/ }).click();
    await expect(page.getByRole('dialog', { name: 'Kadra zespołu' })).toBeVisible();
  });

  test('strona pozwala na powiększanie palcami', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable=no|maximum-scale/);
  });

});

// iOS cannot print a web app opened from the home screen: the plan becomes a PDF for the share sheet.
test.describe('iPhone – PDF zamiast druku', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });

  for (const layout of ['Szczegółowy', 'Cały trening na 1 stronie']) {
    test(`Konspekt („${layout}”): PDF trafia do menu „Udostępnij”`, async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('trainingSessions', JSON.stringify([{ id: 's1', title: 'Trening', date: '2026-11-10', group: 'U14', goal: 'Otwarcie gry', notes: '', phases: [],
        blocks: [1, 2, 3, 4, 5, 6].map(i => ({ id: `b${i}`, drillId: null, title: `Blok ${i}`, minutes: '10', note: 'Opis bloku '.repeat(40) })) }])));
      await page.reload();
      await openTab(page, 'Konspekt');
      await page.evaluate(() => {
        window.__shared = null; window.__prints = 0;
        window.print = () => { window.__prints++; };
        navigator.canShare = () => true;
        navigator.share = async ({ files }) => {
          const bytes = new Uint8Array(await files[0].arrayBuffer());
          const text = new TextDecoder('latin1').decode(bytes);
          window.__shared = { name: files[0].name, type: files[0].type, head: text.slice(0, 5), pages: (text.match(/\/Type \/Page\b/g) || []).length };
        };
      });
      await page.getByRole('button', { name: 'Drukuj / PDF' }).tap();
      await page.getByRole('menuitem', { name: layout }).tap();
      const dialog = page.getByRole('dialog', { name: 'PDF konspektu' });
      await expect(dialog.getByText('PDF gotowy')).toBeVisible({ timeout: 15000 });
      await dialog.getByRole('button', { name: 'Udostępnij' }).tap();
      await expect.poll(() => page.evaluate(() => window.__shared)).not.toBeNull();
      const shared = await page.evaluate(() => window.__shared);
      expect(shared).toMatchObject({ name: 'konspekt_Trening_2026-11-10.pdf', type: 'application/pdf', head: '%PDF-' });
      expect(shared.pages).toBeGreaterThanOrEqual(1);
      if (layout === 'Cały trening na 1 stronie') expect(shared.pages).toBe(1);
      expect(await page.evaluate(() => window.__prints)).toBe(0);
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => document.body.classList.contains('printing-session'))).toBe(false);
    });
  }
});

// Android (and other touch screens that can print): one more tap on "Drukuj" opens printing.
// iPhone / iPad get a PDF instead, covered below.
test.describe('Telefon z Androidem – druk', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });

  test('Konspekt: wybór układu wydruku kończy się drukiem po jednym dotknięciu', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('trainingSessions', JSON.stringify([{ id: 's1', title: 'Trening', date: '2026-11-10', group: '', goal: '', notes: '', phases: [],
      blocks: [{ id: 'b1', drillId: null, title: 'Rozgrzewka', minutes: '10', note: '' }] }])));
    await page.reload();
    await openTab(page, 'Konspekt');
    await page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
    await page.getByRole('button', { name: 'Drukuj / PDF' }).tap();
    await page.getByRole('menuitem', { name: 'Cały trening na 1 stronie' }).tap();
    const ready = page.getByRole('dialog', { name: 'Wydruk gotowy' });
    await expect(ready).toBeVisible();
    await ready.getByRole('button', { name: 'Drukuj' }).tap();
    expect(await page.evaluate(() => window.__prints)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(ready).toHaveCount(0);
    expect(await page.evaluate(() => document.body.classList.contains('printing-session'))).toBe(false);
  });
});

test.describe('Instrukcja', () => {
  test('pierwsza wizyta pokazuje instrukcję, spis treści przenosi do rozdziału, po odświeżeniu już się nie otwiera', async ({ page }) => {
    // clear storage at the start of the next load (the open page may still save while unloading)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('guide-test')) { localStorage.clear(); sessionStorage.setItem('guide-test', '1'); }
    });
    await page.reload();
    const guide = page.getByRole('dialog', { name: 'Instrukcja' });
    await expect(guide).toBeVisible();
    await guide.getByRole('navigation', { name: 'Spis treści' }).filter({ visible: true }).getByRole('button', { name: 'Linie wyrównania' }).click();
    await expect(guide.getByRole('heading', { name: 'Linie wyrównania' })).toBeInViewport();
    await guide.getByRole('button', { name: 'Zamknij instrukcję' }).click();
    await expect(guide).toBeHidden();

    // po odświeżeniu już się sama nie otwiera
    await page.reload();
    await expect(page.getByRole('tab', { name: /Taktyka/ })).toBeVisible();
    await expect(guide).toBeHidden();
  });
});
